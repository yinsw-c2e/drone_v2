import { AuditStatus, CargoType, DispatchStrategy, NotificationType, OrderStatus, Role } from '@/models';
import type { AirspaceRequest, GeoPoint, InsurancePolicy, MatchCandidate, Order, Review } from '@/models';
import { createOrder } from '@/models/factory';
import { validateOrder } from '@/models/validate';
import { INSURANCE_PLANS } from '@/stores/config-data';
import { match } from '@/utils/match';
import { notify } from '@/utils/notify';
import { transition } from '@/utils/order-machine';
import { repo } from '@/utils/repo';
import { computeCredit, bumpStatsOnReview } from '@/utils/credit';
import { genId } from '@/utils/id';
import { walletCredit } from '@/utils/wallet';

const routeStart: GeoPoint = { lng: 116.397, lat: 39.908, address: '北京低空货运中心' };
const routeEnd: GeoPoint = { lng: 116.45, lat: 39.95, address: '顺义临空交付点' };

export function ensureDemoCredit() {
  repo.pilots.all().forEach((p) => computeCredit(p.userId, Role.Pilot));
  repo.owners.all().forEach((o) => computeCredit(o.userId, Role.Owner));
  repo.clients.all().forEach((c) => computeCredit(c.userId, Role.Client));
  if (!repo.wallets.find('platform')) {
    repo.wallets.insert({ id: 'platform', userId: 'platform', balanceCent: 0, pendingCent: 0 });
  }
}

export function roleHome(role: Role) {
  if (role === Role.Pilot) return '/pages-pilot/home/index';
  if (role === Role.Owner) return '/pages-owner/home/index';
  if (role === Role.Admin) return '/pages-admin/dashboard/index';
  return '/pages-client/home/index';
}

export function defaultUserForRole(role: Role) {
  const user = repo.users.where((u) => u.roles.includes(role))[0];
  if (user) return user;
  return role === Role.Admin
    ? repo.users.insert({ id: 'u_admin', phone: 'admin', nickname: '运营管理员', roles: [Role.Admin], currentRole: Role.Admin, realNameVerified: true })
    : repo.users.all()[0];
}

export function getLatestOrder(): Order | undefined {
  const orders = repo.orders.all();
  return orders[orders.length - 1];
}

export function ensureActiveOrder(): Order {
  const active = repo.orders.where((o) => o.status !== OrderStatus.Settled && o.status !== OrderStatus.Cancelled)[0];
  return active ?? submitDemoOrder();
}

export function submitDemoOrder(): Order {
  ensureDemoCredit();
  const client = defaultUserForRole(Role.Client);
  return submitOrderDraft({
    clientId: client.id,
    cargoType: CargoType.Valuable,
    weightKg: 8,
    valueCent: 300000,
    budgetCent: 260000,
    insured: true,
    shockProof: true,
    remark: '精密设备吊运',
  });
}

export function submitOrderDraft(input: { clientId: string; cargoType: CargoType; weightKg: number; valueCent: number; budgetCent: number; insured: boolean; shockProof: boolean; tempControl?: boolean; remark?: string; from?: GeoPoint; to?: GeoPoint }): Order {
  const order = createOrder({
    clientId: input.clientId,
    from: input.from ?? routeStart,
    to: input.to ?? routeEnd,
    budgetCent: input.budgetCent,
    cargo: {
      type: input.cargoType,
      weightKg: input.weightKg,
      valueCent: input.valueCent,
      photos: ['cargo-demo'],
      remark: input.remark,
    },
    needs: { insurance: input.insured, shockProof: input.shockProof, tempControl: input.tempControl },
  });
  const errors = validateOrder(order);
  if (errors.length) throw new Error(errors.join('、'));
  const saved = repo.orders.insert(order);
  transition(saved.id, OrderStatus.Matching, { actor: Role.Client, note: '发单进入智能匹配' });
  repo.pilots.all().forEach((p) => notify(p.userId, NotificationType.Dispatch, '新吊运任务', '业主发布了精密设备吊运单', saved.id));
  return saved;
}

export function candidatesForOrder(orderId: string, strategy: DispatchStrategy = DispatchStrategy.Nearest): MatchCandidate[] {
  ensureDemoCredit();
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  return match(order, strategy);
}

export function matchingOrdersForPilot(pilotId: string): Array<{ order: Order; candidate: MatchCandidate }> {
  ensureDemoCredit();
  return repo.orders
    .where((o) => o.status === OrderStatus.Matching)
    .map((order) => {
      const candidate = candidatesForOrder(order.id).find((c) => c.pilotId === pilotId);
      return candidate ? { order, candidate } : null;
    })
    .filter((item): item is { order: Order; candidate: MatchCandidate } => Boolean(item));
}

export function bindInsurance(order: Order, premiumCent: number): InsurancePolicy {
  const exists = order.policyId ? repo.policies.find(order.policyId) : undefined;
  if (exists) return exists;
  const plan = INSURANCE_PLANS[order.cargo.type];
  const policy: InsurancePolicy = {
    id: genId('pol'),
    orderId: order.id,
    cargoType: order.cargo.type,
    coverages: plan.coverages,
    insuredAmountCent: Math.max(order.cargo.valueCent * 2, order.cargo.valueCent),
    premiumCent,
    status: 'active',
  };
  repo.policies.insert(policy);
  repo.orders.update(order.id, { policyId: policy.id });
  return policy;
}

export function confirmCandidate(orderId: string, candidate: MatchCandidate): Order {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  if (order.cargo.type === CargoType.Valuable || order.needs.insurance) {
    bindInsurance(order, candidate.priceBreakdown.insuranceCent);
  }
  repo.orders.update(order.id, {
    pilotId: candidate.pilotId,
    droneId: candidate.droneId,
    capacityId: candidate.capacityId,
    priceBreakdown: candidate.priceBreakdown,
  });
  const confirmed = transition(order.id, OrderStatus.Confirmed, { actor: Role.Client, note: '业主确认 Top1 方案' });
  notify(candidate.pilotId, NotificationType.Dispatch, '任务已确认', '请进入驾驶舱完成空域与安检', order.id);
  return confirmed;
}

export function pilotAcceptOrder(orderId: string, pilotId: string): Order {
  const candidate = candidatesForOrder(orderId).find((c) => c.pilotId === pilotId);
  if (!candidate) throw new Error('该飞手暂无满足条件的运力');
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  if (order.cargo.type === CargoType.Valuable || order.needs.insurance) {
    bindInsurance(order, candidate.priceBreakdown.insuranceCent);
  }
  repo.orders.update(order.id, {
    pilotId: candidate.pilotId,
    droneId: candidate.droneId,
    capacityId: candidate.capacityId,
    priceBreakdown: candidate.priceBreakdown,
  });
  const confirmed = transition(order.id, OrderStatus.Confirmed, { actor: Role.Pilot, note: '飞手响应派单并确认运力' });
  notify(order.clientId, NotificationType.Dispatch, '飞手已接单', '飞手已确认运力，订单进入空域申请', order.id);
  return confirmed;
}

export function createAirspaceRequest(orderId: string, status: AirspaceRequest['status'] = 'submitted'): AirspaceRequest {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  const existing = repo.airspace.where((a) => a.orderId === orderId)[0];
  if (existing) return existing;
  const now = new Date();
  const request: AirspaceRequest = {
    id: genId('air'),
    orderId,
    area: [order.from, { lng: order.from.lng, lat: order.to.lat }, order.to, { lng: order.to.lng, lat: order.from.lat }],
    altitudeM: 120,
    window: { start: now.toISOString(), end: new Date(now.getTime() + 90 * 60 * 1000).toISOString() },
    status,
  };
  repo.airspace.insert(request);
  return request;
}

export function decideMockAirspace(orderId: string): AirspaceRequest {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  const request = createAirspaceRequest(orderId);
  const status: AirspaceRequest['status'] = order.cargo.type === CargoType.Dangerous ? 'rejected' : 'approved';
  repo.airspace.update(request.id, { status });
  notify(order.clientId, NotificationType.Audit, status === 'approved' ? '空域已批准' : '空域被驳回', status === 'approved' ? '可进入起飞前合规检查' : '危险品航线需重新申报', order.id);
  return repo.airspace.find(request.id)!;
}

export function advanceOrder(orderId: string): Order {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  const actor = order.status === OrderStatus.Settled ? Role.Client : Role.Pilot;
  if (order.status === OrderStatus.Confirmed) {
    createAirspaceRequest(order.id);
    return transition(order.id, OrderStatus.AirspaceApplying, { actor: Role.Client, note: '提交空域申请' });
  }
  if (order.status === OrderStatus.AirspaceApplying) {
    const airspace = repo.airspace.where((a) => a.orderId === order.id)[0];
    if (airspace?.status === 'rejected') return transition(order.id, OrderStatus.Exception, { actor: Role.Admin, note: '空域审批驳回' });
    if (airspace?.status !== 'approved') throw new Error('空域尚未批准');
    return transition(order.id, OrderStatus.Preparing, { actor: Role.Pilot, note: '空域通过，合规门校验通过' });
  }
  const next: Partial<Record<OrderStatus, OrderStatus>> = {
    [OrderStatus.Preparing]: OrderStatus.Loading,
    [OrderStatus.Loading]: OrderStatus.InFlight,
    [OrderStatus.InFlight]: OrderStatus.Unloading,
    [OrderStatus.Unloading]: OrderStatus.Completed,
    [OrderStatus.Completed]: OrderStatus.Settled,
  };
  const to = next[order.status];
  if (!to) return order;
  const nextOrder = transition(order.id, to, { actor, note: '流程推进' });
  if (to === OrderStatus.Settled) {
    const platformItem = nextOrder.settlement?.items.find((i) => i.party === 'platform');
    if (platformItem) walletCredit('platform', order.id, platformItem.amountCent, 'realtime', '平台技术服务费');
    notify(order.clientId, NotificationType.Settlement, '订单已结算', '分账明细已生成，可发起评价', order.id);
  }
  return nextOrder;
}

export function recordClientReview(orderId: string, star: 1 | 2 | 3 | 4 | 5, text: string): Review {
  const order = repo.orders.find(orderId);
  if (!order?.pilotId) throw new Error('订单未指派飞手');
  const review: Review = { id: genId('rv'), orderId, byRole: Role.Client, targetUserId: order.pilotId, star, tags: ['准时', '吊运稳定'], text, };
  repo.reviews.insert(review);
  bumpStatsOnReview(review);
  computeCredit(order.pilotId, Role.Pilot);
  notify(order.pilotId, NotificationType.System, '收到业主评价', '信用分已按评价更新', order.id);
  return review;
}

export function dashboardMetrics() {
  const orders = repo.orders.all();
  const completed = orders.filter((o) => o.status === OrderStatus.Completed || o.status === OrderStatus.Settled);
  const platformIncome = orders.reduce((sum, o) => {
    const item = o.settlement?.items.find((i) => i.party === 'platform');
    return sum + (item?.amountCent ?? 0);
  }, 0);
  return {
    orderCount: orders.length,
    completedCount: completed.length,
    cancelRate: orders.length ? repo.orders.where((o) => o.status === OrderStatus.Cancelled).length / orders.length : 0,
    platformIncome,
    onlineCapacity: repo.capacity.where((c) => c.status === 'online').length,
  };
}

export function approvePilotQualification(userId: string) {
  repo.pilots.update(userId, { noCrimeProof: AuditStatus.Approved, healthProof: AuditStatus.Approved });
  notify(userId, NotificationType.Audit, '认证通过', '后台已通过飞手资质审核', userId);
}

export function rejectPilotQualification(userId: string) {
  repo.pilots.update(userId, { noCrimeProof: AuditStatus.Rejected });
  notify(userId, NotificationType.Audit, '认证驳回', '请补充飞手资质材料', userId);
}

export const demoRoute = [routeStart, routeEnd];
