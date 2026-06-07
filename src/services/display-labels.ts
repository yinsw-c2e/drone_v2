import { AuditStatus, CapacityStatus, CargoType, LedgerStatus, LedgerType, Role } from '@/models';
import type { AirspaceStatus, Drone, InsurancePolicy, Claim } from '@/models';

export function roleLabel(role: Role | string) {
  const map: Record<string, string> = {
    [Role.Client]: '业主',
    [Role.Pilot]: '飞手',
    [Role.Owner]: '机主',
    [Role.Admin]: '后台',
  };
  return map[role] ?? `${role}`;
}

export function cargoTypeLabel(type: CargoType | string) {
  const map: Record<string, string> = {
    [CargoType.Normal]: '普货',
    [CargoType.Valuable]: '贵重货物',
    [CargoType.Dangerous]: '危险品',
    [CargoType.Agricultural]: '农资',
  };
  return map[type] ?? `${type}`;
}

export function auditStatusLabel(status: AuditStatus | string) {
  const map: Record<string, string> = {
    [AuditStatus.Pending]: '待审核',
    [AuditStatus.Approved]: '已通过',
    [AuditStatus.Rejected]: '已驳回',
    [AuditStatus.Expired]: '已过期',
    none: '未提交',
  };
  return map[status] ?? `${status}`;
}

export function capacityStatusLabel(status: CapacityStatus | string) {
  const map: Record<string, string> = {
    [CapacityStatus.Online]: '在线可接',
    [CapacityStatus.Busy]: '任务忙碌',
    [CapacityStatus.Offline]: '已下线',
  };
  return map[status] ?? `${status}`;
}

export function droneStatusLabel(status: Drone['status'] | string) {
  const map: Record<string, string> = {
    idle: '空闲可投放',
    busy: '执行中',
    maintenance: '维护中',
    offline: '已下线',
  };
  return map[status] ?? `${status}`;
}

export function policyStatusLabel(status: InsurancePolicy['status'] | string) {
  const map: Record<string, string> = {
    active: '保障中',
    claiming: '理赔中',
    closed: '已关闭',
    expired: '已过期',
    cancelled: '已取消',
  };
  return map[status] ?? `${status}`;
}

export function claimStatusLabel(status: Claim['status'] | string) {
  const map: Record<string, string> = {
    reported: '已报案',
    investigating: '调查中',
    assessed: '已定责',
    paid: '已赔付',
    arbitration: '仲裁中',
  };
  return map[status] ?? `${status}`;
}

export function ledgerStatusLabel(status: LedgerStatus | string) {
  const map: Record<string, string> = {
    [LedgerStatus.Pending]: '待结算',
    [LedgerStatus.Available]: '可提现',
    [LedgerStatus.Paid]: '已支付',
  };
  return map[status] ?? `${status}`;
}

export function ledgerTypeLabel(type: LedgerType | string) {
  const map: Record<string, string> = {
    [LedgerType.SettleIn]: '结算入账',
    [LedgerType.Withdraw]: '提现',
    [LedgerType.Refund]: '退款',
    [LedgerType.Bonus]: '奖励',
  };
  return map[type] ?? `${type}`;
}

export function airspaceStatusLabel(status: AirspaceStatus | string) {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    approved: '已批准',
    rejected: '已驳回',
  };
  return map[status] ?? `${status}`;
}
