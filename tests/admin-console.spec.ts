import { beforeEach, describe, expect, it } from 'vitest';
import { AuditAction, AuditStatus, CargoType, OrderStatus, Role } from '@/models';
import { adminCertificationRows, advanceAdminOrder, adminAuditRows, adminOrderRows, rejectAdminCertification } from '@/services/admin-console';
import { advanceOrder, candidatesForOrder, confirmCandidate, decideMockAirspace, submitOrderDraft } from '@/services/app-flow';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';

beforeEach(() => {
  resetDB();
});

function confirmedOrder() {
  const order = submitOrderDraft({
    clientId: repo.clients.all()[0].userId,
    cargoType: CargoType.Normal,
    weightKg: 8,
    valueCent: 300000,
    budgetCent: 300000,
    insured: true,
    shockProof: true,
    remark: '后台边界测试订单',
  });
  return confirmCandidate(order.id, candidatesForOrder(order.id)[0]);
}

describe('admin console order actions', () => {
  it('后台只审批空域，不替飞手进入准备', async () => {
    const airspaceOrder = advanceOrder(confirmedOrder().id);
    let row = adminOrderRows().find((item) => item.id === airspaceOrder.id);
    expect(row?.canAdvance).toBe(true);
    expect(row?.actionLabel).toBe('通过空域审批');

    await advanceAdminOrder(airspaceOrder.id);

    const airspace = repo.airspace.where((item) => item.orderId === airspaceOrder.id)[0];
    expect(airspace.status).toBe('approved');
    expect(repo.orders.find(airspaceOrder.id)?.status).toBe(OrderStatus.AirspaceApplying);
    row = adminOrderRows().find((item) => item.id === airspaceOrder.id);
    expect(row?.canAdvance).toBe(false);
    expect(row?.statusLabel).toBe('空域已批准');
    expect(row?.actionLabel).toBe('待飞手进入准备');
    expect(row?.latestEvent).toContain('空域审批通过');
    expect(row?.events.map((event) => `${event.status}:${event.note}`)).toContain('空域审批:提交空域申请');
    expect(row?.events.map((event) => `${event.status}:${event.note}`)).toContain('空域已批准:空域审批通过');
  });

  it('后台订单列表按创建时间显示最新订单在前', () => {
    const latest = confirmedOrder();
    repo.orders.update(latest.id, { createdAt: '2026-06-14T12:49:00.000Z' });
    const stale = confirmedOrder();
    repo.orders.update(stale.id, { createdAt: '2026-06-13T22:27:00.000Z' });

    const orders = repo.orders.all();
    expect(orders[orders.length - 1]?.id).toBe(stale.id);
    expect(adminOrderRows()[0].id).toBe(latest.id);
  });

  it('后台订单路线不暴露当前位置这类泛化地址', () => {
    const order = submitOrderDraft({
      clientId: repo.clients.all()[0].userId,
      cargoType: CargoType.Normal,
      weightKg: 8,
      valueCent: 300000,
      budgetCent: 300000,
      insured: true,
      shockProof: true,
      from: { lng: 113.125213, lat: 23.020498, address: '当前位置' },
      to: { lng: 113.13288, lat: 23.02296, address: '地图选点' },
    });

    const row = adminOrderRows().find((item) => item.id === order.id);

    expect(row?.route).toBe('订单起点 -> 订单终点');
  });

  it('审计日志按事件时间倒序展示', () => {
    repo.auditLogs.insert({
      id: 'audit-old',
      at: '2026-06-18T08:00:00.000Z',
      action: AuditAction.Order,
      actorId: 'u_c1',
      actorRole: Role.Client,
      targetType: 'order',
      detail: '旧日志',
    });
    repo.auditLogs.insert({
      id: 'audit-new',
      at: '2026-06-18T09:00:00.000Z',
      action: AuditAction.Payment,
      actorId: 'u_c1',
      actorRole: Role.Client,
      targetType: 'order',
      detail: '新日志',
    });

    expect(adminAuditRows()[0].id).toBe('audit-new');
  });

  it('审计日志展示空域关联订单，便于按运单追溯', () => {
    repo.airspace.insert({
      id: 'air_trace',
      orderId: 'o_trace',
      area: [],
      altitudeM: 120,
      window: { start: '2026-06-18T08:00:00.000Z', end: '2026-06-18T09:00:00.000Z' },
      status: 'approved',
    });
    repo.auditLogs.insert({
      id: 'audit-airspace',
      at: '2026-06-18T09:00:00.000Z',
      action: AuditAction.Airspace,
      actorId: 'admin',
      actorRole: Role.Admin,
      targetType: 'airspace',
      targetId: 'air_trace',
      detail: '空域审批通过',
    });

    expect(adminAuditRows()[0].targetLabel).toContain('关联订单 · O_TRACE');
  });

  it('后台驳回飞手资质复核后移出待审队列', () => {
    repo.pilots.update('u_p1', { noCrimeProof: AuditStatus.Pending, healthProof: AuditStatus.Pending });
    const row = adminCertificationRows().find((item) => item.kind === 'pilot' && item.sourceId === 'u_p1');

    expect(row).toBeTruthy();
    rejectAdminCertification(row!);

    expect(repo.pilots.find('u_p1')?.noCrimeProof).toBe(AuditStatus.Rejected);
    expect(repo.pilots.find('u_p1')?.healthProof).toBe(AuditStatus.Rejected);
    expect(adminCertificationRows().some((item) => item.kind === 'pilot' && item.sourceId === 'u_p1')).toBe(false);
  });

  it('执行阶段后台不可推进，必须由飞手端操作', async () => {
    const airspaceOrder = advanceOrder(confirmedOrder().id);
    decideMockAirspace(airspaceOrder.id);
    const preparing = advanceOrder(airspaceOrder.id);
    const loading = advanceOrder(preparing.id);

    const row = adminOrderRows().find((item) => item.id === loading.id);
    expect(row?.canAdvance).toBe(false);
    expect(row?.actionLabel).toBe('待飞手起飞执行');
    await expect(advanceAdminOrder(loading.id)).rejects.toThrow('执行阶段由飞手推进');
  });
});
