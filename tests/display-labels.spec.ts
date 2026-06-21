import { describe, expect, it } from 'vitest';
import { AuditAction, AuditStatus, CapacityStatus, CargoType, LedgerStatus, LedgerType, PaymentMode, Role } from '@/models';
import { auditActionLabel, auditDetailLabel, auditLogDetailLabel, auditStatusLabel, capacityHeatmapAreaLabel, capacityHeatmapLabel, capacityStatusLabel, cargoTypeLabel, claimLiabilityLabel, claimStatusLabel, droneDisplayName, droneStatusLabel, ledgerStatusLabel, ledgerTypeLabel, orderDisplayTitle, paymentModeLabel, policyStatusLabel, roleLabel } from '@/services/display-labels';

describe('display labels', () => {
  it('maps role and cargo enums to Chinese business labels', () => {
    expect(roleLabel(Role.Client)).toBe('业主');
    expect(roleLabel(Role.Pilot)).toBe('飞手');
    expect(roleLabel(Role.Owner)).toBe('机主');
    expect(roleLabel(Role.Admin)).toBe('后台');
    expect(cargoTypeLabel(CargoType.Normal)).toBe('普货');
    expect(cargoTypeLabel(CargoType.Valuable)).toBe('贵重货物');
    expect(cargoTypeLabel(CargoType.Dangerous)).toBe('危险品');
    expect(cargoTypeLabel(CargoType.Agricultural)).toBe('农资');
  });

  it('maps compliance, drone and capacity statuses', () => {
    expect(auditStatusLabel(AuditStatus.Approved)).toBe('已通过');
    expect(auditStatusLabel(AuditStatus.Pending)).toBe('待审核');
    expect(auditStatusLabel(AuditStatus.Rejected)).toBe('已驳回');
    expect(auditStatusLabel(AuditStatus.Expired)).toBe('已过期');
    expect(droneStatusLabel('idle')).toBe('空闲可投放');
    expect(droneStatusLabel('busy')).toBe('执行中');
    expect(droneStatusLabel('maintenance')).toBe('维护中');
    expect(capacityStatusLabel(CapacityStatus.Online)).toBe('在线可接');
    expect(capacityStatusLabel(CapacityStatus.Busy)).toBe('任务忙碌');
    expect(capacityStatusLabel(CapacityStatus.Offline)).toBe('已下线');
  });

  it('maps insurance, claim and wallet statuses', () => {
    expect(policyStatusLabel('active')).toBe('保障中');
    expect(policyStatusLabel('claiming')).toBe('理赔中');
    expect(policyStatusLabel('closed')).toBe('已关闭');
    expect(claimStatusLabel('reported')).toBe('已报案');
    expect(claimStatusLabel('investigating')).toBe('调查中');
    expect(claimStatusLabel('assessed')).toBe('已定责');
    expect(claimStatusLabel('paid')).toBe('已赔付');
    expect(claimStatusLabel('arbitration')).toBe('仲裁中');
    expect(ledgerStatusLabel(LedgerStatus.Pending)).toBe('待结算');
    expect(ledgerStatusLabel(LedgerStatus.Available)).toBe('可提现');
    expect(ledgerStatusLabel(LedgerStatus.Paid)).toBe('已支付');
    expect(ledgerTypeLabel(LedgerType.SettleIn)).toBe('结算入账');
  });

  it('sanitizes audit logs and device names for user-facing display', () => {
    expect(auditActionLabel(AuditAction.Order)).toBe('订单');
    expect(auditActionLabel(AuditAction.Payment)).toBe('支付');
    expect(auditActionLabel(AuditAction.Airspace)).toBe('空域');
    expect(auditActionLabel(AuditAction.Certification)).toBe('认证');
    expect(auditActionLabel(AuditAction.Settlement)).toBe('结算');
    expect(paymentModeLabel(PaymentMode.Escrow)).toBe('担保支付');
    expect(auditDetailLabel('Mock 空域审批通过')).toBe('演示环境空域审批通过');
    expect(auditDetailLabel('escrow 模式预支付已由 Mock provider 受理')).toBe('担保支付模式预支付已由演示支付通道受理');
    expect(auditDetailLabel('发布valuable吊运订单')).toBe('发布贵重货物吊运订单');
    expect(auditLogDetailLabel({ id: 'log', at: '', action: AuditAction.Payment, actorId: 'u', actorRole: Role.Client, targetType: 'order', detail: '理赔流转到 paid' })).toBe('理赔流转到 已赔付');
    expect(droneDisplayName({ brand: 'Other', model: 'Cheap' })).toBe('低保额轻载机 A8');
    expect(droneDisplayName({ brand: 'Other', model: 'DJI FlyCart 30' })).toBe('DJI FlyCart 30');
  });

  it('sanitizes legacy claim liability, order fallback and heatmap labels', () => {
    expect(claimLiabilityLabel('平台仲裁 + Mock 保险定损')).toBe('平台仲裁 + 演示保险定损');
    expect(claimLiabilityLabel('o_legacy_1234')).toBe('关联订单已记录');
    expect(claimLiabilityLabel()).toBe('关联订单已记录，等待责任认定');
    expect(orderDisplayTitle({ cargo: { type: CargoType.Normal, weightKg: 1, valueCent: 100, photos: [] }, from: { lng: 1, lat: 2, address: '北京低空货运中心' } })).toBe('北京低空货运中心订单');
    expect(capacityHeatmapLabel({ id: 'cap_Uhm90Vqv', location: { lng: 1, lat: 2 } }, 0)).toBe('合规运力1');
    expect(capacityHeatmapLabel({ id: 'cap1', location: { lng: 1, lat: 2 } }, 1, { brand: 'DJI', model: 'FlyCart 30' }, { nickname: '飞手1' })).toBe('DJI FlyCart 30 · 飞手1');
    expect(capacityHeatmapAreaLabel({ location: { lng: 1, lat: 2, address: '订单起点附近演示运力1' } }, 0)).toBe('起点周边 1 号机位');
    expect(capacityHeatmapAreaLabel({ location: { lng: 1, lat: 2, address: '经纬度点 113.12000, 23.02000' } }, 2)).toBe('低空走廊 3 号机位');
  });
});
