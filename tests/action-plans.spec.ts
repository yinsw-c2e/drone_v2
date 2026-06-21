import { describe, expect, it } from 'vitest';
import { AuditStatus, CapacityStatus, CargoType, OrderStatus, Role } from '@/models';
import type { Claim, Drone } from '@/models';
import { createOrder } from '@/models/factory';
import {
  adminOrderAction,
  adminRunFlowAction,
  adminRunFlowPanel,
  canTriggerEmergency,
  claimAction,
  emergencyClosedReason,
  matchConfirmAction,
  ownerCapacityAction,
  ownerDroneAction,
  reviewSettlementAction,
} from '@/services/action-plans';

function order(status: OrderStatus) {
  return {
    ...createOrder({
      clientId: 'u_c1',
      from: { lng: 116.397, lat: 39.908, address: '起点' },
      to: { lng: 116.45, lat: 39.95, address: '终点' },
      budgetCent: 200000,
      cargo: { type: CargoType.Normal, weightKg: 3, valueCent: 10000, photos: [] },
    }),
    status,
    events: [{ at: new Date().toISOString(), status, actor: Role.Pilot }],
  };
}

function claim(status: Claim['status']): Claim {
  return { id: 'clm-1', policyId: 'pol-1', orderId: 'ord-1', reportedAt: '2026-06-07T00:00:00.000Z', evidence: [], status };
}

function drone(status: Drone['status'] = 'idle'): Drone {
  return {
    id: 'd-test',
    brand: 'DJI',
    model: 'FC30',
    sn: 'SN-TEST',
    maxPayloadKg: 30,
    airworthiness: AuditStatus.Approved,
    insured: { hull: true, thirdParty: true, thirdPartyAmount: 8000000 },
    maintenanceLog: [],
    ownerId: 'u_o1',
    status,
  };
}

describe('action plans', () => {
  it('飞手终态关闭应急处置并显示业务解释', () => {
    expect(canTriggerEmergency(OrderStatus.Settled)).toBe(false);
    expect(emergencyClosedReason(OrderStatus.Settled)).toContain('应急处置已关闭');
    expect(canTriggerEmergency(OrderStatus.Confirmed)).toBe(false);
    expect(emergencyClosedReason(OrderStatus.Confirmed)).toContain('请先提交空域申请');
    expect(canTriggerEmergency(OrderStatus.InFlight)).toBe(true);
  });

  it('评价页已结算订单不再显示完成结算动作', () => {
    const settled = { ...order(OrderStatus.Settled), settlement: { orderId: 'ord-1', totalCent: 10000, items: [] } };
    const action = reviewSettlementAction(settled);
    expect(action.canFinish).toBe(false);
    expect(action.secondaryLabel).toBe('');
    expect(action.description).toContain('可直接提交评价');
  });

  it('后台已结算订单不显示可点击流转', () => {
    const action = adminOrderAction(order(OrderStatus.Settled));
    expect(action.disabled).toBe(true);
    expect(action.label).toBe('已完成');
    expect(action.reason).toContain('不能继续流转');
  });

  it('后台不替飞手推进现场执行阶段', () => {
    const loading = adminOrderAction(order(OrderStatus.Loading));
    expect(loading.disabled).toBe(true);
    expect(loading.label).toBe('待飞手起飞执行');
    expect(loading.reason).toContain('现场执行由飞手操作');
  });

  it('paid 理赔是终态，不再重复推进', () => {
    const action = claimAction(claim('paid'));
    expect(action.disabled).toBe(true);
    expect(action.label).toBe('赔付完成');
    expect(action.description).toContain('不能重复推进');
  });

  it('机主设备和运力只暴露当前可用动作', () => {
    expect(ownerDroneAction(drone(), false).primaryLabel).toBe('投放');
    expect(ownerDroneAction(drone(), true).secondaryLabel).toBe('撤回');
    expect(ownerDroneAction(drone('busy'), true).primaryLabel).toBe('');
    expect(ownerCapacityAction(CapacityStatus.Offline).primaryLabel).toBe('投放');
    expect(ownerCapacityAction(CapacityStatus.Online).secondaryLabel).toBe('撤回');
    expect(ownerCapacityAction(CapacityStatus.Busy).description).toContain('忙碌');
  });

  it('0 候选匹配页不允许确认下单并给出明确动作', () => {
    const action = matchConfirmAction(OrderStatus.Matching, 0, false);
    expect(action.canConfirm).toBe(false);
    expect(action.primaryLabel).toBe('等待运力');
    expect(action.secondaryLabel).toBe('修改订单');
    expect(action.showCandidates).toBe(true);
    expect(action.description).toContain('当前没有在线合规运力');
  });

  it('非 Matching 状态进入匹配页不再显示确认下单', () => {
    const inflight = matchConfirmAction(OrderStatus.InFlight, 1, true);
    expect(inflight.canConfirm).toBe(false);
    expect(inflight.showCandidates).toBe(false);
    expect(inflight.primaryLabel).toBe('查看追踪');
    expect(inflight.description).toContain('不能重复确认方案');

    const settled = matchConfirmAction(OrderStatus.Settled, 1, true);
    expect(settled.canConfirm).toBe(false);
    expect(settled.showCandidates).toBe(false);
    expect(settled.primaryLabel).toBe('查看结算');

    const exception = matchConfirmAction(OrderStatus.Exception, 1, true);
    expect(exception.canConfirm).toBe(false);
    expect(exception.primaryLabel).toBe('重新发单');
  });

  it('后台流程演练在 0 在线运力时给出业务阻断', () => {
    const blocked = adminRunFlowAction(0);
    expect(blocked.canRun).toBe(false);
    expect(blocked.description).toContain('当前没有在线合规运力');

    const ready = adminRunFlowAction(1);
    expect(ready.canRun).toBe(true);
    expect(ready.description).toContain('流程演练');
  });

  it('后台流程演练成功后不同时展示无在线运力阻断', () => {
    const actionAfterSuccess = adminRunFlowAction(0);
    const panel = adminRunFlowPanel(actionAfterSuccess, {
      kind: 'success',
      message: '流程演练已完成，结算与分账已生成',
    });

    expect(panel.noticeTone).toBe('success');
    expect(panel.noticeMessage).toContain('流程演练已完成');
    expect(panel.description).toContain('本次流程演练已完成');
    expect(panel.description).not.toContain('当前没有在线合规运力');
  });

  it('后台流程演练无反馈时按当前运力展示可执行说明', () => {
    const blockedPanel = adminRunFlowPanel(adminRunFlowAction(0), { kind: 'idle', message: '' });
    expect(blockedPanel.description).toContain('当前没有在线合规运力');
    expect(blockedPanel.noticeMessage).toBe('');

    const warningPanel = adminRunFlowPanel(adminRunFlowAction(0), {
      kind: 'warning',
      message: '当前没有在线合规运力，请先到机主调度投放运力，或返回调整订单条件。',
    });
    expect(warningPanel.description).toBe('');
    expect(warningPanel.noticeTone).toBe('warning');
    expect(warningPanel.noticeMessage).toContain('当前没有在线合规运力');
  });
});
