import { beforeEach, expect, it } from 'vitest';
import { CargoType, NotificationType, OrderStatus } from '@/models';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';
import { computeCredit } from '@/utils/credit';
import {
  advanceOrder,
  candidatesForOrder,
  confirmCandidate,
  decideMockAirspace,
  matchingOrdersForPilot,
  pilotAcceptOrder,
  rejectPilotQualification,
  submitOrderDraft,
} from '@/services/app-flow';
import { Role } from '@/models';

beforeEach(() => resetDB());

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
