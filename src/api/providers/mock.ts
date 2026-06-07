import { createAirspaceRequest } from '@/services/app-flow';
import { genId } from '@/utils/id';
import type { Providers } from './index';

const wait = async <T>(value: T, ms = 120): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const providers: Providers = {
  payment: {
    prepay(orderId, amountCent, mode) {
      return wait({ tradeNo: genId('pay'), paidCent: amountCent, mode });
    },
  },
  airspace: {
    async apply(orderId) {
      const request = createAirspaceRequest(orderId);
      return wait({ requestId: request.id, status: request.status === 'approved' ? 'approved' : 'rejected' });
    },
  },
  insurance: {
    quote(_orderId, valueCent) {
      return wait({ premiumCent: Math.round(valueCent * 0.03), insuredAmountCent: Math.max(valueCent * 2, valueCent) });
    },
  },
  credit: {
    bureauScore(userId) {
      return wait({ userId, score: 720 });
    },
  },
  drone: {
    arm(droneId) {
      return wait({ droneId, ready: true });
    },
  },
};
