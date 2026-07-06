import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { OrderStatus, PaymentMode } from '@/models';
import { decideMockAirspace } from '@/services/app-flow';
import { useOrderStore } from '@/stores/order';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';
import { providers } from '@/api/providers';

type RequestPaymentOptions = {
  success?: () => void;
  fail?: (error: { errMsg?: string }) => void;
};
type RequestOptions = {
  url: string;
  success: (response: { statusCode: number; data: unknown }) => void;
};

beforeEach(() => {
  resetDB();
  setActivePinia(createPinia());
  delete (globalThis as typeof globalThis & { uni: { request?: unknown } }).uni.request;
  delete (globalThis as typeof globalThis & { uni: { requestPayment?: unknown } }).uni.requestPayment;
});

it('finish 不会绕过空域审批', async () => {
  const store = useOrderStore();
  store.createDemoOrder();
  await store.confirmSelected();
  await expect(store.finish()).rejects.toThrow('空域尚未批准');
  expect(store.activeOrder?.status).toBe(OrderStatus.AirspaceApplying);
});

it('空域审批后 finish 会把订单一路推进到已结算（回归：响应式对象恒等导致提前 break）', async () => {
  const store = useOrderStore();
  store.createDemoOrder();
  await store.confirmSelected();
  await store.advance();
  decideMockAirspace(store.activeOrderId);
  await expect(store.finish()).rejects.toThrow('尚未收到飞行遥测');
  seedArrivalTelemetry(store.activeOrderId);
  const done = await store.finish();
  expect(done.status).toBe(OrderStatus.Settled);
  expect(done.settlement?.items.length).toBeGreaterThan(0);
});

it('finish 对已结算订单幂等', async () => {
  const store = useOrderStore();
  store.createDemoOrder();
  await store.confirmSelected();
  await store.advance();
  decideMockAirspace(store.activeOrderId);
  await expect(store.finish()).rejects.toThrow('尚未收到飞行遥测');
  seedArrivalTelemetry(store.activeOrderId);
  await store.finish();
  const again = await store.finish();
  expect(again.status).toBe(OrderStatus.Settled);
});

it('后端快照缺少前端演示订单时，确认方案回退到本地流程', async () => {
  const request = vi.fn((options: { success: (response: { statusCode: number; data: { ok: boolean; error: string } }) => void }) => {
    options.success({ statusCode: 400, data: { ok: false, error: '订单不存在' } });
  });
  (globalThis as typeof globalThis & { uni: { request?: typeof request } }).uni.request = request;

  const store = useOrderStore();
  store.createDemoOrder();
  const confirmed = await store.confirmSelected();

  expect(request).toHaveBeenCalled();
  expect(confirmed.status).toBe(OrderStatus.Confirmed);
});

it('平台支付取消时不确认运力', async () => {
  const store = useOrderStore();
  const order = store.createDemoOrder();
  const candidate = store.candidates[0];
  vi.spyOn(providers.payment, 'prepay').mockResolvedValue({
    paymentId: 'pay_pending',
    tradeNo: 'wx_trade_1',
    paidCent: candidate.quoteCent,
    mode: PaymentMode.Escrow,
    status: 'pending',
    provider: 'wxpay',
    sdkParams: {
      provider: 'wxpay',
      timeStamp: '1710000000',
      nonceStr: 'nonce',
      package: 'prepay_id=wx_prepay_1',
      signType: 'RSA',
      paySign: 'signature',
      prepayId: 'wx_prepay_1',
    },
  });
  const requestPayment = vi.fn((options: RequestPaymentOptions) => options.fail?.({ errMsg: 'requestPayment:fail cancel' }));
  (globalThis as typeof globalThis & { uni: { requestPayment?: typeof requestPayment } }).uni.requestPayment = requestPayment;

  await expect(store.confirmSelected()).rejects.toThrow('支付已取消');
  expect(requestPayment).toHaveBeenCalled();
  expect(repo.orders.find(order.id)?.status).toBe(OrderStatus.Matching);
});

it('预支付缺少平台 SDK 参数时不确认运力', async () => {
  const store = useOrderStore();
  const order = store.createDemoOrder();
  const candidate = store.candidates[0];
  vi.spyOn(providers.payment, 'prepay').mockResolvedValue({
    paymentId: 'pay_pending',
    tradeNo: 'wx_trade_2',
    paidCent: candidate.quoteCent,
    mode: PaymentMode.Escrow,
    status: 'pending',
    provider: 'wxpay',
  });

  await expect(store.confirmSelected()).rejects.toThrow('支付SDK参数缺失');
  expect(repo.orders.find(order.id)?.status).toBe(OrderStatus.Matching);
});

it('平台支付 SDK 成功但回调未落库时不确认运力', async () => {
  const store = useOrderStore();
  const order = store.createDemoOrder();
  const candidate = store.candidates[0];
  vi.spyOn(providers.payment, 'prepay').mockResolvedValue({
    paymentId: 'pay_pending',
    tradeNo: 'wx_trade_3',
    paidCent: candidate.quoteCent,
    mode: PaymentMode.Escrow,
    status: 'pending',
    provider: 'wxpay',
    sdkParams: {
      provider: 'wxpay',
      timeStamp: '1710000000',
      nonceStr: 'nonce',
      package: 'prepay_id=wx_prepay_3',
      signType: 'RSA',
      paySign: 'signature',
      prepayId: 'wx_prepay_3',
    },
  });
  const requestPayment = vi.fn((options: RequestPaymentOptions) => options.success?.());
  const request = vi.fn((options: RequestOptions) => {
    if (options.url.includes('/api/v1/payments/pay_pending/sync')) {
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          data: {
            payment: {
              id: 'pay_pending',
              orderId: order.id,
              amountCent: candidate.quoteCent,
              mode: PaymentMode.Escrow,
              status: 'pending',
              provider: 'wxpay',
              providerTradeNo: 'wx_trade_3',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        },
      });
      return;
    }
    options.success({ statusCode: 500, data: { ok: false, error: 'unexpected request' } });
  });
  (globalThis as typeof globalThis & { uni: { requestPayment?: typeof requestPayment; request?: typeof request } }).uni.requestPayment = requestPayment;
  (globalThis as typeof globalThis & { uni: { requestPayment?: typeof requestPayment; request?: typeof request } }).uni.request = request;

  const futureNow = Date.now() + 2_000;
  const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(futureNow);
  try {
    await expect(store.confirmSelected()).rejects.toThrow('支付回调尚未确认');
  } finally {
    nowSpy.mockRestore();
  }
  expect(requestPayment).toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0].url).toContain('/api/v1/payments/pay_pending/sync');
  expect(repo.orders.find(order.id)?.status).toBe(OrderStatus.Matching);
});

function seedArrivalTelemetry(orderId: string) {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('order missing');
  const frame = {
    ts: new Date().toISOString(),
    pos: order.to,
    altM: 5,
    speedMs: 1,
    batteryPct: 48,
    heading: 0,
    swingDeg: 2,
  };
  const existing = repo.telemetry.find(`tel_${orderId}`);
  if (existing) repo.telemetry.update(existing.id, { frame, updatedAt: frame.ts });
  else repo.telemetry.insert({ id: `tel_${orderId}`, orderId, frame, source: 'pilot', updatedAt: frame.ts });
}
