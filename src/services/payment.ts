import type { PaymentOrder, PaymentPrepayResult, PaymentSDKParams } from '@/models';

const env = ((import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env ?? {});

function isProductionRuntime() {
  return env.PROD === true || env.MODE === 'production' || env.VITE_APP_ENV === 'production';
}

function numericEnv(name: string, fallback: number) {
  const value = Number(env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sdkParamsReady(params: PaymentSDKParams | undefined): params is PaymentSDKParams {
  return Boolean(params?.timeStamp && params.nonceStr && params.package && params.signType && params.paySign);
}

export function paymentSDKRequired(prepay: PaymentPrepayResult) {
  return prepay.status !== 'paid';
}

export function assertPaymentSDKReady(prepay: PaymentPrepayResult) {
  if (!paymentSDKRequired(prepay)) return;
  if (!sdkParamsReady(prepay.sdkParams)) {
    throw new Error('支付信息获取失败，请重新发起支付');
  }
  if (typeof uni === 'undefined' || typeof uni.requestPayment !== 'function') {
    throw new Error('当前设备暂不支持在线支付，请更换设备后重试');
  }
}

export async function requestPlatformPayment(prepay: PaymentPrepayResult) {
  if (!paymentSDKRequired(prepay)) return;
  assertPaymentSDKReady(prepay);
  const params = prepay.sdkParams as PaymentSDKParams;
  const provider = paymentProvider(params.provider || prepay.provider);
  await new Promise<void>((resolve, reject) => {
    uni.requestPayment({
      provider,
      timeStamp: params.timeStamp,
      nonceStr: params.nonceStr,
      package: params.package,
      signType: params.signType,
      paySign: params.paySign,
      success: () => resolve(),
      fail: (error) => {
        const message = error?.errMsg || '';
        if (/cancel/i.test(message) || /取消/.test(message)) {
          reject(new Error('支付已取消，订单未确认'));
          return;
        }
        reject(new Error('支付未完成，请稍后重试'));
      },
    });
  });
}

export async function waitForPaymentPaid(
  prepay: PaymentPrepayResult,
  syncPayment: (paymentId: string) => Promise<PaymentOrder | undefined>,
) {
  if (prepay.status === 'paid') return;
  if (!prepay.paymentId) {
    throw new Error('支付单缺失，订单未确认');
  }
  const attempts = Math.max(1, numericEnv('VITE_PAYMENT_STATUS_POLL_ATTEMPTS', isProductionRuntime() ? 30 : 1));
  const intervalMs = Math.max(0, numericEnv('VITE_PAYMENT_STATUS_POLL_INTERVAL_MS', isProductionRuntime() ? 1000 : 0));
  let lastStatus = prepay.status;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const payment = await syncPayment(prepay.paymentId);
    if (payment?.status === 'paid') return;
    if (payment?.status === 'failed') {
      throw new Error(payment.failedReason ? `支付失败，订单未确认：${payment.failedReason}` : '支付失败，订单未确认');
    }
    if (payment?.status === 'cancelled') {
      throw new Error('支付已取消，订单未确认');
    }
    lastStatus = payment?.status ?? lastStatus;
    if (attempt < attempts - 1 && intervalMs > 0) {
      await delay(intervalMs);
    }
  }
  throw new Error(lastStatus === 'pending' ? '支付结果确认中，请稍后查看订单状态' : '暂未确认支付结果，请稍后重试');
}

function paymentProvider(value: string | undefined): 'wxpay' | 'alipay' | 'baidu' | 'appleiap' {
  if (value === 'alipay' || value === 'baidu' || value === 'appleiap') return value;
  return 'wxpay';
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
