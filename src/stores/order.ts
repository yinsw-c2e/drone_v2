import { defineStore } from 'pinia';
import { DispatchStrategy, OrderStatus, PaymentMode } from '@/models';
import type { MatchCandidate, Order } from '@/models';
import { advanceOrderRemote, confirmOrderRemote, fetchCandidatesRemote, finishOrderRemote, isProductionBackendRequired, reviewOrderRemote, submitOrderRemote, syncPaymentRemote } from '@/api/backend';
import { advanceOrder, assertOrderPilotOperational, candidatesForOrder, confirmCandidate, createAirspaceRequest, ensureActiveOrder, getLatestOrder, pilotAcceptOrder, recordClientReview, submitDemoOrder, submitOrderDraft } from '@/services/app-flow';
import { repo } from '@/utils/repo';
import { providers } from '@/api/providers';
import { matchConfirmAction } from '@/services/action-plans';
import { requestPlatformPayment, waitForPaymentPaid } from '@/services/payment';

interface OrderState {
  activeOrderId: string;
  selectedCapacityId: string;
  strategy: DispatchStrategy;
  loading: boolean;
  error: string;
  remoteCandidates: MatchCandidate[];
  remoteCandidateOrderId: string;
  remoteCandidateStrategy: DispatchStrategy | '';
}

export const useOrderStore = defineStore('order', {
  state: (): OrderState => ({
    activeOrderId: getLatestOrder()?.id ?? '',
    selectedCapacityId: '',
    strategy: DispatchStrategy.Nearest,
    loading: false,
    error: '',
    remoteCandidates: [],
    remoteCandidateOrderId: '',
    remoteCandidateStrategy: '',
  }),
  getters: {
    activeOrder(state): Order | undefined {
      return state.activeOrderId ? repo.orders.find(state.activeOrderId) : getLatestOrder();
    },
    candidates(state): MatchCandidate[] {
      const order = state.activeOrderId ? repo.orders.find(state.activeOrderId) : undefined;
      if (order && state.remoteCandidateOrderId === order.id && state.remoteCandidateStrategy === state.strategy) {
        return state.remoteCandidates;
      }
      if (isProductionBackendRequired()) return [];
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
      this.clearRemoteCandidates();
      return order;
    },
    createOrderDraft(input: Parameters<typeof submitOrderDraft>[0]) {
      this.error = '';
      const order = submitOrderDraft(input);
      this.activeOrderId = order.id;
      this.selectedCapacityId = '';
      this.clearRemoteCandidates();
      return order;
    },
    async createOrderDraftWithBackend(input: Parameters<typeof submitOrderDraft>[0]) {
      this.error = '';
      const remote = await submitOrderRemote(input);
      if (remote) {
        this.activeOrderId = remote.id;
        this.selectedCapacityId = '';
        this.clearRemoteCandidates();
        await this.refreshRemoteCandidates();
        return remote;
      }
      return this.createOrderDraft(input);
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
      if (order.status !== OrderStatus.Matching) {
        this.error = matchConfirmAction(order.status, 0, false).description;
        throw new Error(this.error);
      }
      const candidate = this.selectedCandidate ?? this.candidates[0];
      if (!candidate) {
        this.error = '当前没有在线合规运力，请等待机主投放或返回调整预算/时间';
        throw new Error(this.error);
      }
      this.loading = true;
      try {
        this.error = '';
        await providers.insurance.quote(order.id, order.cargo.valueCent);
        const prepay = await providers.payment.prepay(order.id, candidate.quoteCent, order.paymentMode ?? PaymentMode.Escrow, candidate.capacityId);
        await requestPlatformPayment(prepay);
        await waitForPaymentPaid(prepay, syncPaymentRemote);
        const paymentId = prepay.provider === 'local-mock' ? undefined : prepay.paymentId;
        const remote = await confirmOrderRemote(order.id, candidate.capacityId, paymentId);
        if (remote) {
          this.activeOrderId = remote.id;
          this.selectedCapacityId = remote.capacityId ?? candidate.capacityId;
          this.clearRemoteCandidates();
          return remote;
        }
        const confirmed = confirmCandidate(order.id, candidate);
        this.activeOrderId = confirmed.id;
        return confirmed;
      } finally {
        this.loading = false;
      }
    },
    async applyAirspace() {
      const order = this.activeOrder ?? this.ensureOrder();
      createAirspaceRequest(order.id);
      return order;
    },
    acceptForPilot(orderId: string, pilotId: string) {
      const accepted = pilotAcceptOrder(orderId, pilotId);
      this.activeOrderId = accepted.id;
      this.selectedCapacityId = accepted.capacityId ?? '';
      return accepted;
    },
    async advance() {
      const order = this.activeOrder ?? this.ensureOrder();
      assertOrderPilotOperational(order);
      const remote = await advanceOrderRemote(order.id);
      if (remote) {
        this.activeOrderId = remote.id;
        this.selectedCapacityId = remote.capacityId ?? this.selectedCapacityId;
        return remote;
      }
      const next = advanceOrder(order.id);
      this.activeOrderId = next.id;
      return next;
    },
    async finish() {
      let order = this.activeOrder ?? this.ensureOrder();
      const remote = await finishOrderRemote(order.id);
      if (remote) {
        this.activeOrderId = remote.id;
        this.selectedCapacityId = remote.capacityId ?? this.selectedCapacityId;
        return remote;
      }
      let guard = 0;
      while (order.status !== OrderStatus.Settled && order.status !== OrderStatus.Exception && guard < 20) {
        guard += 1;
        // advanceOrder 返回的是 repo 中同一个响应式对象，必须先快照旧状态再比较，否则恒等导致提前 break
        const before = order.status;
        const next = advanceOrder(order.id);
        if (next.status === before) break;
        this.activeOrderId = next.id;
        order = next;
      }
      return order;
    },
    review(star: 1 | 2 | 3 | 4 | 5, text: string) {
      const order = this.activeOrder ?? this.ensureOrder();
      return recordClientReview(order.id, star, text);
    },
    async reviewWithBackend(star: 1 | 2 | 3 | 4 | 5, text: string) {
      const order = this.activeOrder ?? this.ensureOrder();
      const remote = await reviewOrderRemote(order.id, star, text);
      if (remote) return remote;
      return recordClientReview(order.id, star, text);
    },
    async refreshRemoteCandidates() {
      const order = this.activeOrder;
      if (!order) return this.candidates;
      const remote = await fetchCandidatesRemote(order.id, this.strategy);
      if (remote) {
        this.remoteCandidates = remote;
        this.remoteCandidateOrderId = order.id;
        this.remoteCandidateStrategy = this.strategy;
        if (!remote.some((item) => item.capacityId === this.selectedCapacityId)) {
          this.selectedCapacityId = remote[0]?.capacityId ?? '';
        }
        return remote;
      }
      return this.candidates;
    },
    clearRemoteCandidates() {
      this.remoteCandidates = [];
      this.remoteCandidateOrderId = '';
      this.remoteCandidateStrategy = '';
    },
  },
});
