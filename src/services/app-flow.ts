import { AuditAction, AuditStatus, CapacityStatus, CargoType, DispatchStrategy, NotificationType, OrderStatus, PaymentMode, Role } from '@/models';
import type { AirspaceRequest, AuditLog, CertificationApplication, Claim, GeoPoint, InsurancePolicy, MatchCandidate, Order, Review } from '@/models';
import { createCapacity, createOrder } from '@/models/factory';
import { validateOrder } from '@/models/validate';
import { INSURANCE_PLANS, PRICE_CONFIG } from '@/stores/config-data';
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

export function recordAudit(action: AuditAction, actorId: string, actorRole: Role, targetType: string, targetId: string | undefined, detail: string): AuditLog {
  return repo.auditLogs.insert({ id: genId('aud'), at: new Date().toISOString(), action, actorId, actorRole, targetType, targetId, detail });
}

export function getLatestOrder(): Order | undefined {
  const orders = repo.orders.all();
  return orders[orders.length - 1];
}

export function ensureActiveOrder(): Order {
  const active = repo.orders.where((o) => o.status !== OrderStatus.Settled && o.status !== OrderStatus.Cancelled).reverse()[0];
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
  recordAudit(AuditAction.Order, input.clientId, Role.Client, 'order', saved.id, `发布${input.cargoType}吊运订单`);
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
  const confirmed = transition(order.id, OrderStatus.Confirmed, { actor: Role.Client, note: '业主确认推荐方案' });
  recordAudit(AuditAction.Payment, order.clientId, Role.Client, 'order', order.id, `${order.paymentMode ?? PaymentMode.Escrow} 模式预支付已由演示支付通道受理`);
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
  const request = createAirspaceRequest(orderId);
  const status: AirspaceRequest['status'] = order.cargo.type === CargoType.Dangerous ? 'rejected' : 'approved';
  repo.airspace.update(request.id, { status });
  recordAudit(AuditAction.Airspace, 'airspace-demo', Role.Admin, 'airspace', request.id, status === 'approved' ? '空域审批通过' : '空域审批驳回');
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

export function submitCertification(role: Role, userId: string, fields: CertificationApplication['fields']): CertificationApplication {
  if (role === Role.Owner) submitOwnerDeviceCertification(userId, fields);
  const app = repo.authApplications.insert({ id: genId('cert'), userId, role, status: AuditStatus.Pending, submittedAt: new Date().toISOString(), fields });
  if (role === Role.Pilot) repo.pilots.update(userId, { noCrimeProof: AuditStatus.Pending, healthProof: AuditStatus.Pending, trainingCerts: Array.isArray(fields.trainingCerts) ? fields.trainingCerts as string[] : [] });
  if (role === Role.Owner) {
    repo.owners.update(userId, { uomVerified: false });
  }
  if (role === Role.Client) repo.users.update(userId, { realNameVerified: false });
  recordAudit(AuditAction.Certification, userId, role, 'certification', app.id, '提交三方认证材料');
  notify(userId, NotificationType.Audit, '认证已提交', '材料已进入审核中状态', app.id);
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
  const drone = validateOwnerDroneCompliance(droneId);
  if (drone.ownerId !== ownerId) throw new Error('设备不属于当前机主');
  const pilot = repo.pilots.all()[0];
  const existing = repo.capacity.where((c) => c.droneId === drone.id)[0];
  if (existing) {
    repo.capacity.update(existing.id, { status: CapacityStatus.Online, ownerId, pilotId: pilot.userId, location: pilot.location });
    recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'capacity', existing.id, '合规设备重新上线');
    return repo.capacity.find(existing.id)!;
  }
  const capacity = repo.capacity.insert(createCapacity({ pilotId: pilot.userId, droneId: drone.id, ownerId, location: pilot.location, status: CapacityStatus.Online }));
  recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'capacity', capacity.id, '合规设备生成运力并上线');
  return capacity;
}

export function withdrawOwnerDrone(ownerId: string, droneId: string) {
  repo.capacity.where((c) => c.droneId === droneId && c.ownerId === ownerId).forEach((c) => repo.capacity.update(c.id, { status: CapacityStatus.Offline }));
  recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'drone', droneId, '机主撤回运力');
}

export function setCapacityOnline(ownerId: string, capacityId: string) {
  const capacity = repo.capacity.find(capacityId);
  if (!capacity) throw new Error('运力不存在');
  if (capacity.ownerId !== ownerId) throw new Error('运力不属于当前机主');
  validateOwnerDroneCompliance(capacity.droneId);
  return repo.capacity.update(capacity.id, { status: CapacityStatus.Online });
}

export function setCapacityOffline(ownerId: string, capacityId: string) {
  const capacity = repo.capacity.find(capacityId);
  if (!capacity) throw new Error('运力不存在');
  if (capacity.ownerId !== ownerId) throw new Error('运力不属于当前机主');
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
    airworthiness: AuditStatus.Approved,
    insured: { hull: true, thirdParty: true, thirdPartyAmount: data.insuranceAmount },
    maintenanceLog: [{ date: new Date().toISOString().slice(0, 10), note: data.maintenance }],
    ownerId,
    status: 'idle' as const,
  };
  const drone = exists ? repo.drones.update(exists.id, patch) : repo.drones.insert({ id: genId('drn'), ...patch });
  const owner = repo.owners.find(ownerId);
  if (owner && !owner.drones.includes(drone.id)) repo.owners.update(ownerId, { drones: [...owner.drones, drone.id] });
  deployOwnerDrone(ownerId, drone.id);
  recordAudit(AuditAction.Certification, ownerId, Role.Owner, 'drone', drone.id, '机主设备认证写入设备与运力');
  return drone;
}

export function latestCertification(role: Role, userId: string): CertificationApplication | undefined {
  const items = repo.authApplications.where((a) => a.role === role && a.userId === userId);
  return items[items.length - 1];
}

export function approveCertification(appId: string): CertificationApplication {
  const app = repo.authApplications.find(appId);
  if (!app) throw new Error('认证申请不存在');
  repo.authApplications.update(app.id, { status: AuditStatus.Approved, reviewedAt: new Date().toISOString() });
  if (app.role === Role.Pilot) repo.pilots.update(app.userId, { noCrimeProof: AuditStatus.Approved, healthProof: AuditStatus.Approved });
  if (app.role === Role.Owner) repo.owners.update(app.userId, { uomVerified: true });
  if (app.role === Role.Client) repo.users.update(app.userId, { realNameVerified: true });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'certification', app.id, '后台通过认证');
  notify(app.userId, NotificationType.Audit, '认证通过', '后台已通过认证申请', app.id);
  return repo.authApplications.find(app.id)!;
}

export function rejectCertification(appId: string): CertificationApplication {
  const app = repo.authApplications.find(appId);
  if (!app) throw new Error('认证申请不存在');
  repo.authApplications.update(app.id, { status: AuditStatus.Rejected, reviewedAt: new Date().toISOString() });
  if (app.role === Role.Pilot) repo.pilots.update(app.userId, { noCrimeProof: AuditStatus.Rejected });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'certification', app.id, '后台驳回认证');
  notify(app.userId, NotificationType.Audit, '认证驳回', '请补充认证材料后重新提交', app.id);
  return repo.authApplications.find(app.id)!;
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
  return claim;
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
  recordAudit(AuditAction.Insurance, 'mock-insurance', Role.Admin, 'claim', claim.id, `理赔流转到 ${next}`);
  if (next === 'paid') repo.policies.update(claim.policyId, { status: 'closed' });
  return repo.claims.find(claim.id)!;
}

export function arbitrationClaim(claimId: string): Claim {
  const claim = repo.claims.update(claimId, { status: 'arbitration' });
  recordAudit(AuditAction.Insurance, 'admin', Role.Admin, 'claim', claim.id, '理赔进入仲裁');
  return claim;
}

export function analyticsReport() {
  const orders = repo.orders.all();
  const settled = orders.filter((o) => o.status === OrderStatus.Settled);
  const completed = orders.filter((o) => o.status === OrderStatus.Completed || o.status === OrderStatus.Settled);
  const revenue = orders.reduce((sum, o) => sum + (o.settlement?.totalCent ?? 0), 0);
  const disputes = repo.claims.all().length + orders.filter((o) => o.status === OrderStatus.Exception).length;
  const periods = ['日报', '周报', '月报'].map((period, index) => ({
    period,
    orders: Math.max(orders.length - index, 0),
    completed: Math.max(completed.length - index, 0),
    incomeCent: Math.max(revenue - index * 5000, 0),
  }));
  const heatmap = repo.capacity.all().map((c) => ({ id: c.id, lng: c.location.lng, lat: c.location.lat, status: c.status }));
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
    periods,
    heatmap,
    suggestions,
  };
}

export function approvePilotQualification(userId: string) {
  repo.pilots.update(userId, { noCrimeProof: AuditStatus.Approved, healthProof: AuditStatus.Approved });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'pilot', userId, '后台通过飞手资质');
  notify(userId, NotificationType.Audit, '认证通过', '后台已通过飞手资质审核', userId);
}

export function rejectPilotQualification(userId: string) {
  repo.pilots.update(userId, { noCrimeProof: AuditStatus.Rejected });
  recordAudit(AuditAction.Certification, 'admin', Role.Admin, 'pilot', userId, '后台驳回飞手资质');
  notify(userId, NotificationType.Audit, '认证驳回', '请补充飞手资质材料', userId);
}

export const demoRoute = [routeStart, routeEnd];
