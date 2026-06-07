import { defineStore } from 'pinia';
import { DispatchStrategy, OrderStatus } from '@/models';
import type { MatchCandidate, Order } from '@/models';
import { advanceOrder, candidatesForOrder, confirmCandidate, ensureActiveOrder, finishOrder, getLatestOrder, recordClientReview, submitDemoOrder, submitOrderDraft } from '@/services/app-flow';
import { repo } from '@/utils/repo';
import { providers } from '@/api/providers';

interface OrderState {
  activeOrderId: string;
  selectedCapacityId: string;
  strategy: DispatchStrategy;
  loading: boolean;
  error: string;
}

export const useOrderStore = defineStore('order', {
  state: (): OrderState => ({
    activeOrderId: getLatestOrder()?.id ?? '',
    selectedCapacityId: '',
    strategy: DispatchStrategy.Nearest,
    loading: false,
    error: '',
  }),
  getters: {
    activeOrder(state): Order | undefined {
      return state.activeOrderId ? repo.orders.find(state.activeOrderId) : getLatestOrder();
    },
    candidates(state): MatchCandidate[] {
      const order = state.activeOrderId ? repo.orders.find(state.activeOrderId) : undefined;
      return order ? candidatesForOrder(order.id, state.strategy) : [];
    },
    selectedCandidate(): MatchCandidate | undefined {
      return this.candidates.find((c) => c.capacityId === this.selectedCapacityId);
    },
    statusLabel(): string {
      return this.activeOrder?.status ?? OrderStatus.Created;
    },
  },
  actions: {
    createDemoOrder() {
      this.error = '';
      const order = submitDemoOrder();
      this.activeOrderId = order.id;
      this.selectedCapacityId = '';
      return order;
    },
    createOrderDraft(input: Parameters<typeof submitOrderDraft>[0]) {
      this.error = '';
      const order = submitOrderDraft(input);
      this.activeOrderId = order.id;
      this.selectedCapacityId = '';
      return order;
    },
    ensureOrder() {
      const order = ensureActiveOrder();
      this.activeOrderId = order.id;
      return order;
    },
    chooseCandidate(candidate: MatchCandidate) {
      this.selectedCapacityId = candidate.capacityId;
    },
    async confirmSelected() {
      const order = this.activeOrder ?? this.ensureOrder();
      const candidate = this.selectedCandidate ?? this.candidates[0];
      if (!candidate) throw new Error('没有可用运力');
      this.loading = true;
      try {
        await providers.insurance.quote(order.id, order.cargo.valueCent);
        await providers.payment.prepay(order.id, candidate.quoteCent, 'escrow');
        const confirmed = confirmCandidate(order.id, candidate);
        this.activeOrderId = confirmed.id;
        return confirmed;
      } finally {
        this.loading = false;
      }
    },
    async applyAirspace() {
      const order = this.activeOrder ?? this.ensureOrder();
      await providers.airspace.apply(order.id);
      return order;
    },
    advance() {
      const order = this.activeOrder ?? this.ensureOrder();
      const next = advanceOrder(order.id);
      this.activeOrderId = next.id;
      return next;
    },
    finish() {
      const order = this.activeOrder ?? this.ensureOrder();
      const done = finishOrder(order.id);
      this.activeOrderId = done.id;
      return done;
    },
    review(star: 1 | 2 | 3 | 4 | 5, text: string) {
      const order = this.activeOrder ?? this.ensureOrder();
      return recordClientReview(order.id, star, text);
    },
  },
});
