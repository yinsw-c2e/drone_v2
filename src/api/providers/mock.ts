import { decideMockAirspace } from '@/services/app-flow';
import { genId } from '@/utils/id';
import type { Providers } from './index';

const wait = async <T>(value: T, ms = 120): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const mockProviders: Providers = {
  payment: {
    prepay(orderId, amountCent, mode) {
      return wait({ paymentId: genId('pay'), tradeNo: genId('pay'), paidCent: amountCent, mode, status: 'paid', provider: 'local-mock' });
    },
  },
  airspace: {
    async apply(orderId) {
      const request = decideMockAirspace(orderId);
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

export const providers = mockProviders;
