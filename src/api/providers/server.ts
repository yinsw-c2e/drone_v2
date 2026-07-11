import {
  providerAirspaceApplyRemote,
  providerCreditScoreRemote,
  providerDroneArmRemote,
  providerInsuranceQuoteRemote,
  providerPaymentPrepayRemote,
} from '@/api/backend';
import type { PaymentMode } from '@/models';
import type { Providers } from './index';

async function requireRemote<T>(operation: string, request: Promise<T | undefined>): Promise<T> {
  const result = await request;
  if (result === undefined) throw new Error(`${operation}服务暂不可用，请稍后重试`);
  return result;
}

export function createBackendProviders(): Providers {
  return {
    payment: {
      prepay(orderId: string, amountCent: number, mode: PaymentMode) {
        return requireRemote('支付', providerPaymentPrepayRemote(orderId, amountCent, mode));
      },
    },
    airspace: {
      apply(orderId: string) {
        return requireRemote('空域', providerAirspaceApplyRemote(orderId));
      },
    },
    insurance: {
      quote(orderId: string, valueCent: number) {
        return requireRemote('保险', providerInsuranceQuoteRemote(orderId, valueCent));
      },
    },
    credit: {
      bureauScore(userId: string) {
        return requireRemote('信用', providerCreditScoreRemote(userId));
      },
    },
    drone: {
      arm(droneId: string) {
        return requireRemote('飞控', providerDroneArmRemote(droneId));
      },
    },
  };
}
