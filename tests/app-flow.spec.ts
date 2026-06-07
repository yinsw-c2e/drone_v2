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
  decideMockAirspace,
  deployOwnerDrone,
  analyticsReport,
  approveCertification,
  createClaim,
  matchingOrdersForPilot,
  pilotAcceptOrder,
  rejectPilotQualification,
  setUserBlacklist,
  submitCertification,
  submitOrderDraft,
  withdrawOwnerDrone,
} from '@/services/app-flow';
import { Role } from '@/models';
import { useOrderStore } from '@/stores/order';
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
  advanceOrder(confirmed.id);
  expect(repo.airspace.where((a) => a.orderId === confirmed.id)[0].status).toBe('submitted');
  expect(() => advanceOrder(confirmed.id)).toThrow('空域尚未批准');
});

it('Mock 空域审批 approved 才能推进到 Preparing，dangerous 会进入 Exception', () => {
  const normal = draft();
  let order = confirmCandidate(normal.id, candidatesForOrder(normal.id)[0]);
  order = advanceOrder(order.id);
  decideMockAirspace(order.id);
  expect(repo.airspace.where((a) => a.orderId === order.id)[0].status).toBe('approved');
  expect(advanceOrder(order.id).status).toBe(OrderStatus.Preparing);

  const dangerous = draft(CargoType.Dangerous);
  let rejected = confirmCandidate(dangerous.id, candidatesForOrder(dangerous.id)[0]);
  rejected = advanceOrder(rejected.id);
  decideMockAirspace(rejected.id);
  expect(repo.airspace.where((a) => a.orderId === rejected.id)[0].status).toBe('rejected');
  expect(advanceOrder(rejected.id).status).toBe(OrderStatus.Exception);
});

it('后台驳回飞手资质会更新 repo 并通知飞手', () => {
  rejectPilotQualification('u_p1');
  expect(repo.pilots.find('u_p1')!.noCrimeProof).toBe('rejected');
  expect(repo.notifications.where((n) => n.userId === 'u_p1' && n.type === NotificationType.Audit)[0].title).toBe('认证驳回');
});

it('三方认证申请写入 repo，后台通过后端侧状态可见并写审计', () => {
  const app = submitCertification(Role.Owner, 'u_o1', { droneModel: 'DJI FlyCart 30', uomNo: 'UOM-MOCK', insuranceAmount: 8000000 });
  expect(app.status).toBe(AuditStatus.Pending);
  expect(repo.owners.find('u_o1')!.uomVerified).toBe(false);
  const approved = approveCertification(app.id);
  expect(approved.status).toBe(AuditStatus.Approved);
  expect(repo.owners.find('u_o1')!.uomVerified).toBe(true);
  expect(repo.auditLogs.where((log) => log.targetId === app.id).length).toBeGreaterThan(1);
});

it('机主设备认证必须拦截低于500万三者险，达标后写入设备并生成运力', () => {
  expect(() => submitCertification(Role.Owner, 'u_o1', { droneModel: '低保额设备', droneSn: 'SN-LOW', insuranceAmount: 1000000 })).toThrow('三者险保额不足500万');
  expect(repo.drones.where((d) => d.sn === 'SN-LOW')).toHaveLength(0);

  const beforeDrones = repo.drones.all().length;
  const app = submitCertification(Role.Owner, 'u_o1', { droneModel: '合规吊运设备', droneSn: 'SN-HIGH', insuranceAmount: 8000000, maintenance: '例检正常' });
  const drone = repo.drones.where((d) => d.sn === 'SN-HIGH')[0];
  expect(app.status).toBe(AuditStatus.Pending);
  expect(repo.drones.all().length).toBe(beforeDrones + 1);
  expect(drone.insured.thirdPartyAmount).toBe(8000000);
  expect(repo.capacity.where((c) => c.droneId === drone.id && c.status === 'online')).toHaveLength(1);
});

it('设备投放复用合规门，撤回后从匹配候选消失', () => {
  expect(() => deployOwnerDrone('u_o1', 'd5')).toThrow('三者险保额不足500万');
  submitCertification(Role.Owner, 'u_o1', { droneModel: '匹配测试设备', droneSn: 'SN-MATCH', insuranceAmount: 8000000 });
  const created = repo.drones.where((d) => d.sn === 'SN-MATCH')[0];
  const order = draft(CargoType.Normal);
  expect(candidatesForOrder(order.id).some((c) => c.droneId === created.id)).toBe(true);
  withdrawOwnerDrone('u_o1', created.id);
  expect(candidatesForOrder(order.id).some((c) => c.droneId === created.id)).toBe(false);
  deployOwnerDrone('u_o1', created.id);
  expect(candidatesForOrder(order.id).some((c) => c.droneId === created.id)).toBe(true);
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
  const visibleText = analyticsReport().heatmap.map((point) => point.label).join(' ');
  expect(visibleText).toContain('DJI FlyCart 30');
  expect(visibleText).not.toMatch(/\bcap[_A-Za-z0-9-]*\b/);
});
