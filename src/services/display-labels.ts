import { AuditAction, AuditStatus, CapacityStatus, CargoType, LedgerStatus, LedgerType, PaymentMode, Role } from '@/models';
import type { AirspaceStatus, AuditLog, Claim, Drone, InsurancePolicy } from '@/models';

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

export function paymentModeLabel(mode: PaymentMode | string) {
  const map: Record<string, string> = {
    [PaymentMode.Prepay]: '预付',
    [PaymentMode.Escrow]: '担保支付',
    [PaymentMode.Credit]: '信用支付',
    [PaymentMode.Installment]: '分期支付',
  };
  return map[mode] ?? `${mode}`;
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

export function auditActionLabel(action: AuditAction | string) {
  const map: Record<string, string> = {
    [AuditAction.Login]: '登录',
    [AuditAction.Certification]: '认证',
    [AuditAction.Payment]: '支付',
    [AuditAction.Airspace]: '空域',
    [AuditAction.Insurance]: '保险',
    [AuditAction.Order]: '订单',
    [AuditAction.Withdraw]: '提现',
    [AuditAction.Risk]: '风控',
    wallet: '钱包',
  };
  return map[action] ?? `${action}`;
}

export function auditDetailLabel(detail: string) {
  return detail
    .replace(/Mock provider/g, '演示支付通道')
    .replace(/Mock 空域审批/g, '演示环境空域审批')
    .replace(/mock-insurance/g, '演示保险服务')
    .replace(/Top1/g, '推荐方案')
    .replace(/escrow/g, paymentModeLabel(PaymentMode.Escrow))
    .replace(/prepay/g, paymentModeLabel(PaymentMode.Prepay))
    .replace(/credit/g, paymentModeLabel(PaymentMode.Credit))
    .replace(/installment/g, paymentModeLabel(PaymentMode.Installment))
    .replace(/valuable/g, cargoTypeLabel(CargoType.Valuable))
    .replace(/normal/g, cargoTypeLabel(CargoType.Normal))
    .replace(/dangerous/g, cargoTypeLabel(CargoType.Dangerous))
    .replace(/agricultural/g, cargoTypeLabel(CargoType.Agricultural))
    .replace(/\bpaid\b/g, claimStatusLabel('paid'))
    .replace(/\bassessed\b/g, claimStatusLabel('assessed'))
    .replace(/\binvestigating\b/g, claimStatusLabel('investigating'))
    .replace(/\breported\b/g, claimStatusLabel('reported'))
    .replace(/\barbitration\b/g, claimStatusLabel('arbitration'))
    .replace(/(预付|担保支付|信用支付|分期支付)\s+模式/g, '$1模式')
    .replace(/由\s+演示支付通道\s+受理/g, '由演示支付通道受理');
}

export function auditLogDetailLabel(log: AuditLog) {
  return auditDetailLabel(log.detail);
}

export function droneDisplayName(drone: Pick<Drone, 'brand' | 'model'>) {
  const cleanModel = drone.model
    .replace(/^Cheap$/i, '低保额轻载机 A8')
    .replace(/^Other\s+/i, '')
    .replace(/^DJI FlyCart 30$/i, 'DJI FlyCart 30');
  if (drone.brand === 'Other') return cleanModel;
  return `${drone.brand} ${cleanModel}`;
}
