import { beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AuditStatus, CapacityStatus, CargoType, NotificationType, OrderStatus, PaymentMode } from '@/models';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';
import { computeCredit } from '@/utils/credit';
import {
  advanceOrder,
  candidatesForOrder,
  confirmCandidate,
  advanceClaim,
  activeOwnerMissionForDrone,
  currentPilotOrder,
  defaultUserForRole,
  decideMockAirspace,
  deployOwnerDrone,
  getLatestOrder,
  analyticsReport,
  approveCertification,
  createClaim,
  latestCertification,
  matchingOrdersForPilot,
  pilotAcceptOrder,
  rejectCertification,
  rejectPilotQualification,
  recordClientReview,
  runAdminDemoFlow,
  setUserBlacklist,
  submitCertification,
  submitOrderDraft,
  withdrawOwnerDrone,
} from '@/services/app-flow';
import { Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';
import { providers } from '@/api/providers';

beforeEach(() => {
  vi.restoreAllMocks();
  resetDB();
  setActivePinia(createPinia());
});

function draft(type: CargoType = CargoType.Valuable) {
  return submitOrderDraft({
    clientId: repo.clients.all()[0].userId,
    cargoType: type,
    weightKg: 8,
    valueCent: 300000,
    budgetCent: 300000,
    insured: type === CargoType.Valuable,
    shockProof: true,
    remark: '外层流程测试订单',
  });
}

it('飞手大厅只列出可承接 Matching 订单，接单后走 transition 并锁定运力', () => {
  const order = draft();
  const options = matchingOrdersForPilot('u_p1');
  expect(options.map((item) => item.order.id)).toContain(order.id);
  const accepted = pilotAcceptOrder(order.id, 'u_p1');
  expect(accepted.status).toBe(OrderStatus.Confirmed);
  expect(accepted.pilotId).toBe('u_p1');
  expect(repo.capacity.find(accepted.capacityId!)!.status).toBe('busy');
  expect(repo.notifications.where((n) => n.userId === accepted.clientId && n.type === NotificationType.Dispatch).length).toBeGreaterThan(0);
});

it('飞手资质驳回后不能出现在匹配候选或接单', () => {
  const order = draft();
  rejectPilotQualification('u_p1');

  expect(matchingOrdersForPilot('u_p1')).toEqual([]);
  expect(candidatesForOrder(order.id).some((candidate) => candidate.pilotId === 'u_p1')).toBe(false);
  expect(() => pilotAcceptOrder(order.id, 'u_p1')).toThrow('飞手资质审核未通过');
});

it('已接单飞手资质被驳回后不能推进起飞前流程', () => {
  const accepted = pilotAcceptOrder(draft().id, 'u_p1');
  rejectPilotQualification('u_p1');

  expect(() => advanceOrder(accepted.id)).toThrow('飞手资质审核未通过');
});

it('机主可通过执行中设备定位关联任务，已结算任务不再作为执行中入口', () => {
  const accepted = pilotAcceptOrder(draft().id, 'u_p1');
  const ownerId = repo.capacity.find(accepted.capacityId!)!.ownerId;

  expect(activeOwnerMissionForDrone(ownerId, accepted.droneId!)?.id).toBe(accepted.id);
  expect(activeOwnerMissionForDrone('other-owner', accepted.droneId!)).toBeUndefined();

  repo.orders.update(accepted.id, { status: OrderStatus.Settled });
  expect(activeOwnerMissionForDrone(ownerId, accepted.droneId!)).toBeUndefined();
});

it('发单会保存用户选择的起终点，而不是固定默认线路', () => {
  const from = { lng: 116.401, lat: 39.72, address: '大兴航空物流园' };
  const to = { lng: 116.45, lat: 39.95, address: '顺义临空交付点' };
  const order = submitOrderDraft({
    clientId: repo.clients.all()[0].userId,
    cargoType: CargoType.Normal,
    weightKg: 5,
    valueCent: 50000,
    budgetCent: 200000,
    insured: false,
    shockProof: false,
    from,
    to,
    remark: '自选航线订单',
  });
  expect(order.from).toEqual(from);
  expect(order.to).toEqual(to);
});

it('报表纠纷数只统计未处理风险，不把已赔付理赔当异常', () => {
  const pending = draft();
  const order = confirmCandidate(pending.id, candidatesForOrder(pending.id)[0]);
  const claim = createClaim(order.id, ['现场照片']);

  let report = analyticsReport();
  expect(report.disputes).toBe(1);
  expect(report.claimCount).toBe(1);
  expect(report.openClaimCount).toBe(1);
  expect(report.paidClaimCount).toBe(0);
  expect(report.claimPayoutCent).toBe(0);
  expect(report.suggestions).toContain('存在投诉或异常：建议运营复核理赔与订单事件');

  advanceClaim(claim.id);
  advanceClaim(claim.id);
  advanceClaim(claim.id);

  const paidClaim = repo.claims.find(claim.id);
  report = analyticsReport();
  expect(paidClaim?.status).toBe('paid');
  expect(report.disputes).toBe(0);
  expect(report.claimCount).toBe(1);
  expect(report.openClaimCount).toBe(0);
  expect(report.paidClaimCount).toBe(1);
  expect(report.claimPayoutCent).toBe(paidClaim?.payoutCent);
  expect(report.suggestions).not.toContain('存在投诉或异常：建议运营复核理赔与订单事件');
});

it('当前订单按创建时间选择最新任务，而不是依赖数组插入顺序', () => {
  const latest = draft();
  repo.orders.update(latest.id, {
    createdAt: '2026-06-14T12:49:00.000Z',
    pilotId: 'u_p1',
    status: OrderStatus.Confirmed,
  });
  const stale = draft();
  repo.orders.update(stale.id, {
    createdAt: '2026-06-13T22:27:00.000Z',
    pilotId: 'u_p1',
    status: OrderStatus.Confirmed,
  });

  const orders = repo.orders.all();
  expect(orders[orders.length - 1]?.id).toBe(stale.id);
  expect(getLatestOrder()?.id).toBe(latest.id);
  expect(currentPilotOrder('u_p1')?.id).toBe(latest.id);
});

it('最近认证按提交时间选择最新申请，而不是依赖数组顺序', () => {
  const clientId = repo.clients.all()[0].userId;
  const newer = submitCertification(Role.Client, clientId, { realName: '张建国', idNo: '110105********1234' });
  rejectCertification(newer.id);
  const older = submitCertification(Role.Client, clientId, { realName: '旧材料', idNo: '110105********0000' });
  repo.authApplications.update(older.id, { submittedAt: '2026-01-01T00:00:00.000Z' });

  const applications = repo.authApplications.all();
  expect(applications[applications.length - 1]?.id).toBe(older.id);
  expect(latestCertification(Role.Client, clientId)?.id).toBe(newer.id);
  expect(latestCertification(Role.Client, clientId)?.status).toBe(AuditStatus.Rejected);
});

it('默认进入飞手和机主端时优先选择活跃任务，而不是更新的已结算历史单', () => {
  const active = draft();
  repo.orders.update(active.id, {
    createdAt: '2026-06-13T22:27:00.000Z',
    pilotId: 'u_p3',
    droneId: 'd3',
    capacityId: 'cap3',
    status: OrderStatus.Confirmed,
  });
  const settled = draft();
  repo.orders.update(settled.id, {
    createdAt: '2026-06-14T12:49:00.000Z',
    pilotId: 'u_p1',
    droneId: 'd1',
    capacityId: 'cap1',
    status: OrderStatus.Settled,
  });

  expect(defaultUserForRole(Role.Pilot).id).toBe('u_p3');
  expect(defaultUserForRole(Role.Owner).id).toBe('u_o2');
});

it('发单会保存体积、预约、时效、照片、支付模式与发票字段', () => {
  const order = submitOrderDraft({
    clientId: repo.clients.all()[0].userId,
    cargoType: CargoType.Agricultural,
    weightKg: 6,
    valueCent: 80000,
    budgetCent: 200000,
    insured: false,
    shockProof: true,
    tempControl: true,
    special: '温控避震',
    volume: '60x40x20cm',
    photos: ['photo-entry'],
    timeMode: 'scheduled',
    scheduledAt: '2031-12-31T09:00:00.000Z',
    timeRequirement: '90分钟内送达',
    paymentMode: PaymentMode.Credit,
    invoiceTitle: '验收测试公司',
  });
  expect(order.cargo.volume).toBe('60x40x20cm');
  expect(order.cargo.photos).toEqual(['photo-entry']);
  expect(order.needs.tempControl).toBe(true);
  expect(order.needs.special).toBe('温控避震');
  expect(order.paymentMode).toBe(PaymentMode.Credit);
  expect(order.invoiceTitle).toBe('验收测试公司');
});

it('空域先 submitted，未经 Mock provider 审批不得进入 Preparing', () => {
  const order = draft();
  const confirmed = confirmCandidate(order.id, candidatesForOrder(order.id)[0]);
  const airspace = advanceOrder(confirmed.id);
  expect(airspace.events[airspace.events.length - 1]).toMatchObject({ actor: Role.Pilot, note: '提交空域申请' });
  expect(repo.airspace.where((a) => a.orderId === confirmed.id)[0].status).toBe('submitted');
  expect(() => advanceOrder(confirmed.id)).toThrow('空域尚未批准');
});

it('Mock 空域审批 approved 才能推进到 Preparing，dangerous 会进入 Exception', () => {
  const normal = draft();
  let order = confirmCandidate(normal.id, candidatesForOrder(normal.id)[0]);
  order = advanceOrder(order.id);
  decideMockAirspace(order.id);
  expect(repo.airspace.where((a) => a.orderId === order.id)[0].status).toBe('approved');
  const approvedEvents = repo.orders.find(order.id)?.events ?? [];
  expect(approvedEvents[approvedEvents.length - 1]).toMatchObject({ actor: Role.Admin, note: '空域审批通过' });
  expect(advanceOrder(order.id).status).toBe(OrderStatus.Preparing);

  const dangerous = draft(CargoType.Dangerous);
  let rejected = confirmCandidate(dangerous.id, candidatesForOrder(dangerous.id)[0]);
  rejected = advanceOrder(rejected.id);
  decideMockAirspace(rejected.id);
  expect(repo.airspace.where((a) => a.orderId === rejected.id)[0].status).toBe('rejected');
  expect(advanceOrder(rejected.id).status).toBe(OrderStatus.Exception);
});

it('未进入飞行中时刷新遥测只生成待起飞地面帧', () => {
  const normal = draft(CargoType.Normal);
  let order = confirmCandidate(normal.id, candidatesForOrder(normal.id)[0]);
  order = advanceOrder(order.id);
  decideMockAirspace(order.id);
  order = advanceOrder(order.id);
  expect(order.status).toBe(OrderStatus.Preparing);

  const telemetry = useTelemetryStore();
  telemetry.start(order.id);

  expect(telemetry.running).toBe(false);
  expect(telemetry.latest?.altM).toBe(0);
  expect(telemetry.latest?.speedMs).toBe(0);
  expect(telemetry.latest?.pos).toEqual(order.from);
});

it('飞行中必须进入终点围栏后才能确认卸货', () => {
  const normal = draft(CargoType.Normal);
  let order = confirmCandidate(normal.id, candidatesForOrder(normal.id)[0]);
  order = advanceOrder(order.id);
  decideMockAirspace(order.id);
  order = advanceOrder(order.id);
  order = advanceOrder(order.id);
  order = advanceOrder(order.id);
  expect(order.status).toBe(OrderStatus.InFlight);

  expect(() => advanceOrder(order.id)).toThrow('尚未收到飞行遥测');

  repo.telemetry.insert({
    id: `tel_${order.id}`,
    orderId: order.id,
    source: 'pilot',
    updatedAt: new Date().toISOString(),
    frame: {
      ts: new Date().toISOString(),
      pos: order.from,
      altM: 30,
      speedMs: 10,
      batteryPct: 50,
      heading: 0,
      swingDeg: 5,
    },
  });
  expect(() => advanceOrder(order.id)).toThrow('尚未到达卸货点');

  repo.telemetry.update(`tel_${order.id}`, {
    frame: {
      ts: new Date().toISOString(),
      pos: order.to,
      altM: 5,
      speedMs: 1,
      batteryPct: 42,
      heading: 0,
      swingDeg: 2,
    },
  });
  expect(advanceOrder(order.id).status).toBe(OrderStatus.Unloading);
});

it('后台流程演练按发单、匹配、空域、飞行、卸货、结算完整闭环', async () => {
  repo.clients.all().forEach((client) => repo.users.update(client.userId, { realNameVerified: false }));

  const order = await runAdminDemoFlow();
  const airspace = repo.airspace.where((item) => item.orderId === order.id)[0];
  const telemetry = repo.telemetry.find(`tel_${order.id}`);

  expect(order.status).toBe(OrderStatus.Settled);
  expect(repo.users.find(order.clientId)?.realNameVerified).toBe(true);
  expect(airspace.status).toBe('approved');
  expect(telemetry?.frame.pos).toEqual(order.to);
  expect(order.settlement?.items.length).toBeGreaterThan(0);
  expect(repo.capacity.find(order.capacityId!)!.status).toBe(CapacityStatus.Online);
});

it('后台驳回飞手资质会更新 repo 并通知飞手', () => {
  rejectPilotQualification('u_p1');
  expect(repo.pilots.find('u_p1')!.noCrimeProof).toBe('rejected');
  expect(repo.notifications.where((n) => n.userId === 'u_p1' && n.type === NotificationType.Audit)[0].title).toBe('认证驳回');
});

it('三方认证申请写入 repo，后台通过后端侧状态可见并写审计', () => {
  const app = submitCertification(Role.Owner, 'u_o1', { droneModel: 'DJI FlyCart 30', uomNo: 'UOM-MOCK', insuranceAmount: 8000000 });
  expect(app.status).toBe(AuditStatus.Pending);
  expect(app.fields.droneSn).toBeTruthy();
  expect(repo.owners.find('u_o1')!.uomVerified).toBe(false);
  const approved = approveCertification(app.id);
  expect(approved.status).toBe(AuditStatus.Approved);
  expect(repo.owners.find('u_o1')!.uomVerified).toBe(true);
  expect(repo.auditLogs.where((log) => log.targetId === app.id).length).toBeGreaterThan(1);
});

it('机主设备认证必须拦截低于500万三者险，达标后待审，审批通过才生成运力', () => {
  expect(() => submitCertification(Role.Owner, 'u_o1', { droneModel: '低保额设备', droneSn: 'SN-LOW', insuranceAmount: 1000000 })).toThrow('三者险保额不足500万');
  expect(repo.drones.where((d) => d.sn === 'SN-LOW')).toHaveLength(0);

  const beforeDrones = repo.drones.all().length;
  const app = submitCertification(Role.Owner, 'u_o1', { droneModel: '合规吊运设备', droneSn: 'SN-HIGH', insuranceAmount: 8000000, maintenance: '例检正常' });
  const drone = repo.drones.where((d) => d.sn === 'SN-HIGH')[0];
  expect(app.status).toBe(AuditStatus.Pending);
  expect(repo.drones.all().length).toBe(beforeDrones + 1);
  expect(drone.insured.thirdPartyAmount).toBe(8000000);
  expect(drone.airworthiness).toBe(AuditStatus.Pending);
  expect(repo.owners.find('u_o1')!.uomVerified).toBe(false);
  expect(repo.capacity.where((c) => c.droneId === drone.id && c.status === 'online')).toHaveLength(0);

  approveCertification(app.id);
  expect(repo.drones.find(drone.id)!.airworthiness).toBe(AuditStatus.Approved);
  expect(repo.capacity.where((c) => c.droneId === drone.id && c.status === 'online')).toHaveLength(1);
});

it('设备投放复用合规门，撤回后从匹配候选消失', () => {
  expect(() => deployOwnerDrone('u_o1', 'd5')).toThrow('三者险保额不足500万');
  const app = submitCertification(Role.Owner, 'u_o1', { droneModel: '匹配测试设备', droneSn: 'SN-MATCH', insuranceAmount: 8000000 });
  const created = repo.drones.where((d) => d.sn === 'SN-MATCH')[0];
  const order = draft(CargoType.Normal);
  expect(candidatesForOrder(order.id).some((c) => c.droneId === created.id)).toBe(false);
  approveCertification(app.id);
  expect(candidatesForOrder(order.id).some((c) => c.droneId === created.id)).toBe(true);
  withdrawOwnerDrone('u_o1', created.id);
  expect(candidatesForOrder(order.id).some((c) => c.droneId === created.id)).toBe(false);
  deployOwnerDrone('u_o1', created.id);
  expect(candidatesForOrder(order.id).some((c) => c.droneId === created.id)).toBe(true);
});

it('后台驳回机主设备认证后阻断投放并从匹配候选移除该机主', () => {
  const order = draft(CargoType.Normal);
  const app = submitCertification(Role.Owner, 'u_o1', { droneModel: '驳回测试设备', droneSn: 'SN-REJECT', insuranceAmount: 8000000 });
  const drone = repo.drones.where((d) => d.sn === 'SN-REJECT')[0];

  expect(repo.owners.find('u_o1')!.uomVerified).toBe(false);
  expect(candidatesForOrder(order.id).some((candidate) => repo.capacity.find(candidate.capacityId)?.ownerId === 'u_o1')).toBe(false);

  rejectCertification(app.id);

  expect(repo.owners.find('u_o1')!.uomVerified).toBe(false);
  expect(repo.drones.find(drone.id)!.airworthiness).toBe(AuditStatus.Rejected);
  expect(() => deployOwnerDrone('u_o1', drone.id)).toThrow('机主资质未通过');
  expect(candidatesForOrder(order.id).some((candidate) => repo.capacity.find(candidate.capacityId)?.ownerId === 'u_o1')).toBe(false);
});

it('机主补认证通过后会绑定合规飞手并重新进入匹配候选', () => {
  rejectPilotQualification('u_p1');
  const app = submitCertification(Role.Owner, 'u_o1', { droneModel: '补认证设备', droneSn: 'SN-RESTORE', insuranceAmount: 8000000 });
  const drone = repo.drones.where((d) => d.sn === 'SN-RESTORE')[0];
  const order = draft(CargoType.Normal);

  expect(candidatesForOrder(order.id).some((candidate) => candidate.droneId === drone.id)).toBe(false);

  approveCertification(app.id);

  const capacity = repo.capacity.where((item) => item.droneId === drone.id)[0];
  expect(capacity.status).toBe(CapacityStatus.Online);
  expect(capacity.pilotId).not.toBe('u_p1');
  expect(candidatesForOrder(order.id).some((candidate) => candidate.droneId === drone.id)).toBe(true);
});

it('机主不能撤回正在执行任务的设备', () => {
  repo.capacity.update('cap4', { status: CapacityStatus.Busy });
  expect(() => withdrawOwnerDrone('u_o2', 'd4')).toThrow('设备正在执行任务，无法召回');
  expect(repo.capacity.find('cap4')!.status).toBe(CapacityStatus.Busy);
  expect(() => deployOwnerDrone('u_o2', 'd4')).toThrow('设备正在执行任务，无法重新投放');
});

it('审批执行中设备的机主认证不会强制重新投放', () => {
  repo.capacity.update('cap4', { status: CapacityStatus.Busy });
  const app = submitCertification(Role.Owner, 'u_o2', {
    droneModel: 'Autel Dragonfish',
    droneSn: 'SN-D4',
    insuranceAmount: 5000000,
    maintenance: '月度例检正常',
  });

  expect(() => approveCertification(app.id)).not.toThrow();
  expect(repo.drones.find('d4')!.airworthiness).toBe(AuditStatus.Approved);
  expect(repo.capacity.find('cap4')!.status).toBe(CapacityStatus.Busy);
  expect(repo.auditLogs.where((log) => log.targetId === app.id && log.detail === '后台通过认证')).toHaveLength(1);
});

it('投诉率上升后重算信用，匹配综合分同步下降', () => {
  const order = draft();
  computeCredit('u_p1', Role.Pilot);
  const before = candidatesForOrder(order.id).find((c) => c.pilotId === 'u_p1')!;
  const pilot = repo.pilots.find('u_p1')!;
  repo.pilots.update('u_p1', { stats: { ...pilot.stats, complaintRate: 0.7 } });
  computeCredit('u_p1', Role.Pilot);
  const after = candidatesForOrder(order.id).find((c) => c.pilotId === 'u_p1')!;
  expect(after.creditScore).toBeLessThan(before.creditScore);
  expect(after.score).toBeLessThan(before.score);
});

it('同一订单的业主评价不会重复写入', () => {
  const pending = draft();
  const order = confirmCandidate(pending.id, candidatesForOrder(pending.id)[0]);

  const first = recordClientReview(order.id, 5, '准时响应，吊运稳定');
  const second = recordClientReview(order.id, 3, '重复提交');

  expect(second.id).toBe(first.id);
  expect(repo.reviews.where((review) => review.orderId === order.id && review.byRole === Role.Client)).toHaveLength(1);
});

it('黑名单会阻断业主发单，并从匹配候选中过滤飞手', () => {
  setUserBlacklist('u_c1', true);
  expect(() => draft(CargoType.Normal)).toThrow('风控黑名单');
  setUserBlacklist('u_c1', false);
  const order = draft(CargoType.Normal);
  expect(candidatesForOrder(order.id).some((c) => c.pilotId === 'u_p1')).toBe(true);
  setUserBlacklist('u_p1', true);
  expect(candidatesForOrder(order.id).some((c) => c.pilotId === 'u_p1')).toBe(false);
});

it('保险理赔按 reported→investigating→assessed→paid 流转并关闭保单', () => {
  const order = draft();
  const confirmed = confirmCandidate(order.id, candidatesForOrder(order.id)[0]);
  expect(confirmed.policyId).toBeTruthy();
  let claim = createClaim(confirmed.id, ['现场照片', '飞行数据']);
  expect(claim.status).toBe('reported');
  claim = advanceClaim(claim.id);
  expect(claim.status).toBe('investigating');
  claim = advanceClaim(claim.id);
  expect(claim.status).toBe('assessed');
  expect(claim.payoutCent).toBeGreaterThan(0);
  claim = advanceClaim(claim.id);
  expect(claim.status).toBe('paid');
  expect(repo.policies.find(claim.policyId)!.status).toBe('closed');
  const auditCount = repo.auditLogs.where((log) => log.targetId === claim.id).length;
  claim = advanceClaim(claim.id);
  expect(claim.status).toBe('paid');
  expect(repo.auditLogs.where((log) => log.targetId === claim.id)).toHaveLength(auditCount);
});

it('确认订单时 payment provider 使用订单选择的支付模式', async () => {
  const store = useOrderStore();
  const order = store.createOrderDraft({
    clientId: repo.clients.all()[0].userId,
    cargoType: CargoType.Normal,
    weightKg: 5,
    valueCent: 50000,
    budgetCent: 300000,
    insured: false,
    shockProof: false,
    paymentMode: PaymentMode.Installment,
  });
  const candidate = candidatesForOrder(order.id)[0];
  store.chooseCandidate(candidate);
  const spy = vi.spyOn(providers.payment, 'prepay');
  await store.confirmSelected();
  expect(spy).toHaveBeenCalledWith(order.id, candidate.quoteCent, PaymentMode.Installment);
  expect(repo.auditLogs.where((log) => log.targetId === order.id && log.detail.includes('分期支付'))).toHaveLength(1);
});

it('无匹配候选时确认下单给出业务错误且不调用支付', async () => {
  repo.capacity.all().forEach((unit) => repo.capacity.update(unit.id, { status: CapacityStatus.Offline }));
  const store = useOrderStore();
  store.createOrderDraft({
    clientId: repo.clients.all()[0].userId,
    cargoType: CargoType.Normal,
    weightKg: 5,
    valueCent: 50000,
    budgetCent: 300000,
    insured: false,
    shockProof: false,
  });
  const spy = vi.spyOn(providers.payment, 'prepay');
  await expect(store.confirmSelected()).rejects.toThrow('当前没有在线合规运力');
  expect(spy).not.toHaveBeenCalled();
  expect(store.error).toContain('当前没有在线合规运力');
});

it('非 Matching 订单不能重复确认方案且不调用支付或保险', async () => {
  const store = useOrderStore();
  const order = store.createOrderDraft({
    clientId: repo.clients.all()[0].userId,
    cargoType: CargoType.Normal,
    weightKg: 5,
    valueCent: 50000,
    budgetCent: 300000,
    insured: false,
    shockProof: false,
  });
  store.chooseCandidate(candidatesForOrder(order.id)[0]);
  repo.orders.update(order.id, { status: OrderStatus.InFlight });
  const paymentSpy = vi.spyOn(providers.payment, 'prepay');
  const insuranceSpy = vi.spyOn(providers.insurance, 'quote');

  await expect(store.confirmSelected()).rejects.toThrow('不能重复确认方案');
  expect(store.error).toContain('运输中');
  expect(store.error).not.toContain('非法流转');
  expect(paymentSpy).not.toHaveBeenCalled();
  expect(insuranceSpy).not.toHaveBeenCalled();

  repo.orders.update(order.id, { status: OrderStatus.Settled });
  await expect(store.confirmSelected()).rejects.toThrow('不能重复确认方案');
  expect(store.error).toContain('已结算');
  expect(paymentSpy).not.toHaveBeenCalled();
});

it('后台运力热力图只返回业务标签，不暴露内部运力编号', () => {
  repo.capacity.insert({ id: 'cap_Uhm90Vqv', pilotId: 'u_p1', droneId: 'd1', ownerId: 'u_o1', location: { lng: 116.41, lat: 39.91 }, status: CapacityStatus.Online });
  const heatmap = analyticsReport().heatmap;
  const visibleText = heatmap.map((point) => [point.label, point.area, point.statusLabel, point.actionHint].join(' ')).join(' ');
  expect(visibleText).toContain('DJI FlyCart 30');
  expect(visibleText).toContain('低空走廊 5 号机位');
  expect(visibleText).toContain('在线可接');
  expect(visibleText).toContain('可接入智能匹配');
  expect(visibleText).not.toMatch(/\bcap[_A-Za-z0-9-]*\b/);
  expect(visibleText).not.toMatch(/\d+\.\d{3}/);
});
