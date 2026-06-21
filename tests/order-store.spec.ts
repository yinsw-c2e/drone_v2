import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { OrderStatus } from '@/models';
import { decideMockAirspace } from '@/services/app-flow';
import { useOrderStore } from '@/stores/order';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';

beforeEach(() => {
  resetDB();
  setActivePinia(createPinia());
  delete (globalThis as typeof globalThis & { uni: { request?: unknown } }).uni.request;
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
