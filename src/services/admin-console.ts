import { AuditAction, AuditStatus, OrderStatus, PaymentMode, Role } from '@/models';
import type { AirspaceRequest, CertificationApplication, Claim, Order, PilotProfile, User } from '@/models';
import { confirmOrderRemote, decideAirspaceRemote, fetchCandidatesRemote, isProductionBackendRequired } from '@/api/backend';
import { providers } from '@/api/providers';
import {
  advanceClaim,
  analyticsReport,
  approveCertification,
  approvePilotQualification,
  candidatesForOrder,
  confirmCandidate,
  dashboardMetrics,
  decideAirspace,
  ordersNewestFirst,
  rejectCertification,
  rejectPilotQualification,
  setUserBlacklist,
} from '@/services/app-flow';
import {
  auditActionLabel,
  auditLogDetailLabel,
  auditStatusLabel,
  cargoTypeLabel,
  claimStatusLabel,
  droneDisplayName,
  orderDisplayTitle,
  orderStatusLabel,
  roleLabel,
} from '@/services/display-labels';
import { isGenericMapAddress } from '@/services/geocoding';
import { repo } from '@/utils/repo';

export type AdminModuleKey = 'dashboard' | 'certifications' | 'orders' | 'risk' | 'reports' | 'audit';
export type AdminTone = 'normal' | 'success' | 'warning' | 'danger' | 'muted';

export interface AdminNavItem {
  key: AdminModuleKey;
  label: string;
  icon: string;
  route: string;
  active: boolean;
  badge?: string;
}

export interface AdminCertificationField {
  label: string;
  value: string;
}

export interface AdminCertificationRow {
  id: string;
  code: string;
  kind: 'application' | 'pilot';
  sourceId: string;
  userId: string;
  userName: string;
  roleLabel: string;
  statusLabel: string;
  submittedAt: string;
  waitLabel: string;
  tone: AdminTone;
  title: string;
  description: string;
  fields: AdminCertificationField[];
}

export interface AdminOrderEventRow {
  at: string;
  status: string;
  note: string;
}

export interface AdminOrderRow {
  id: string;
  code: string;
  title: string;
  route: string;
  status: OrderStatus;
  statusLabel: string;
  tone: AdminTone;
  cargoLabel: string;
  budgetLabel: string;
  priceLabel: string;
  pilotLabel: string;
  droneLabel: string;
  ownerLabel: string;
  latestEvent: string;
  createdAt: string;
  actionLabel: string;
  canAdvance: boolean;
  events: AdminOrderEventRow[];
}

export interface AdminRiskRow {
  id: string;
  code: string;
  sourceType: 'order' | 'claim' | 'user';
  sourceId: string;
  title: string;
  description: string;
  statusLabel: string;
  tone: AdminTone;
  actionLabel: string;
  detailLines: string[];
}

export interface AdminAuditRow {
  id: string;
  action: AuditAction;
  actionLabel: string;
  actorLabel: string;
  targetLabel: string;
  detail: string;
  time: string;
}

const modules: Array<Omit<AdminNavItem, 'active' | 'badge'>> = [
  { key: 'dashboard', label: '运营工作台', icon: 'dashboard', route: '/pages-admin/dashboard/index' },
  { key: 'certifications', label: '认证审核', icon: 'fact_check', route: '/pages-admin/certifications/index' },
  { key: 'orders', label: '订单管理', icon: 'local_shipping', route: '/pages-admin/orders/index' },
  { key: 'risk', label: '风控理赔', icon: 'security', route: '/pages-admin/risk/index' },
  { key: 'reports', label: '报表建议', icon: 'analytics', route: '/pages-admin/reports/index' },
  { key: 'audit', label: '审计日志', icon: 'history', route: '/pages-admin/audit/index' },
];

const terminalOrderStatuses = [OrderStatus.Settled, OrderStatus.Cancelled, OrderStatus.Exception];
export function adminMetrics() {
  return dashboardMetrics();
}

export function adminReport() {
  return analyticsReport();
}

export function adminNavItems(activeKey: AdminModuleKey): AdminNavItem[] {
  const metrics = dashboardMetrics();
  const report = analyticsReport();
  const activeOrders = repo.orders.where((order) => !terminalOrderStatuses.includes(order.status)).length;
  const badges: Partial<Record<AdminModuleKey, string | undefined>> = {
    certifications: formatBadge(adminCertificationRows().length),
    orders: formatBadge(activeOrders),
    risk: formatBadge(adminRiskRows().length),
    reports: formatBadge(report.suggestions.length),
    audit: formatBadge(repo.auditLogs.all().length),
    dashboard: undefined,
  };
  if (metrics.orderCount === 0) badges.orders = undefined;
  return modules.map((item) => ({
    ...item,
    active: item.key === activeKey,
    badge: badges[item.key],
  }));
}

export function adminModuleRouteByLabel(label: string) {
  return modules.find((item) => item.label === label)?.route;
}

export function adminModuleRoute(key: AdminModuleKey) {
  return modules.find((item) => item.key === key)?.route ?? modules[0].route;
}

export function adminCertificationRows(): AdminCertificationRow[] {
  const pendingApps = repo.authApplications.where((app) => app.status === AuditStatus.Pending);
  const appUserIds = new Set(pendingApps.map((app) => app.userId));
  const profileRows = repo.pilots
    .where((pilot) => !appUserIds.has(pilot.userId) && (pilot.noCrimeProof === AuditStatus.Pending || pilot.healthProof === AuditStatus.Pending))
    .map(pilotCertificationRow);
  return [...pendingApps.map(applicationCertificationRow), ...profileRows].sort((a, b) => toneRank(b.tone) - toneRank(a.tone));
}

export function approveAdminCertification(row: AdminCertificationRow) {
  if (row.kind === 'application') return approveCertification(row.sourceId);
  approvePilotQualification(row.sourceId);
  return undefined;
}

export function rejectAdminCertification(row: AdminCertificationRow) {
  if (row.kind === 'application') return rejectCertification(row.sourceId);
  rejectPilotQualification(row.sourceId);
  return undefined;
}

export function adminOrderRows(): AdminOrderRow[] {
  return ordersNewestFirst(repo.orders.all()).map(orderRow);
}

export async function advanceAdminOrder(orderId: string): Promise<Order> {
  const order = repo.orders.find(orderId);
  if (!order) throw new Error('订单不存在');
  if (order.status === OrderStatus.Matching) {
    if (isProductionBackendRequired()) {
      throw new Error('请由业主完成保险、支付和运力确认后再继续');
    }
    const remoteCandidates = await fetchCandidatesRemote(order.id, 'global');
    const candidate = remoteCandidates?.[0] ?? candidatesForOrder(order.id)[0];
    if (!candidate) throw new Error('当前没有在线合规运力，无法锁定推荐方案');
    await providers.insurance.quote(order.id, order.cargo.valueCent);
    await providers.payment.prepay(order.id, candidate.quoteCent, order.paymentMode ?? PaymentMode.Escrow, candidate.capacityId);
    const remote = await confirmOrderRemote(order.id, candidate.capacityId);
    if (remote) return remote;
    return confirmCandidate(order.id, candidate);
  }
  if (order.status === OrderStatus.AirspaceApplying) {
    const airspace = repo.airspace.where((item) => item.orderId === order.id)[0];
    if (airspace?.status !== 'approved') {
      const remote = await decideAirspaceRemote(order.id, 'approved');
      if (remote?.order) return remote.order;
      decideAirspace(order.id, 'approved');
      return repo.orders.find(order.id)!;
    }
    throw new Error('空域已批准，请由飞手进入准备');
  }
  throw new Error(adminOrderBlockedReason(order.status));
}

export function adminRiskRows(): AdminRiskRow[] {
  const exceptionRows = repo.orders.where((order) => order.status === OrderStatus.Exception).map(orderRiskRow);
  const claimRows = repo.claims.where((claim) => claim.status !== 'paid').map(claimRiskRow);
  const blacklistRows = repo.users.where((user) => Boolean(user.blacklisted)).map(userRiskRow);
  return [...exceptionRows, ...claimRows, ...blacklistRows];
}

export function runAdminRiskAction(row: AdminRiskRow) {
  if (row.sourceType === 'claim') return advanceClaim(row.sourceId);
  if (row.sourceType === 'user') return setUserBlacklist(row.sourceId, false);
  return repo.orders.find(row.sourceId);
}

export function adminAuditRows(): AdminAuditRow[] {
  return repo.auditLogs.all().slice().sort((a, b) => auditTimeMs(b.at) - auditTimeMs(a.at)).map((log) => ({
    id: log.id,
    action: log.action,
    actionLabel: auditActionLabel(log.action),
    actorLabel: `${roleLabel(log.actorRole)} · ${log.actorId}`,
    targetLabel: auditTargetLabel(log.targetType, log.targetId),
    detail: auditLogDetailLabel(log),
    time: formatDateTime(log.at),
  }));
}

function auditTargetLabel(targetType: string, targetId?: string) {
  const base = `${targetType}${targetId ? ` · ${targetId}` : ''}`;
  if (!targetId) return base;
  const orderId = relatedAuditOrderId(targetType, targetId);
  if (!orderId) return base;
  return `${base} / 关联订单 · ${orderId.toUpperCase()}`;
}

function relatedAuditOrderId(targetType: string, targetId: string) {
  if (targetType === 'order') return targetId;
  if (targetType === 'airspace') return repo.airspace.find(targetId)?.orderId;
  if (targetType === 'claim') return repo.claims.find(targetId)?.orderId;
  const policy = targetType === 'policy' ? repo.policies.find(targetId) : undefined;
  return policy?.orderId;
}

function auditTimeMs(iso?: string) {
  const time = iso ? Date.parse(iso) : 0;
  return Number.isFinite(time) ? time : 0;
}

export function formatMoneyCent(value?: number) {
  return `¥${((value ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDateTime(iso?: string) {
  if (!iso) return '未记录';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '未记录';
  return `${date.getMonth() + 1}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function agoLabel(iso?: string) {
  if (!iso) return 'unknown';
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return 'unknown';
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatBadge(value: number) {
  return value ? String(value) : undefined;
}

function toneRank(tone: AdminTone) {
  return tone === 'danger' ? 4 : tone === 'warning' ? 3 : tone === 'success' ? 2 : tone === 'normal' ? 1 : 0;
}

function applicationCertificationRow(app: CertificationApplication): AdminCertificationRow {
  const user = repo.users.find(app.userId);
  const realName = stringField(app.fields.realName);
  const minutes = Math.max(0, Math.round((Date.now() - new Date(app.submittedAt).getTime()) / 60000));
  const tone: AdminTone = minutes >= 60 ? 'danger' : app.role === Role.Owner ? 'warning' : 'normal';
  return {
    id: app.id,
    code: app.id.toUpperCase(),
    kind: 'application',
    sourceId: app.id,
    userId: app.userId,
    userName: realName || user?.nickname || app.userId,
    roleLabel: roleLabel(app.role),
    statusLabel: auditStatusLabel(app.status),
    submittedAt: formatDateTime(app.submittedAt),
    waitLabel: agoLabel(app.submittedAt),
    tone,
    title: `${roleLabel(app.role)}认证申请`,
    description: `${realName || user?.nickname || app.userId} 提交三方认证材料`,
    fields: certificationFields(app.fields),
  };
}

function pilotCertificationRow(pilot: PilotProfile): AdminCertificationRow {
  const user = repo.users.find(pilot.userId);
  return {
    id: pilot.userId,
    code: pilot.userId.toUpperCase(),
    kind: 'pilot',
    sourceId: pilot.userId,
    userId: pilot.userId,
    userName: user?.nickname ?? pilot.userId,
    roleLabel: roleLabel(Role.Pilot),
    statusLabel: '资料待复核',
    submittedAt: 'profile',
    waitLabel: 'profile',
    tone: 'warning',
    title: '飞手资质复核',
    description: `${user?.nickname ?? pilot.userId} 无犯罪记录或体检证明待复核`,
    fields: [
      { label: 'CAAC 等级', value: pilot.caacLevel },
      { label: '无犯罪记录', value: auditStatusLabel(pilot.noCrimeProof) },
      { label: '体检证明', value: auditStatusLabel(pilot.healthProof) },
      { label: '训练证书', value: pilot.trainingCerts.join('、') || '未上传' },
    ],
  };
}

function certificationFields(fields: CertificationApplication['fields']): AdminCertificationField[] {
  return Object.entries(fields).slice(0, 6).map(([key, value]) => ({
    label: certificationFieldLabel(key),
    value: Array.isArray(value) ? value.join('、') : String(value || '未填写'),
  }));
}

function certificationFieldLabel(key: string) {
  const map: Record<string, string> = {
    realName: '实名',
    caacLevel: 'CAAC 等级',
    noCrimeProof: '无犯罪记录',
    healthProof: '体检证明',
    trainingCerts: '训练证书',
    droneModel: '设备型号',
    droneSn: '设备 SN',
    insuranceAmount: '三者险保额',
    maintenance: '维护记录',
    idNo: '证件号',
    cargoDeclaration: '货物申报',
  };
  return map[key] ?? key;
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function orderRow(order: Order): AdminOrderRow {
  const pilot = order.pilotId ? repo.users.find(order.pilotId) : undefined;
  const drone = order.droneId ? repo.drones.find(order.droneId) : undefined;
  const capacity = order.capacityId ? repo.capacity.find(order.capacityId) : undefined;
  const owner = capacity ? repo.users.find(capacity.ownerId) : undefined;
  const airspace = repo.airspace.where((item) => item.orderId === order.id)[0];
  const latest = order.events[order.events.length - 1];
  return {
    id: order.id,
    code: order.id.toUpperCase(),
    title: orderDisplayTitle(order),
    route: adminRouteLabel(order),
    status: order.status,
    statusLabel: adminOrderStatusLabel(order.status, airspace),
    tone: orderTone(order.status, airspace),
    cargoLabel: cargoTypeLabel(order.cargo.type),
    budgetLabel: formatMoneyCent(order.budgetCent),
    priceLabel: order.priceBreakdown ? formatMoneyCent(order.priceBreakdown.totalCent) : '未锁价',
    pilotLabel: pilot?.nickname ?? '未指派',
    droneLabel: drone ? droneDisplayName(drone) : '未指派',
    ownerLabel: owner?.nickname ?? '未指派',
    latestEvent: latest ? latestOrderEventLabel(order, airspace, latest) : '暂无事件',
    createdAt: formatDateTime(order.createdAt),
    actionLabel: orderActionLabel(order.status, airspace),
    canAdvance: canOperateOrder(order, airspace),
    events: order.events.map((event) => ({
      at: formatDateTime(event.at),
      status: adminOrderEventStatusLabel(event),
      note: event.note ?? '状态更新',
    })),
  };
}

function adminRouteLabel(order: Order) {
  return `${adminPointLabel(order.from.address, '订单起点')} -> ${adminPointLabel(order.to.address, '订单终点')}`;
}

function adminPointLabel(address: string | undefined, fallback: string) {
  const value = address?.trim();
  if (!value || isGenericMapAddress(value)) return fallback;
  return value;
}

function latestOrderEventLabel(order: Order, airspace: AirspaceRequest | undefined, latest: Order['events'][number]) {
  if (order.status === OrderStatus.AirspaceApplying && airspace?.status === 'approved') {
    return `${adminOrderStatusLabel(order.status, airspace)} · 空域审批通过`;
  }
  if (order.status === OrderStatus.AirspaceApplying && airspace?.status === 'rejected') {
    return `${adminOrderStatusLabel(order.status, airspace)} · 空域审批驳回`;
  }
  return `${adminOrderStatusLabel(latest.status, airspace)} · ${latest.note ?? '状态更新'}`;
}

function adminOrderStatusLabel(status: OrderStatus, airspace?: AirspaceRequest) {
  if (status === OrderStatus.AirspaceApplying && airspace?.status === 'approved') return '空域已批准';
  if (status === OrderStatus.AirspaceApplying && airspace?.status === 'rejected') return '空域被驳回';
  return orderStatusLabel(status);
}

function adminOrderEventStatusLabel(event: Order['events'][number]) {
  if (event.status === OrderStatus.AirspaceApplying && event.note === '空域审批通过') return '空域已批准';
  if (event.status === OrderStatus.AirspaceApplying && event.note === '空域审批驳回') return '空域被驳回';
  return orderStatusLabel(event.status);
}

function orderTone(status: OrderStatus, airspace?: AirspaceRequest): AdminTone {
  if (status === OrderStatus.Exception || status === OrderStatus.Cancelled) return 'danger';
  if (status === OrderStatus.AirspaceApplying && airspace?.status === 'approved') return 'success';
  if (status === OrderStatus.AirspaceApplying && airspace?.status === 'rejected') return 'danger';
  if (status === OrderStatus.AirspaceApplying || status === OrderStatus.Preparing) return 'warning';
  if (status === OrderStatus.Completed || status === OrderStatus.Settled) return 'success';
  if (status === OrderStatus.Created) return 'muted';
  return 'normal';
}

function orderActionLabel(status: OrderStatus, airspace?: AirspaceRequest) {
  const map: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.Matching]: '锁定推荐运力',
    [OrderStatus.Confirmed]: '请由飞手提交空域申请',
    [OrderStatus.AirspaceApplying]: airspace?.status === 'approved' ? '待飞手进入准备' : '通过空域审批',
    [OrderStatus.Preparing]: '待飞手开始装货',
    [OrderStatus.Loading]: '待飞手起飞执行',
    [OrderStatus.InFlight]: '飞行执行中',
    [OrderStatus.Unloading]: '待飞手完成任务',
    [OrderStatus.Completed]: '待生成结算',
  };
  return map[status] ?? '查看详情';
}

function canOperateOrder(order: Order, airspace?: AirspaceRequest) {
  if (order.status === OrderStatus.Matching) return true;
  if (order.status === OrderStatus.AirspaceApplying) return airspace?.status !== 'approved';
  return false;
}

function adminOrderBlockedReason(status: OrderStatus) {
  const map: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.Confirmed]: '请由飞手提交空域申请',
    [OrderStatus.Preparing]: '执行阶段由飞手推进，请在飞手端开始装货',
    [OrderStatus.Loading]: '执行阶段由飞手推进，请在飞手端起飞执行',
    [OrderStatus.InFlight]: '飞行阶段由飞手推进，请在飞手端确认卸货',
    [OrderStatus.Unloading]: '卸货阶段由飞手推进，请在飞手端完成任务',
    [OrderStatus.Completed]: '任务已完成，请按结算流程处理',
    [OrderStatus.Settled]: '订单已结算',
    [OrderStatus.Cancelled]: '订单已取消',
    [OrderStatus.Exception]: '订单已进入异常处理',
  };
  return map[status] ?? '后台只能锁定运力和审批空域';
}

function orderRiskRow(order: Order): AdminRiskRow {
  return {
    id: order.id,
    code: order.id.toUpperCase(),
    sourceType: 'order',
    sourceId: order.id,
    title: '异常运单',
    description: `${orderDisplayTitle(order)} · ${adminRouteLabel(order)}`,
    statusLabel: orderStatusLabel(order.status),
    tone: 'danger',
    actionLabel: '查看事件',
    detailLines: order.events.slice(-5).map((event) => `${formatDateTime(event.at)} ${orderStatusLabel(event.status)} · ${event.note ?? '状态更新'}`),
  };
}

function claimRiskRow(claim: Claim): AdminRiskRow {
  const order = repo.orders.find(claim.orderId);
  return {
    id: claim.id,
    code: claim.id.toUpperCase(),
    sourceType: 'claim',
    sourceId: claim.id,
    title: '理赔工单',
    description: `${order?.id.toUpperCase() ?? claim.orderId} · ${claim.evidence.join('、') || '已提交事故证据'}`,
    statusLabel: claimStatusLabel(claim.status),
    tone: claim.status === 'arbitration' ? 'danger' : 'warning',
    actionLabel: claim.status === 'paid' ? '查看赔付' : '推进理赔',
    detailLines: [
      `关联订单：${order?.id.toUpperCase() ?? claim.orderId}`,
      `报案时间：${formatDateTime(claim.reportedAt)}`,
      `责任认定：${claim.liability || '等待定责'}`,
      `预计赔付：${formatMoneyCent(claim.payoutCent)}`,
    ],
  };
}

function userRiskRow(user: User): AdminRiskRow {
  return {
    id: user.id,
    code: user.id.toUpperCase(),
    sourceType: 'user',
    sourceId: user.id,
    title: '黑名单用户',
    description: `${user.nickname} · ${user.phone}`,
    statusLabel: '已限制发单/接单',
    tone: 'danger',
    actionLabel: '移出黑名单',
    detailLines: [`角色：${user.roles.map(roleLabel).join('、')}`, `当前身份：${roleLabel(user.currentRole)}`],
  };
}
