import { describe, expect, it, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { CargoType, OrderStatus, Role } from '@/models';
import type { AirspaceRequest } from '@/models';
import { createOrder } from '@/models/factory';
import { taskActionForStatus, taskSteps } from '@/services/task-guidance';
import { useTelemetryStore } from '@/stores/telemetry';

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

function airspace(status: AirspaceRequest['status']): AirspaceRequest {
  return {
    id: 'air-test',
    orderId: 'ord-test',
    area: [],
    altitudeM: 120,
    window: { start: '2026-06-07T00:00:00.000Z', end: '2026-06-07T01:00:00.000Z' },
    status,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('task guidance', () => {
  it('已结算是终态动作，不再提示推进', () => {
    const plan = taskActionForStatus(order(OrderStatus.Settled), true);
    expect(plan.terminal).toBe(true);
    expect(plan.primary).toBe('查看结算');
    expect(plan.next).toContain('分账已写入钱包');
    expect(plan.reason).toContain('终态');
  });

  it('安检未完成时阻断放行并给出原因', () => {
    const plan = taskActionForStatus(order(OrderStatus.Preparing), false, airspace('approved'));
    expect(plan.disabled).toBe(true);
    expect(plan.primary).toBe('开始装货');
    expect(plan.reason).toBe('完成 4 项安检后可放行');
  });

  it('空域申请中且未批准时提示等待审批结果', () => {
    const plan = taskActionForStatus(order(OrderStatus.AirspaceApplying), true, airspace('submitted'));
    expect(plan.primary).toBe('刷新审批结果');
    expect(plan.next).toContain('等待 Mock 空域审批结果');
  });

  it('飞行中引导进入卸货，StepFlow 标记当前阶段', () => {
    const plan = taskActionForStatus(order(OrderStatus.InFlight), true);
    expect(plan.primary).toBe('确认卸货');
    expect(plan.next).toContain('持续关注告警');
    const steps = taskSteps(OrderStatus.InFlight);
    expect(steps.find((step) => step.title === '飞行中')?.state).toBe('current');
    expect(steps.find((step) => step.title === '装货中')?.state).toBe('done');
  });

  it('无遥测时注入低电量也会生成 30% 告警帧', () => {
    const telemetry = useTelemetryStore();
    telemetry.injectLowBattery();
    expect(telemetry.latest?.batteryPct).toBe(30);
    expect(telemetry.alerts).toContain('低电量');
  });
});
