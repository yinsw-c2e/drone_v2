import { AuditAction, AuditStatus, CapacityStatus, CargoType, DispatchStrategy, NotificationType, OrderStatus, PaymentMode, Role, RoleProfileStatus } from '@/models';
import type { AirspaceRequest, AuditLog, CertificationApplication, Claim, GeoPoint, InsurancePolicy, MatchCandidate, Order, Review, TelemetrySnapshot, User } from '@/models';
import { saveBackendSnapshotNow } from '@/api/backend';
import { createCapacity, createOrder } from '@/models/factory';
import { validateOrder } from '@/models/validate';
import { orderRequiresPilotQualification, ownerQualificationIssue, pilotQualificationIssue } from '@/services/compliance';
import { capacityHeatmapAreaLabel, capacityHeatmapLabel, capacityStatusLabel, cargoTypeLabel, claimStatusLabel, paymentModeLabel } from '@/services/display-labels';
import { INSURANCE_PLANS, PRICE_CONFIG } from '@/stores/config-data';
import { match } from '@/utils/match';
import { notify } from '@/utils/notify';
import { transition } from '@/utils/order-machine';
import { distanceKm } from '@/utils/geo';
import { repo } from '@/utils/repo';
import { db } from '@/utils/db';
import { computeCredit, bumpStatsOnReview } from '@/utils/credit';
import { genId } from '@/utils/id';
import { walletCredit } from '@/utils/wallet';

const destinationRadiusKm = 0.2;
const routeStart: GeoPoint = { lng: 113.125213, lat: 23.020498, address: '普君新城华府2期 · 同济东路41号' };
const routeEnd: GeoPoint = { lng: 113.13288, lat: 23.02296, address: '岭南天地东门临停点' };
const demoCapacityOffsets: Array<Pick<GeoPoint, 'lng' | 'lat'>> = [
  { lng: 0.0042, lat: 0.0021 },
  { lng: -0.0036, lat: 0.0018 },
  { lng: 0.0027, lat: -0.0024 },
  { lng: -0.0022, lat: -0.0031 },
];

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

function latestAssignedUser(role: Role) {
  const assignedOrders = ordersNewestFirst(repo.orders.all()).filter((order) => order.pilotId || order.capacityId);
  const latest = assignedOrders.find(isActiveOrder) ?? assignedOrders[0];
  if (!latest) return undefined;
  if (role === Role.Pilot && latest.pilotId) {
    const pilot = repo.users.find(latest.pilotId);
    return pilot?.roles.includes(Role.Pilot) ? pilot : undefined;
  }
  if (role === Role.Owner && latest.capacityId) {
    const ownerId = repo.capacity.find(latest.capacityId)?.ownerId;
    const owner = ownerId ? repo.users.find(ownerId) : undefined;
    return owner?.roles.includes(Role.Owner) ? owner : undefined;
  }
  return undefined;
}

export function defaultUserForRole(role: Role) {
  const assigned = latestAssignedUser(role);
  if (assigned) return assigned;
  const user = repo.users.where((u) => u.roles.includes(role))[0];
  if (user) return user;
  return role === Role.Admin
    ? repo.users.insert({ id: 'u_admin', phone: 'admin', nickname: '运营管理员', roles: [Role.Admin], currentRole: Role.Admin, realNameVerified: true })
    : repo.users.all()[0];
}

export function recordAudit(action: AuditAction, actorId: string, actorRole: Role, targetType: string, targetId: string | undefined, detail: string): AuditLog {
  return repo.auditLogs.insert({ id: genId('aud'), at: new Date().toISOString(), action, actorId, actorRole, targetType, targetId, detail });
}

export function getLatestOrder(): Order | undefined {
  return latestOrderFrom(repo.orders.all());
}

export function ordersNewestFirst(orders: Order[]): Order[] {
  return orders.slice().sort((a, b) => orderCreatedAtMs(b) - orderCreatedAtMs(a));
}

export function latestOrderFrom(orders: Order[]): Order | undefined {
  return ordersNewestFirst(orders)[0];
}

function orderCreatedAtMs(order: Order) {
  const time = Date.parse(order.createdAt);
  return Number.isFinite(time) ? time : 0;
}

export function currentPilotOrder(pilotId: string, preferred?: Order): Order | undefined {
  const assigned = ordersNewestFirst(repo.orders.where((order) => order.pilotId === pilotId));
  const latestActive = assigned.find(isActiveOrder);
  if (latestActive) return latestActive;
  if (preferred?.pilotId === pilotId) return preferred;
  return assigned[0];
}

export function activeOwnerMissionForDrone(ownerId: string, droneId: string): Order | undefined {
  return ordersNewestFirst(repo.orders.where((order) => order.droneId === droneId)).find((order) => {
    if (!isActiveOrder(order)) return false;
    const capacity = order.capacityId ? repo.capacity.find(order.capacityId) : undefined;
    return capacity?.ownerId === ownerId;
  });
}

export function ensureActiveOrder(): Order {
  const active = latestOrderFrom(repo.orders.where(isActiveOrder));
  return active ?? submitDemoOrder();
}

function isActiveOrder(order: Order) {
  return order.status !== OrderStatus.Settled
    && order.status !== OrderStatus.Cancelled
    && order.status !== OrderStatus.Exception;
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

export async function runAdminDemoFlow(strategy: DispatchStrategy = DispatchStrategy.Nearest): Promise<Order> {
  ensureDemoCredit();
  const client = ensureAdminDemoClient();
  const order = submitOrderDraft({
    clientId: client.id,
    cargoType: CargoType.Valuable,
    weightKg: 8,
    valueCent: 300000,
    budgetCent: 260000,
    insured: true,
    shockProof: true,
    remark: '精密设备吊运',
  });
  const candidate = candidatesForOrder(order.id, strategy)[0];
  if (!candidate) throw new Error('当前没有在线合规运力，请等待机主投放或返回调整预算/时间');

  confirmCandidate(order.id, candidate);
  advanceOrder(order.id);
  decideMockAirspace(order.id);
  advanceOrder(order.id);
  advanceOrder(order.id);
  advanceOrder(order.id);
  recordDestinationTelemetry(order.id);
  advanceOrder(order.id);
  advanceOrder(order.id);
  const settled = advanceOrder(order.id);
  await saveBackendSnapshotNow(db).catch(() => undefined);
  return settled;
}

function ensureAdminDemoClient(): User {
  const eligible = repo.clients
    .all()
    .map((client) => repo.users.find(client.userId))
    .find((user): user is User => Boolean(user?.realNameVerified && !user.blacklisted));
  if (eligible) return eligible;

  const existing = repo.users.find('u_demo_client');
  if (existing) {
    ensureClientProfile(existing.id);
    return repo.users.update(existing.id, { realNameVerified: true, blacklisted: false });
  }

  const user = repo.users.insert({
    id: 'u_demo_client',
    phone: 'demo-client',
    nickname: '演练业主',
    roles: [Role.Client],
    currentRole: Role.Client,
    realNameVerified: true,
  });
  ensureClientProfile(user.id);
  return user;
}

function ensureClientProfile(userId: string) {
  if (repo.clients.find(userId)) return;
  const fallback = repo.clients.all()[0];
  repo.clients.insert({
    userId,
    entityType: fallback?.entityType ?? 'company',
    creditBureauScore: fallback?.creditBureauScore ?? 760,
    stats: fallback?.stats ?? {
      payTimely: 0.96,
      defaultCount: 0,
      infoTrust: 0.95,
      complaintRate: 0.02,
      orderAccuracy: 0.94,
      cancelRate: 0.03,
    },
  });
}

function recordDestinationTelemetry(orderId: string) {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  const now = new Date().toISOString();
  const snapshot: TelemetrySnapshot = {
    id: `tel_${orderId}`,
    orderId,
    source: 'simulator',
    updatedAt: now,
    frame: {
      ts: now,
      pos: order.to,
      altM: 5,
      speedMs: 1,
      batteryPct: 72,
      heading: 0,
      swingDeg: 2,
    },
  };
  const existing = repo.telemetry.find(snapshot.id);
  if (existing) repo.telemetry.update(existing.id, snapshot);
  else repo.telemetry.insert(snapshot);
}

export function submitOrderDraft(input: { clientId: string; cargoType: CargoType; weightKg: number; valueCent: number; budgetCent: number; insured: boolean; shockProof: boolean; tempControl?: boolean; special?: string; remark?: string; volume?: string; photos?: string[]; timeMode?: Order['timeMode']; scheduledAt?: string; timeRequirement?: string; paymentMode?: PaymentMode; invoiceTitle?: string; from?: GeoPoint; to?: GeoPoint }): Order {
  const client = repo.users.find(input.clientId);
  if (client?.blacklisted) throw new Error('当前业主处于风控黑名单，暂不可发单');
  const order = createOrder({
    clientId: input.clientId,
    from: input.from ?? routeStart,
    to: input.to ?? routeEnd,
    budgetCent: input.budgetCent,
    timeMode: input.timeMode,
    scheduledAt: input.scheduledAt,
    cargo: {
      type: input.cargoType,
      weightKg: input.weightKg,
      volume: input.volume,
      valueCent: input.valueCent,
      photos: input.photos?.length ? input.photos : ['cargo-demo'],
      remark: input.remark,
    },
    needs: { insurance: input.insured, shockProof: input.shockProof, tempControl: input.tempControl, special: input.special },
  });
  order.timeRequirement = input.timeRequirement;
  order.paymentMode = input.paymentMode ?? PaymentMode.Escrow;
  order.invoiceTitle = input.invoiceTitle;
  const errors = validateOrder(order);
  if (errors.length) throw new Error(errors.join('、'));
  const saved = repo.orders.insert(order);
  transition(saved.id, OrderStatus.Matching, { actor: Role.Client, note: '发单进入智能匹配' });
  ensureDemoCapacityNearOrder(saved);
  recordAudit(AuditAction.Order, input.clientId, Role.Client, 'order', saved.id, `发布${cargoTypeLabel(input.cargoType)}吊运订单`);
  repo.pilots.all().forEach((p) => notify(p.userId, NotificationType.Dispatch, '新吊运任务', '业主发布了精密设备吊运单', saved.id));
  return saved;
}

export function candidatesForOrder(orderId: string, strategy: DispatchStrategy = DispatchStrategy.Nearest): MatchCandidate[] {
  ensureDemoCredit();
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  if (repo.users.find(order.clientId)?.blacklisted) throw new Error('当前业主处于风控黑名单，暂不可匹配');
  return match(order, strategy).filter((c) => {
    const ownerId = repo.capacity.find(c.capacityId)?.ownerId;
    return !repo.users.find(c.pilotId)?.blacklisted && !repo.users.find(ownerId ?? '')?.blacklisted;
  });
}

function ensureDemoCapacityNearOrder(order: Order) {
  const onlineCapacity = repo.capacity.where((unit) => unit.status === CapacityStatus.Online);
  if (onlineCapacity.length === 0) return;
  if (onlineCapacity.some((unit) => distanceKm(unit.location, order.from) <= PRICE_CONFIG.thresholdKm)) return;
  onlineCapacity.forEach((unit, index) => alignCapacityNearOrder(unit.id, order, index));
}

function alignCapacityNearLatestMatchingOrder(capacityId: string) {
  const latest = latestOrderFrom(repo.orders.where((order) => order.status === OrderStatus.Matching));
  if (!latest) return;
  const onlineCapacity = repo.capacity.where((unit) => unit.status === CapacityStatus.Online);
  const index = Math.max(0, onlineCapacity.findIndex((unit) => unit.id === capacityId));
  alignCapacityNearOrder(capacityId, latest, index);
}

function alignCapacityNearOrder(capacityId: string, order: Order, index: number) {
  const unit = repo.capacity.find(capacityId);
  if (!unit) return;
  const offset = demoCapacityOffsets[index % demoCapacityOffsets.length];
  const location = {
    lng: roundCoord(order.from.lng + offset.lng),
    lat: roundCoord(order.from.lat + offset.lat),
    address: `${order.from.address || '订单起点'}附近演示运力${index + 1}`,
  };
  if (!sameLocation(unit.location, location)) repo.capacity.update(unit.id, { location });
  const pilot = repo.pilots.find(unit.pilotId);
  if (pilot && !sameLocation(pilot.location, location)) repo.pilots.update(unit.pilotId, { location });
}

function sameLocation(a: GeoPoint, b: GeoPoint) {
  return a.lng === b.lng && a.lat === b.lat && a.address === b.address;
}

function roundCoord(value: number) {
  return Number(value.toFixed(6));
}

export function matchingOrdersForPilot(pilotId: string): Array<{ order: Order; candidate: MatchCandidate }> {
  ensureDemoCredit();
  if (pilotOperationalIssue(pilotId)) return [];
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
  assertPilotOperational(candidate.pilotId);
  assertCapacityOwnerOperational(candidate.capacityId);
  if (order.cargo.type === CargoType.Valuable || order.needs.insurance) {
    bindInsurance(order, candidate.priceBreakdown.insuranceCent);
  }
  repo.orders.update(order.id, {
    pilotId: candidate.pilotId,
    droneId: candidate.droneId,
    capacityId: candidate.capacityId,
    priceBreakdown: candidate.priceBreakdown,
  });
  const confirmed = transition(order.id, OrderStatus.Confirmed, { actor: Role.Client, note: '业主确认推荐方案' });
  recordAudit(AuditAction.Payment, order.clientId, Role.Client, 'order', order.id, `${paymentModeLabel(order.paymentMode ?? PaymentMode.Escrow)}预支付已由演示支付通道受理`);
  notify(candidate.pilotId, NotificationType.Dispatch, '任务已确认', '请进入驾驶舱完成空域与安检', order.id);
  return confirmed;
}

export function pilotAcceptOrder(orderId: string, pilotId: string): Order {
  assertPilotOperational(pilotId);
  const candidate = candidatesForOrder(orderId).find((c) => c.pilotId === pilotId);
  if (!candidate) throw new Error('该飞手暂无满足条件的运力');
  assertCapacityOwnerOperational(candidate.capacityId);
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
  recordAudit(AuditAction.Order, pilotId, Role.Pilot, 'order', order.id, '飞手接单并锁定运力');
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
  const status: AirspaceRequest['status'] = order.cargo.type === CargoType.Dangerous ? 'rejected' : 'approved';
  return decideAirspace(orderId, status);
}

export function decideAirspace(orderId: string, status: AirspaceRequest['status'] = 'approved'): AirspaceRequest {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  if (order.status !== OrderStatus.AirspaceApplying) throw new Error('订单尚未提交空域申请');
  const request = createAirspaceRequest(orderId);
  if (status !== 'approved' && status !== 'rejected') throw new Error('空域审批状态必须是 approved 或 rejected');
  repo.airspace.update(request.id, { status });
  const approved = status === 'approved';
  const note = approved ? '空域审批通过' : '空域审批驳回';
  repo.orders.update(order.id, {
    events: [
      ...order.events,
      { at: new Date().toISOString(), status: order.status, actor: Role.Admin, note },
    ],
  });
  recordAudit(AuditAction.Airspace, 'airspace-admin', Role.Admin, 'airspace', request.id, note);
  notify(order.clientId, NotificationType.Audit, approved ? '空域已批准' : '空域被驳回', approved ? '可进入起飞前合规检查' : '请联系后台调整航线或重新申报', order.id);
  if (order.pilotId) notify(order.pilotId, NotificationType.Audit, approved ? '空域已批准' : '空域被驳回', approved ? '可进入起飞前合规检查' : '请联系后台调整航线或重新申报', order.id);
  return repo.airspace.find(request.id)!;
}

export function advanceOrder(orderId: string): Order {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  assertOrderPilotOperational(order);
  const actor = order.status === OrderStatus.Settled ? Role.Client : Role.Pilot;
  if (order.status === OrderStatus.Confirmed) {
    createAirspaceRequest(order.id);
    return transition(order.id, OrderStatus.AirspaceApplying, { actor: Role.Pilot, note: '提交空域申请' });
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
  if (order.status === OrderStatus.InFlight) ensureDestinationReached(order);
  const nextOrder = transition(order.id, to, { actor, note: '流程推进' });
  if (to === OrderStatus.Settled) {
    const platformItem = nextOrder.settlement?.items.find((i) => i.party === 'platform');
    if (platformItem) walletCredit('platform', order.id, platformItem.amountCent, 'realtime', '平台技术服务费');
    recordAudit(AuditAction.Settlement, order.clientId, Role.Client, 'order', order.id, '订单已结算，分账明细已生成');
    notify(order.clientId, NotificationType.Settlement, '订单已结算', '分账明细已生成，可发起评价', order.id);
  }
  return nextOrder;
}

function ensureDestinationReached(order: Order) {
  const frame = repo.telemetry.where((item) => item.orderId === order.id)[0]?.frame;
  if (!frame) throw new Error('尚未收到飞行遥测，无法确认卸货');
  if (distanceKm(frame.pos, order.to) > destinationRadiusKm) {
    throw new Error('尚未到达卸货点，进入 200m 围栏后才能确认卸货');
  }
}

export function pilotOperationalIssue(pilotId: string) {
  const profile = repo.userRoleProfiles.where((item) => item.userId === pilotId && item.role === Role.Pilot)[0];
  if (profile?.status === RoleProfileStatus.Rejected) return '飞手资质审核未通过，请补充认证材料后重新提交审核';
  if (!profile || profile.status !== RoleProfileStatus.Active) return '飞手身份仍在审核中，审核通过后才能接单或起飞';
  return pilotQualificationIssue(repo.pilots.find(pilotId));
}

export function ownerOperationalIssue(ownerId: string) {
  const profile = repo.userRoleProfiles.where((item) => item.userId === ownerId && item.role === Role.Owner)[0];
  if (profile?.status === RoleProfileStatus.Rejected) return '机主资质未通过，请补充认证材料后重新提交审核';
  if (!profile || profile.status !== RoleProfileStatus.Active) return '机主身份仍在审核中，审核通过后才能投放设备或运力';
  return ownerQualificationIssue(repo.owners.find(ownerId), repo.users.find(ownerId));
}

export function assertPilotOperational(pilotId: string) {
  const issue = pilotOperationalIssue(pilotId);
  if (issue) throw new Error(issue);
}

export function assertOwnerOperational(ownerId: string) {
  const issue = ownerOperationalIssue(ownerId);
  if (issue) throw new Error(issue);
}

function assertCapacityOwnerOperational(capacityId: string) {
  const capacity = repo.capacity.find(capacityId);
  if (!capacity) throw new Error('运力不存在');
  assertOwnerOperational(capacity.ownerId);
}

export function assertOrderPilotOperational(order: Order) {
  if (!order.pilotId || !orderRequiresPilotQualification(order)) return;
  assertPilotOperational(order.pilotId);
}

export function recordClientReview(orderId: string, star: 1 | 2 | 3 | 4 | 5, text: string): Review {
  const order = repo.orders.find(orderId);
  if (!order?.pilotId) throw new Error('订单未指派飞手');
  const existing = repo.reviews.where((review) => review.orderId === orderId && review.byRole === Role.Client && review.targetUserId === order.pilotId)[0];
  if (existing) return existing;
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

export function submitCertification(role: Role, userId: string, fields: CertificationApplication['fields']): CertificationApplication {
  ensureLocalRoleData(userId, role);
  let appFields = fields;
  if (role === Role.Owner) {
    const drone = submitOwnerDeviceCertification(userId, fields);
    appFields = { ...fields, droneSn: drone.sn };
  }
  const app = repo.authApplications.insert({ id: genId('cert'), userId, role, status: AuditStatus.Pending, submittedAt: new Date().toISOString(), fields: appFields });
  if (role === Role.Pilot || role === Role.Owner) setLocalRoleProfile(userId, role, RoleProfileStatus.Pending, app.id);
  if (role === Role.Pilot) repo.pilots.update(userId, { noCrimeProof: AuditStatus.Pending, healthProof: AuditStatus.Pending, trainingCerts: Array.isArray(fields.trainingCerts) ? fields.trainingCerts as string[] : [] });
  if (role === Role.Owner) {
    repo.owners.update(userId, { uomVerified: false });
  }
  if (role === Role.Client) repo.users.update(userId, { realNameVerified: false, authStatus: AuditStatus.Pending });
  recordAudit(AuditAction.Certification, userId, role, 'certification', app.id, '提交三方认证材料');
  notify(userId, NotificationType.Audit, '认证已提交', '材料已进入审核中状态', app.id);
  persistBackendSnapshot();
  return app;
}

function ownerDeviceFields(fields: CertificationApplication['fields']) {
  return {
    model: String(fields.droneModel || '演示设备'),
    sn: String(fields.droneSn || `SN-${genId('dev')}`),
    insuranceAmount: Number(fields.insuranceAmount || 0),
    maintenance: String(fields.maintenance || '演示维护记录'),
    maxPayloadKg: Number(fields.maxPayloadKg || 30),
  };
}

export function validateOwnerDroneCompliance(droneId: string) {
  const drone = repo.drones.find(droneId);
  if (!drone) throw new Error('设备不存在');
  if (drone.airworthiness !== AuditStatus.Approved) throw new Error('设备适航未通过');
  if (drone.insured.thirdPartyAmount < PRICE_CONFIG.minThirdParty) throw new Error('三者险保额不足500万');
  if (drone.maxPayloadKg <= 0) throw new Error('设备载荷必须大于0');
  return drone;
}

export function deployOwnerDrone(ownerId: string, droneId: string) {
  assertOwnerOperational(ownerId);
  const drone = validateOwnerDroneCompliance(droneId);
  if (drone.ownerId !== ownerId) throw new Error('设备不属于当前机主');
  const existing = repo.capacity.where((c) => c.droneId === drone.id)[0];
  if (existing?.status === CapacityStatus.Busy) throw new Error('设备正在执行任务，无法重新投放');
  const pilot = operationalPilotForCapacity(existing?.pilotId);
  if (existing) {
    repo.capacity.update(existing.id, { status: CapacityStatus.Online, ownerId, pilotId: pilot.userId, location: pilot.location });
    alignCapacityNearLatestMatchingOrder(existing.id);
    recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'capacity', existing.id, '合规设备重新上线');
    return repo.capacity.find(existing.id)!;
  }
  const capacity = repo.capacity.insert(createCapacity({ pilotId: pilot.userId, droneId: drone.id, ownerId, location: pilot.location, status: CapacityStatus.Online }));
  alignCapacityNearLatestMatchingOrder(capacity.id);
  recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'capacity', capacity.id, '合规设备生成运力并上线');
  return capacity;
}

export function withdrawOwnerDrone(ownerId: string, droneId: string) {
  if (repo.capacity.where((c) => c.droneId === droneId && c.ownerId === ownerId && c.status === CapacityStatus.Busy).length) {
    throw new Error('设备正在执行任务，无法召回');
  }
  repo.capacity.where((c) => c.droneId === droneId && c.ownerId === ownerId).forEach((c) => repo.capacity.update(c.id, { status: CapacityStatus.Offline }));
  recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'drone', droneId, '机主撤回运力');
}

export function setCapacityOnline(ownerId: string, capacityId: string) {
  const capacity = repo.capacity.find(capacityId);
  if (!capacity) throw new Error('运力不存在');
  if (capacity.ownerId !== ownerId) throw new Error('运力不属于当前机主');
  assertOwnerOperational(ownerId);
  validateOwnerDroneCompliance(capacity.droneId);
  const pilot = operationalPilotForCapacity(capacity.pilotId);
  repo.capacity.update(capacity.id, { status: CapacityStatus.Online, pilotId: pilot.userId, location: pilot.location });
  alignCapacityNearLatestMatchingOrder(capacity.id);
  return repo.capacity.find(capacity.id)!;
}

export function setCapacityOffline(ownerId: string, capacityId: string) {
  const capacity = repo.capacity.find(capacityId);
  if (!capacity) throw new Error('运力不存在');
  if (capacity.ownerId !== ownerId) throw new Error('运力不属于当前机主');
  if (capacity.status === CapacityStatus.Busy) throw new Error('设备正在执行任务，无法召回');
  return repo.capacity.update(capacity.id, { status: CapacityStatus.Offline });
}

export function submitOwnerDeviceCertification(ownerId: string, fields: CertificationApplication['fields']) {
  const data = ownerDeviceFields(fields);
  if (data.insuranceAmount < PRICE_CONFIG.minThirdParty) throw new Error('三者险保额不足500万');
  if (data.maxPayloadKg <= 0) throw new Error('设备载荷必须大于0');
  const exists = repo.drones.where((d) => d.ownerId === ownerId && d.sn === data.sn)[0];
  const patch = {
    brand: 'Other' as const,
    model: data.model,
    sn: data.sn,
    maxPayloadKg: data.maxPayloadKg,
    airworthiness: AuditStatus.Pending,
    insured: { hull: true, thirdParty: true, thirdPartyAmount: data.insuranceAmount },
    maintenanceLog: [{ date: new Date().toISOString().slice(0, 10), note: data.maintenance }],
    ownerId,
    status: exists?.status === 'busy' ? 'busy' as const : 'idle' as const,
  };
  const drone = exists ? repo.drones.update(exists.id, patch) : repo.drones.insert({ id: genId('drn'), ...patch });
  const owner = repo.owners.find(ownerId);
  if (owner && !owner.drones.includes(drone.id)) repo.owners.update(ownerId, { drones: [...owner.drones, drone.id] });
  setOwnerDroneCapacityStatus(ownerId, drone.id, CapacityStatus.Offline);
  recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'drone', drone.id, '机主设备认证进入待审状态');
  return drone;
}

function submittedOwnerDrone(ownerId: string, fields: CertificationApplication['fields']) {
  const sn = String(fields.droneSn || '').trim();
  if (!sn) return undefined;
  return repo.drones.where((d) => d.ownerId === ownerId && d.sn === sn)[0];
}

function setOwnerDroneCapacityStatus(ownerId: string, droneId: string, status: CapacityStatus) {
  repo.capacity
    .where((unit) => unit.ownerId === ownerId && unit.droneId === droneId && unit.status !== CapacityStatus.Busy)
    .forEach((unit) => repo.capacity.update(unit.id, { status }));
}

function operationalPilotForCapacity(preferredPilotId?: string) {
  const preferred = preferredPilotId ? repo.pilots.find(preferredPilotId) : undefined;
  const candidates = [
    ...(preferred ? [preferred] : []),
    ...repo.pilots.all().filter((pilot) => pilot.userId !== preferredPilotId),
  ];
  const pilot = candidates.find((item) => !pilotOperationalIssue(item.userId) && !repo.users.find(item.userId)?.blacklisted);
  if (!pilot) throw new Error('暂无可用合规飞手，设备暂不能投放运力');
  return pilot;
}

function approveOwnerDeviceFromCertification(ownerId: string, fields: CertificationApplication['fields']) {
  const drone = submittedOwnerDrone(ownerId, fields);
  if (!drone) return;
  repo.drones.update(drone.id, { airworthiness: AuditStatus.Approved });
  const busyCapacity = repo.capacity.where((unit) => unit.ownerId === ownerId && unit.droneId === drone.id && unit.status === CapacityStatus.Busy)[0];
  if (busyCapacity) {
    recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'drone', drone.id, '忙碌设备认证通过，保持执行中运力');
    return;
  }
  deployOwnerDrone(ownerId, drone.id);
}

function rejectOwnerDeviceFromCertification(ownerId: string, fields: CertificationApplication['fields']) {
  const drone = submittedOwnerDrone(ownerId, fields);
  if (!drone) return;
  repo.drones.update(drone.id, { airworthiness: AuditStatus.Rejected });
  setOwnerDroneCapacityStatus(ownerId, drone.id, CapacityStatus.Offline);
}

export function latestCertification(role: Role, userId: string): CertificationApplication | undefined {
  const items = repo.authApplications.where((a) => a.role === role && a.userId === userId);
  return items
    .slice()
    .sort((a, b) => certificationTimeMs(b) - certificationTimeMs(a))[0];
}

function certificationTimeMs(app: CertificationApplication) {
  const submittedAt = Date.parse(app.submittedAt);
  if (Number.isFinite(submittedAt)) return submittedAt;
  const reviewedAt = app.reviewedAt ? Date.parse(app.reviewedAt) : 0;
  return Number.isFinite(reviewedAt) ? reviewedAt : 0;
}

export function approveCertification(appId: string): CertificationApplication {
  const app = repo.authApplications.find(appId);
  if (!app) throw new Error('认证申请不存在');
  repo.authApplications.update(app.id, { status: AuditStatus.Approved, reviewedAt: new Date().toISOString() });
  if (app.role === Role.Pilot) {
    setLocalRoleProfile(app.userId, app.role, RoleProfileStatus.Active, app.id);
    repo.pilots.update(app.userId, { noCrimeProof: AuditStatus.Approved, healthProof: AuditStatus.Approved });
    repo.users.update(app.userId, { realNameVerified: true, authStatus: AuditStatus.Approved });
  }
  if (app.role === Role.Owner) {
    setLocalRoleProfile(app.userId, app.role, RoleProfileStatus.Active, app.id);
    repo.owners.update(app.userId, { uomVerified: true });
    repo.users.update(app.userId, { realNameVerified: true, authStatus: AuditStatus.Approved });
    approveOwnerDeviceFromCertification(app.userId, app.fields);
  }
  if (app.role === Role.Client) repo.users.update(app.userId, { realNameVerified: true, authStatus: AuditStatus.Approved });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'certification', app.id, '后台通过认证');
  notify(app.userId, NotificationType.Audit, '认证通过', '后台已通过认证申请', app.id);
  persistBackendSnapshot();
  return repo.authApplications.find(app.id)!;
}

export function rejectCertification(appId: string): CertificationApplication {
  const app = repo.authApplications.find(appId);
  if (!app) throw new Error('认证申请不存在');
  repo.authApplications.update(app.id, { status: AuditStatus.Rejected, reviewedAt: new Date().toISOString() });
  if (app.role === Role.Pilot) {
    setLocalRoleProfile(app.userId, app.role, RoleProfileStatus.Rejected, app.id);
    repo.pilots.update(app.userId, { noCrimeProof: AuditStatus.Rejected });
  }
  if (app.role === Role.Owner) {
    setLocalRoleProfile(app.userId, app.role, RoleProfileStatus.Rejected, app.id);
    repo.owners.update(app.userId, { uomVerified: false });
    rejectOwnerDeviceFromCertification(app.userId, app.fields);
  }
  if (app.role === Role.Client) repo.users.update(app.userId, { realNameVerified: false, authStatus: AuditStatus.Rejected });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'certification', app.id, '后台驳回认证');
  notify(app.userId, NotificationType.Audit, '认证驳回', '请补充认证材料后重新提交', app.id);
  persistBackendSnapshot();
  return repo.authApplications.find(app.id)!;
}

function setLocalRoleProfile(userId: string, role: Role, status: RoleProfileStatus, certificationId?: string) {
  const now = new Date().toISOString();
  const id = `${userId}_${role}`;
  const existing = repo.userRoleProfiles.find(id);
  const patch = { status, certificationId, updatedAt: now };
  if (existing) return repo.userRoleProfiles.update(id, patch);
  const user = repo.users.find(userId);
  if (user && !user.roles.includes(role)) repo.users.update(userId, { roles: [...user.roles, role] });
  return repo.userRoleProfiles.insert({ id, userId, role, status, certificationId, createdAt: now, updatedAt: now });
}

function ensureLocalRoleData(userId: string, role: Role) {
  const user = repo.users.find(userId);
  if (user && !user.roles.includes(role)) repo.users.update(userId, { roles: [...user.roles, role] });
  if (role === Role.Client && !repo.clients.find(userId)) {
    repo.clients.insert({ userId, entityType: 'person', creditBureauScore: 0, stats: { payTimely: 1, defaultCount: 0, infoTrust: .8, complaintRate: 0, orderAccuracy: .9, cancelRate: 0 } });
    setLocalRoleProfile(userId, role, RoleProfileStatus.Active);
  }
  if (role === Role.Pilot && !repo.pilots.find(userId)) {
    repo.pilots.insert({ userId, caacLevel: 'VLOS', caacExpire: '', noCrimeProof: AuditStatus.Pending, healthProof: AuditStatus.Pending, trainingCerts: [], online: false, location: { lng: 116.4, lat: 39.9 }, stats: { orders: 0, completed: 0, cancelled: 0, onTimeRate: 0, complaintRate: 0, accidentRate: 0, violationCount: 0, flightHours: 0, onlineHours: 0, avgRespSec: 0, avgStar: 0 } });
  }
  if (role === Role.Owner && !repo.owners.find(userId)) {
    repo.owners.insert({ userId, entityType: 'person', drones: [], uomVerified: false, stats: { deviceUptime: 0, faultRate: 0, maintainTimely: 0, completeRate: 0, cancelRate: 0, respSec: 0, cooperation: 0 } });
  }
}

export function setUserBlacklist(userId: string, blacklisted: boolean) {
  const user = repo.users.update(userId, { blacklisted });
  recordAudit(AuditAction.Risk, 'admin', Role.Admin, 'user', userId, blacklisted ? '加入风控黑名单' : '移出风控黑名单');
  return user;
}

export function createClaim(orderId: string, evidence: string[]): Claim {
  const order = repo.orders.find(orderId);
  if (!order?.policyId) throw new Error('订单暂无保单，不能报案');
  const claim = repo.claims.insert({ id: genId('clm'), policyId: order.policyId, orderId, reportedAt: new Date().toISOString(), evidence, status: 'reported' });
  repo.policies.update(order.policyId, { status: 'claiming' });
  recordAudit(AuditAction.Insurance, order.clientId, Role.Client, 'claim', claim.id, '提交事故报案与证据');
  persistBackendSnapshot();
  return claim;
}

export function supplementClaimEvidence(claimId: string, evidence: string): Claim {
  const claim = repo.claims.find(claimId);
  if (!claim) throw new Error('理赔不存在');
  const order = repo.orders.find(claim.orderId);
  const nextEvidence = claim.evidence.includes(evidence) ? claim.evidence : [...claim.evidence, evidence];
  const updated = repo.claims.update(claim.id, { evidence: nextEvidence });
  recordAudit(AuditAction.Insurance, order?.clientId ?? 'client', Role.Client, 'claim', claim.id, `补充理赔材料：${evidence}`);
  persistBackendSnapshot();
  return updated;
}

export function advanceClaim(claimId: string): Claim {
  const claim = repo.claims.find(claimId);
  if (!claim) throw new Error('理赔不存在');
  if (claim.status === 'paid' || claim.status === 'arbitration') return claim;
  const next = claim.status === 'reported' ? 'investigating' : claim.status === 'investigating' ? 'assessed' : claim.status === 'assessed' ? 'paid' : claim.status;
  const patch: Partial<Claim> = { status: next };
  if (next === 'assessed') {
    patch.liability = '平台仲裁 + 演示保险定损';
    patch.payoutCent = Math.round(repo.orders.find(claim.orderId)!.cargo.valueCent * 0.8);
  }
  repo.claims.update(claim.id, patch);
  recordAudit(AuditAction.Insurance, 'insurance-demo', Role.Admin, 'claim', claim.id, `理赔流转到${claimStatusLabel(next)}`);
  if (next === 'paid') repo.policies.update(claim.policyId, { status: 'closed' });
  persistBackendSnapshot();
  return repo.claims.find(claim.id)!;
}

export function arbitrationClaim(claimId: string): Claim {
  const claim = repo.claims.update(claimId, { status: 'arbitration' });
  recordAudit(AuditAction.Insurance, 'admin', Role.Admin, 'claim', claim.id, '理赔进入仲裁');
  persistBackendSnapshot();
  return claim;
}

function persistBackendSnapshot() {
  void saveBackendSnapshotNow(db).catch(() => undefined);
}

export function analyticsReport() {
  const orders = repo.orders.all();
  const settled = orders.filter((o) => o.status === OrderStatus.Settled);
  const completed = orders.filter((o) => o.status === OrderStatus.Completed || o.status === OrderStatus.Settled);
  const revenue = orders.reduce((sum, o) => sum + (o.settlement?.totalCent ?? 0), 0);
  const claims = repo.claims.all();
  const openClaims = claims.filter((claim) => claim.status !== 'paid');
  const paidClaims = claims.filter((claim) => claim.status === 'paid');
  const claimPayoutCent = paidClaims.reduce((sum, claim) => sum + (claim.payoutCent ?? 0), 0);
  const disputes = openClaims.length + orders.filter((o) => o.status === OrderStatus.Exception).length;
  const periods = ['日报', '周报', '月报'].map((period, index) => ({
    period,
    orders: Math.max(orders.length - index, 0),
    completed: Math.max(completed.length - index, 0),
    incomeCent: Math.max(revenue - index * 5000, 0),
  }));
  const heatmap = repo.capacity.all().map((c, index) => ({
    id: c.id,
    label: capacityHeatmapLabel(c, index, repo.drones.find(c.droneId), repo.users.find(c.pilotId)),
    area: capacityHeatmapAreaLabel(c, index),
    statusLabel: capacityStatusLabel(c.status),
    actionHint: capacityHeatmapActionHint(c.status),
    lng: c.location.lng,
    lat: c.location.lat,
    status: c.status,
  }));
  const suggestions = [
    orders.length === 0 ? '冷启动阶段：优先生成示范订单校验三端链路' : '',
    repo.capacity.where((c) => c.status === 'online').length < 2 ? '在线运力不足：建议机主投放更多合规设备' : '',
    disputes > 0 ? '存在投诉或异常：建议运营复核理赔与订单事件' : '',
    settled.length > 0 ? '已有结算订单：可按周/月报复盘平台收入结构' : '',
  ].filter(Boolean);
  return {
    completionRate: orders.length ? completed.length / orders.length : 0,
    cancelRate: orders.length ? orders.filter((o) => o.status === OrderStatus.Cancelled).length / orders.length : 0,
    revenue,
    activeUsers: new Set(orders.flatMap((o) => [o.clientId, o.pilotId, repo.capacity.find(o.capacityId ?? '')?.ownerId].filter(Boolean))).size,
    disputes,
    claimCount: claims.length,
    openClaimCount: openClaims.length,
    paidClaimCount: paidClaims.length,
    claimPayoutCent,
    periods,
    heatmap,
    suggestions,
  };
}

function capacityHeatmapActionHint(status: CapacityStatus) {
  if (status === CapacityStatus.Online) return '可接入智能匹配';
  if (status === CapacityStatus.Busy) return '执行中，暂不参与新单';
  return '需机主重新上线';
}

export function approvePilotQualification(userId: string) {
  repo.pilots.update(userId, { noCrimeProof: AuditStatus.Approved, healthProof: AuditStatus.Approved });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'pilot', userId, '后台通过飞手资质');
  notify(userId, NotificationType.Audit, '认证通过', '后台已通过飞手资质审核', userId);
  persistBackendSnapshot();
}

export function rejectPilotQualification(userId: string) {
  repo.pilots.update(userId, { noCrimeProof: AuditStatus.Rejected, healthProof: AuditStatus.Rejected });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'pilot', userId, '后台驳回飞手资质');
  notify(userId, NotificationType.Audit, '认证驳回', '请补充飞手资质材料', userId);
  persistBackendSnapshot();
}

export const demoRoute = [routeStart, routeEnd];
