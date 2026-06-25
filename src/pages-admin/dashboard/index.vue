<template>
  <view class="op-console">
    <view class="topbar">
      <view class="brand-cluster">
        <StitchIcon class="brand-icon" name="public" size="28px" fill />
        <text class="brand-title">SkyLink Logistics</text>
        <text class="version-chip">OP-CONSOLE / V2.4</text>
      </view>

      <view class="operator-cluster">
        <view class="top-icon" hover-class="tap-press" @click="showNotifications">
          <StitchIcon name="notifications" size="28px" />
          <view class="alert-dot" />
        </view>
        <view class="top-icon" hover-class="tap-press" @click="showSettings">
          <StitchIcon name="settings" size="28px" />
        </view>
        <view class="operator-divider" />
        <view class="operator-card" hover-class="tap-press" @click="showOperator">
          <image class="operator-avatar" src="/static/stitch/op-console-avatar.png" mode="aspectFill" />
          <view class="operator-copy">
            <text class="operator-id">OP-LEAD-01</text>
            <text class="operator-state">Active</text>
          </view>
        </view>
      </view>
    </view>

    <AdminConsolePanels ref="panels" @changed="bumpRefresh" />

    <view class="side-rail">
      <text class="rail-label">MODULES</text>
      <view
        v-for="item in navModules"
        :key="item.label"
        :class="['rail-item', item.active ? 'active' : '']"
        hover-class="tap-press"
        @click="openModule(item.label)"
      >
        <StitchIcon :name="item.icon" size="29px" :fill="item.active" />
        <text>{{ item.label }}</text>
        <text v-if="item.badge" class="rail-badge">{{ item.badge }}</text>
      </view>

      <view class="system-card" hover-class="tap-press" @click="showSystemHealth">
        <view class="system-head">
          <StitchIcon name="wifi" size="18px" />
          <text>SYSTEM ONLINE</text>
        </view>
        <text class="system-line">ORDERS: {{ metrics.orderCount }}</text>
        <text class="system-line">CAPACITY: {{ metrics.onlineCapacity }}</text>
      </view>
    </view>

    <scroll-view class="main-scroll" scroll-y>
      <view class="grid-layer" />
      <view class="main-content">
        <view class="page-head">
          <view>
            <text class="page-title">运营总览</text>
            <text class="page-subtitle">全局监控与实时作战指挥中心</text>
          </view>
          <view class="head-actions">
            <view class="outline-action" hover-class="tap-press" @click="exportReport">
              <StitchIcon name="download" size="20px" />
              <text>导出报表</text>
            </view>
            <view class="primary-action" hover-class="tap-press" @click="runFlow">
              <StitchIcon name="play_arrow" size="20px" fill />
              <text>流程演练</text>
            </view>
          </view>
        </view>

        <view :class="['flow-feedback', flowPanel.noticeTone]">
          <view class="flow-feedback-main">
            <StitchIcon :name="flowPanel.noticeTone === 'success' ? 'check_circle' : flowPanel.noticeTone === 'warning' ? 'warning' : flowPanel.noticeTone === 'danger' ? 'error' : 'info'" size="20px" />
            <view>
              <text class="flow-feedback-title">流程演练</text>
              <text class="flow-feedback-copy">{{ flowPanel.noticeMessage || flowPanel.description }}</text>
            </view>
          </view>
        </view>

        <view class="kpi-grid">
          <view v-for="card in kpiCards" :key="card.label" class="kpi-card" hover-class="tap-press" @click="showToast(card.feedback)">
            <view class="kpi-top">
              <text>{{ card.label }}</text>
              <view v-if="card.icon === 'warning'" :class="['warn-mark', 'small', card.iconTone]"><text>!</text></view>
              <StitchIcon v-else :class="card.iconTone" :name="card.icon" size="20px" />
            </view>
            <text :class="['kpi-value', card.tone]">{{ card.value }}</text>
            <view v-if="card.progress" class="kpi-progress">
              <view class="kpi-progress-fill" :style="{ width: card.progress }" />
            </view>
            <view v-else-if="card.footIcon" class="kpi-foot">
              <StitchIcon :name="card.footIcon" size="16px" />
              <text :class="card.footTone">{{ card.footMain }}</text>
              <text class="foot-muted">{{ card.footSub }}</text>
            </view>
          </view>
        </view>

        <view class="dashboard-grid">
          <view class="left-column">
            <view class="map-card">
              <view class="map-visual" :style="mapVisualStyle">
                <image class="map-asset" src="/static/stitch/global-distribution-clean.png" mode="aspectFill" />
                <view class="map-shade" />
              </view>

              <view class="map-title-band">
                <text>LOW-ALTITUDE COMMAND CENTER</text>
                <text>GLOBAL DRONE FLEET DISTRIBUTION & LIVE TRACKING</text>
              </view>

              <view class="fleet-total fleet-total-top">
                <text>TOTAL DRONES:</text>
                <text>{{ totalCapacityLabel }}</text>
              </view>

              <view class="fleet-total fleet-total-bottom">
                <text>TOTAL DRONES:</text>
                <text>{{ totalCapacityLabel }}</text>
              </view>

              <view class="map-controls">
                <view hover-class="tap-press" @click="setMapZoom(1)">
                  <StitchIcon name="add" size="22px" />
                </view>
                <view hover-class="tap-press" @click="setMapZoom(-1)">
                  <StitchIcon name="remove" size="22px" />
                </view>
              </view>
            </view>

            <view class="chart-card">
              <view class="chart-head">
                <text>{{ chartTitle }}</text>
                <view class="range-tabs">
                  <view :class="{ active: activeRange === '1H' }" hover-class="tap-press" @click="selectRange('1H')">1H</view>
                  <view :class="{ active: activeRange === '24H' }" hover-class="tap-press" @click="selectRange('24H')">24H</view>
                  <view :class="{ active: activeRange === '7D' }" hover-class="tap-press" @click="selectRange('7D')">7D</view>
                </view>
              </view>
              <view class="chart-body">
                <view class="y-axis">
                  <text>4k</text>
                  <text>3k</text>
                  <text>2k</text>
                  <text>1k</text>
                </view>
                <view class="chart-grid">
                  <view class="grid-line" />
                  <view class="grid-line" />
                  <view class="grid-line" />
                  <view class="grid-line" />
                  <view class="bars">
                    <view
                      v-for="bar in chartBars"
                      :key="bar.key"
                      :class="['bar', bar.hot ? 'hot' : '']"
                      :style="{ height: bar.height }"
                      @click="showToast(`${bar.key}: ${bar.count} 单`)"
                    />
                  </view>
                </view>
                <view class="x-axis">
                  <text v-for="label in chartAxisLabels" :key="label">{{ label }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="right-column">
            <view class="queue-card">
              <view class="panel-head">
                <view class="panel-title">
                  <StitchIcon name="fact_check" size="24px" />
                  <text>实时认证审核队列</text>
                </view>
                <text class="queue-count">{{ queueCountLabel }}</text>
              </view>

              <view class="queue-list">
                <view v-if="!queueRows.length" class="queue-row">
                  <view class="queue-line">
                    <view class="queue-dot muted" />
                    <text class="queue-id">QUEUE CLEAR</text>
                    <text class="queue-time">now</text>
                  </view>
                  <text class="queue-desc">暂无待审核认证申请</text>
                </view>
                <view v-for="item in queueRows" :key="item.id" class="queue-row" hover-class="tap-press" @click="reviewQueue(item)">
                  <view class="queue-line">
                    <view :class="['queue-dot', item.tone]" />
                    <text class="queue-id">{{ item.id }}</text>
                    <text class="queue-time">{{ item.time }}</text>
                  </view>
                  <text class="queue-desc">{{ item.desc }}</text>
                  <view v-if="item.tone !== 'muted'" class="queue-actions">
                    <view hover-class="tap-press" @click="rejectQueue(item)">驳回</view>
                    <view hover-class="tap-press" @click="reviewQueue(item)">审查资料</view>
                  </view>
                </view>
              </view>

              <view class="queue-footer" hover-class="tap-press" @click="openAuthCenter">VIEW ALL QUEUES ({{ queueRows.length }})</view>
            </view>

            <view class="risk-card">
              <view class="risk-head">
                <StitchIcon name="local_shipping" size="24px" />
                <text>高危运单监控</text>
              </view>
              <view class="risk-list">
                <view v-if="!riskOrders.length" class="risk-row">
                  <view class="risk-icon muted">
                    <StitchIcon name="check_circle" size="26px" />
                  </view>
                  <view class="risk-copy">
                    <text>NO-RISK</text>
                    <text>当前无异常订单或理赔仲裁</text>
                  </view>
                  <view class="risk-action" hover-class="tap-press" @click="showToast('风险队列为空')">刷新</view>
                </view>
                <view v-for="item in riskOrders" :key="item.id" class="risk-row">
                  <view :class="['risk-icon', item.tone]">
                    <view v-if="item.icon === 'warning'" class="warn-mark"><text>!</text></view>
                    <StitchIcon v-else :name="item.icon" size="26px" />
                  </view>
                  <view class="risk-copy">
                    <text>{{ item.id }}</text>
                    <text>{{ item.desc }}</text>
                  </view>
                  <view class="risk-action" hover-class="tap-press" @click="handleRiskAction(item)">{{ item.action }}</view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AdminConsolePanels from '@/components/AdminConsolePanels.vue';
import type { ConsolePanelKey } from '@/components/AdminConsolePanels.vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { AuditStatus, OrderStatus, Role } from '@/models';
import type { CertificationApplication, Claim, Order } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { adminRunFlowAction, adminRunFlowPanel } from '@/services/action-plans';
import type { AdminRunFlowFeedback } from '@/services/action-plans';
import {
  advanceClaim,
  analyticsReport,
  approveCertification,
  approvePilotQualification,
  dashboardMetrics,
  rejectCertification,
  rejectPilotQualification,
  runAdminDemoFlow,
} from '@/services/app-flow';
import { adminModuleRouteByLabel } from '@/services/admin-console';
import { auditStatusLabel, claimStatusLabel, orderStatusLabel, roleLabel } from '@/services/display-labels';
import { repo } from '@/utils/repo';

type ChartRange = '1H' | '24H' | '7D';

interface NavModule {
  label: string;
  icon: string;
  active: boolean;
  badge?: string;
}

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  iconTone: string;
  tone: 'primary' | 'warning';
  footIcon?: string;
  footMain?: string;
  footSub?: string;
  footTone?: string;
  progress?: string;
  feedback: string;
}

interface ChartBar {
  key: string;
  count: number;
  height: string;
  hot?: boolean;
}

interface QueueRow {
  id: string;
  desc: string;
  time: string;
  tone: 'critical' | 'warning' | 'muted';
  kind?: 'application' | 'pilot';
  sourceId?: string;
}

interface RiskRow {
  id: string;
  desc: string;
  icon: string;
  tone: 'critical' | 'warning' | 'muted';
  action: string;
  sourceType: 'order' | 'claim';
  sourceId: string;
}

const userStore = useUserStore();
userStore.loginAs(Role.Admin);
const orderStore = useOrderStore();
const feedback = ref('');
const refreshTick = ref(0);
const activeModule = ref('运营工作台');
const activeRange = ref<ChartRange>('24H');
const mapZoom = ref(1);
const panels = ref<{ open: (panel: ConsolePanelKey) => void } | null>(null);
const flowFeedback = ref<AdminRunFlowFeedback>({ kind: 'idle', message: '' });
const metrics = computed(() => {
  void refreshTick.value;
  return dashboardMetrics();
});
const report = computed(() => {
  void refreshTick.value;
  return analyticsReport();
});
const runFlowAction = computed(() => adminRunFlowAction(metrics.value.onlineCapacity));
const flowPanel = computed(() => adminRunFlowPanel(runFlowAction.value, flowFeedback.value));

const orders = computed(() => {
  void refreshTick.value;
  return repo.orders.all();
});
const claims = computed(() => {
  void refreshTick.value;
  return repo.claims.all();
});
const activeOrders = computed(() => orders.value.filter((order) => ![
  OrderStatus.Settled,
  OrderStatus.Cancelled,
  OrderStatus.Exception,
].includes(order.status)));
const completedOrders = computed(() => orders.value.filter((order) => order.status === OrderStatus.Completed || order.status === OrderStatus.Settled));
const pendingApplications = computed(() => {
  void refreshTick.value;
  return repo.authApplications.where((app) => app.status === AuditStatus.Pending);
});
const pendingPilotProfiles = computed(() => {
  void refreshTick.value;
  return repo.pilots.where((pilot) => pilot.noCrimeProof === AuditStatus.Pending || pilot.healthProof === AuditStatus.Pending);
});
const queueCount = computed(() => pendingApplications.value.length + pendingPilotProfiles.value.length);
const riskCount = computed(() => riskOrders.value.length);
const mapZoomLabel = computed(() => `${Math.round(mapZoom.value * 100)}%`);
const mapVisualStyle = computed<Record<string, string>>(() => ({
  '--map-scale': String(mapZoom.value),
}));
const totalCapacityLabel = computed(() => repo.capacity.all().length.toLocaleString('en-US'));

const navModules = computed<NavModule[]>(() => [
  { label: '运营工作台', icon: 'dashboard', active: activeModule.value === '运营工作台' },
  { label: '认证审核', icon: 'fact_check', active: activeModule.value === '认证审核', badge: queueCount.value ? String(queueCount.value) : undefined },
  { label: '订单管理', icon: 'local_shipping', active: activeModule.value === '订单管理', badge: activeOrders.value.length ? String(activeOrders.value.length) : undefined },
  { label: '风控理赔', icon: 'security', active: activeModule.value === '风控理赔', badge: riskCount.value ? String(riskCount.value) : undefined },
  { label: '报表建议', icon: 'analytics', active: activeModule.value === '报表建议', badge: report.value.suggestions.length ? String(report.value.suggestions.length) : undefined },
  { label: '审计日志', icon: 'history', active: activeModule.value === '审计日志', badge: repo.auditLogs.all().length ? String(repo.auditLogs.all().length) : undefined },
]);

const kpiCards = computed<KpiCard[]>(() => {
  const completionRate = metrics.value.orderCount ? completedOrders.value.length / metrics.value.orderCount : 0;
  const severeCount = riskOrders.value.filter((item) => item.tone === 'critical').length;
  const queueMinutes = queueCount.value ? Math.max(5, Math.min(45, queueCount.value * 5)) : 0;
  return [
    {
      label: '今日活跃运单',
      value: activeOrders.value.length.toLocaleString('en-US'),
      icon: 'route',
      iconTone: 'cyan',
      tone: 'primary',
      footIcon: 'trending_up',
      footMain: `总量 ${metrics.value.orderCount}`,
      footSub: `完单 ${completedOrders.value.length}`,
      footTone: 'success-text',
      feedback: `活跃运单 ${activeOrders.value.length}，订单总量 ${metrics.value.orderCount}`,
    },
    {
      label: '待处理异常',
      value: riskCount.value.toLocaleString('en-US'),
      icon: 'warning',
      iconTone: riskCount.value ? 'warning' : 'blue',
      tone: riskCount.value ? 'warning' : 'primary',
      footIcon: riskCount.value ? 'priority_high' : 'check_circle',
      footMain: riskCount.value ? '需干预' : '正常',
      footSub: severeCount ? `${severeCount} 严重` : '无严重项',
      footTone: riskCount.value ? 'warning-text' : 'success-text',
      feedback: `风险队列 ${riskCount.value} 项，严重 ${severeCount} 项`,
    },
    {
      label: '平台日均完单率',
      value: `${(completionRate * 100).toFixed(1)}%`,
      icon: 'check_circle',
      iconTone: 'blue',
      tone: 'primary',
      progress: `${Math.round(completionRate * 100)}%`,
      feedback: `完单 ${completedOrders.value.length}/${metrics.value.orderCount}，取消率 ${(metrics.value.cancelRate * 100).toFixed(1)}%`,
    },
    {
      label: '认证排队中',
      value: queueCount.value.toLocaleString('en-US'),
      icon: 'person_add',
      iconTone: 'secondary',
      tone: 'primary',
      footIcon: 'schedule',
      footMain: queueCount.value ? `预计审核时长: ${queueMinutes}min` : '队列已清空',
      footSub: '',
      footTone: queueCount.value ? 'warning-text' : 'success-text',
      feedback: `待审认证 ${queueCount.value} 项`,
    },
  ];
});

const chartTitle = computed(() => `${activeRange.value} 订单吞吐量趋势`);
const chartAxisLabels = computed(() => {
  if (activeRange.value === '1H') return ['-60m', '-45m', '-30m', '-15m', 'Now'];
  if (activeRange.value === '7D') return ['D-6', 'D-4', 'D-2', 'D-1', 'Now'];
  return ['00:00', '06:00', '12:00', '18:00', 'Now'];
});
const chartBars = computed<ChartBar[]>(() => {
  const buckets = activeRange.value === '7D' ? 7 : 12;
  const hours = activeRange.value === '1H' ? 1 : activeRange.value === '24H' ? 24 : 24 * 7;
  const now = Date.now();
  const start = now - hours * 60 * 60 * 1000;
  const span = now - start;
  const counts = Array.from({ length: buckets }, () => 0);
  orders.value.forEach((order) => {
    const at = new Date(order.createdAt).getTime();
    if (!Number.isFinite(at) || at < start || at > now) return;
    const index = Math.min(buckets - 1, Math.floor(((at - start) / span) * buckets));
    counts[index] += 1;
  });
  const max = Math.max(...counts, 1);
  return counts.map((count, index) => ({
    key: bucketLabel(index, buckets),
    count,
    height: `${count ? Math.max(12, Math.round((count / max) * 100)) : 4}%`,
    hot: count > 0 && count === max,
  }));
});
const queueRows = computed<QueueRow[]>(() => [
  ...pendingApplications.value.map(applicationQueueRow),
  ...pendingPilotProfiles.value.map((pilot) => {
    const user = repo.users.find(pilot.userId);
    return {
      id: pilot.userId.toUpperCase(),
      desc: `${user?.nickname ?? pilot.userId} 飞手资质待审`,
      time: 'profile',
      tone: 'warning' as const,
      kind: 'pilot' as const,
      sourceId: pilot.userId,
    };
  }),
].slice(0, 6));
const queueCountLabel = computed(() => `${queueCount.value} 待审`);
const riskOrders = computed<RiskRow[]>(() => {
  const exceptionRows = orders.value
    .filter((order) => order.status === OrderStatus.Exception)
    .slice()
    .reverse()
    .map(orderRiskRow);
  const claimRows = claims.value
    .filter((claim) => claim.status !== 'paid')
    .slice()
    .reverse()
    .map(claimRiskRow);
  return [...exceptionRows, ...claimRows].slice(0, 5);
});

function bucketLabel(index: number, total: number) {
  if (activeRange.value === '1H') return `${Math.round((index / total) * 60)}m`;
  if (activeRange.value === '7D') return `D-${Math.max(total - index - 1, 0)}`;
  return `${String(index * 2).padStart(2, '0')}:00`;
}

function agoLabel(iso: string) {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return 'unknown';
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function applicationQueueRow(app: CertificationApplication): QueueRow {
  const user = repo.users.find(app.userId);
  const realName = typeof app.fields.realName === 'string' ? app.fields.realName : '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(app.submittedAt).getTime()) / 60000));
  return {
    id: app.id.toUpperCase(),
    desc: `${realName || user?.nickname || app.userId} · ${roleLabel(app.role)}认证 · ${auditStatusLabel(app.status)}`,
    time: agoLabel(app.submittedAt),
    tone: minutes >= 60 ? 'critical' : app.role === Role.Owner ? 'warning' : 'muted',
    kind: 'application',
    sourceId: app.id,
  };
}

function orderRiskRow(order: Order): RiskRow {
  const latest = order.events[order.events.length - 1];
  return {
    id: order.id.toUpperCase(),
    desc: `${orderStatusLabel(order.status)} · ${latest?.note ?? '等待后台处置'}`,
    icon: 'warning',
    tone: 'critical',
    action: '查看',
    sourceType: 'order',
    sourceId: order.id,
  };
}

function claimRiskRow(claim: Claim): RiskRow {
  const order = repo.orders.find(claim.orderId);
  return {
    id: claim.id.toUpperCase(),
    desc: `${claimStatusLabel(claim.status)} · ${order?.id.toUpperCase() ?? claim.orderId}`,
    icon: claim.status === 'arbitration' ? 'warning' : 'security',
    tone: claim.status === 'arbitration' ? 'critical' : 'warning',
    action: claim.status === 'paid' ? '查看' : '推进',
    sourceType: 'claim',
    sourceId: claim.id,
  };
}

function bumpRefresh() {
  refreshTick.value += 1;
}

function showToast(title: string, kind: AdminRunFlowFeedback['kind'] = 'info') {
  feedback.value = title;
  flowFeedback.value = { kind, message: title };
  uni.showToast({ title, icon: 'none' });
}

function openPanel(panel: ConsolePanelKey) {
  panels.value?.open(panel);
}

function openModule(label: string) {
  activeModule.value = label;
  const route = adminModuleRouteByLabel(label);
  if (route && route !== '/pages-admin/dashboard/index') {
    uni.navigateTo({ url: route });
    return;
  }
  showToast('当前：运营工作台');
}

function exportReport() {
  uni.navigateTo({ url: '/pages-admin/reports/index' });
}

async function runFlow() {
  if (!runFlowAction.value.canRun) {
    showToast(runFlowAction.value.description, 'warning');
    return;
  }
  try {
    const order = await runAdminDemoFlow(orderStore.strategy);
    orderStore.activeOrderId = order.id;
    orderStore.selectedCapacityId = order.capacityId ?? '';
    bumpRefresh();
    showToast('流程演练已完成', 'success');
  } catch (e) {
    showToast(e instanceof Error ? e.message : '流程演练失败', 'danger');
  }
}

function rejectQueue(item: QueueRow) {
  if (item.kind === 'application' && item.sourceId) {
    rejectCertification(item.sourceId);
  } else if (item.kind === 'pilot' && item.sourceId) {
    rejectPilotQualification(item.sourceId);
  }
  bumpRefresh();
  showToast(`${item.id} 已驳回`);
}

function reviewQueue(item: QueueRow) {
  if (item.kind === 'application' && item.sourceId) {
    approveCertification(item.sourceId);
  } else if (item.kind === 'pilot' && item.sourceId) {
    approvePilotQualification(item.sourceId);
  }
  bumpRefresh();
  showToast(`${item.id} 资料已审查`);
}

function openAuthCenter() {
  uni.navigateTo({ url: '/pages-admin/certifications/index' });
}

function showNotifications() {
  openPanel('notifications');
}

function showSettings() {
  openPanel('settings');
}

function showOperator() {
  openPanel('operator');
}

function showSystemHealth() {
  openPanel('system');
}

function setMapZoom(delta: 1 | -1) {
  mapZoom.value = Math.min(1.6, Math.max(0.6, Number((mapZoom.value + delta * 0.2).toFixed(1))));
  showToast(`地图缩放 ${mapZoomLabel.value}`);
}

function selectRange(range: ChartRange) {
  activeRange.value = range;
  showToast(`已切换 ${range} 趋势`);
}

function handleRiskAction(item: RiskRow) {
  if (item.sourceType === 'order') {
    const order = repo.orders.find(item.sourceId);
    if (!order) return;
    const latest = order.events[order.events.length - 1];
    showToast(`${order.id.toUpperCase()} · ${latest ? orderStatusLabel(latest.status) : '暂无事件'}`);
    return;
  }
  const claim = repo.claims.find(item.sourceId);
  if (!claim) return;
  if (claim.status !== 'paid') {
    advanceClaim(claim.id);
    bumpRefresh();
    showToast(`${item.id} 已推进至 ${claimStatusLabel(repo.claims.find(claim.id)?.status ?? claim.status)}`);
    return;
  }
  showToast(`${item.id} · ${claimStatusLabel(claim.status)} · 赔付 ¥${((claim.payoutCent ?? 0) / 100).toLocaleString('en-US')}`);
}
</script>

<style lang="scss" scoped>
.op-console {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 50;
  height: 72px;
  padding: 0 32px;
  border-bottom: 1px solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-cluster,
.operator-cluster,
.operator-card,
.rail-item,
.system-head,
.page-head,
.head-actions,
.outline-action,
.primary-action,
.kpi-top,
.kpi-foot,
.map-chip,
.chart-head,
.range-tabs,
.panel-head,
.panel-title,
.queue-line,
.queue-actions,
.risk-head,
.risk-row {
  display: flex;
  align-items: center;
}

.brand-cluster {
  gap: 20px;
}

.brand-icon,
.brand-title,
.primary-action,
.rail-item.active,
.map-chip,
.queue-actions view:nth-child(2),
.risk-action {
  color: #00f2ff;
}

.brand-title {
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 30px;
  line-height: 36px;
  font-weight: 800;
  letter-spacing: 0;
}

.version-chip {
  height: 28px;
  padding: 0 11px;
  border: 1px solid #3a494b;
  border-radius: 2px;
  background: #171b26;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 14px;
  line-height: 28px;
  font-weight: 700;
  letter-spacing: .16em;
}

.operator-cluster {
  gap: 24px;
}

.top-icon {
  position: relative;
  width: 40px;
  height: 40px;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-dot {
  position: absolute;
  top: 8px;
  right: 7px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
}

.operator-divider {
  width: 1px;
  height: 44px;
  background: #3a494b;
}

.operator-card {
  gap: 14px;
}

.operator-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 1px solid #00f2ff;
  overflow: hidden;
}

.operator-copy text {
  display: block;
}

.operator-id,
.operator-state,
.version-chip,
.rail-label,
.rail-item,
.system-head,
.system-line,
.outline-action,
.primary-action,
.kpi-top,
.kpi-foot,
.queue-count,
.queue-id,
.queue-time,
.queue-actions,
.queue-footer,
.risk-copy,
.risk-action,
.range-tabs,
.y-axis,
.x-axis,
.map-title-band,
.fleet-total {
  font-family: "JetBrains Mono", monospace;
}

.operator-id {
  color: #e1fdff;
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
  letter-spacing: .08em;
}

.operator-state {
  margin-top: 1px;
  color: #dfe2f0;
  font-size: 14px;
  line-height: 18px;
  letter-spacing: .08em;
}

.side-rail {
  position: fixed;
  left: 0;
  top: 72px;
  bottom: 0;
  z-index: 40;
  width: 296px;
  padding: 28px 20px 20px;
  border-right: 1px solid #3a494b;
  background: #141822;
  box-sizing: border-box;
}

.rail-label {
  display: block;
  margin: 0 0 18px 10px;
  color: #b9cacb;
  font-size: 14px;
  line-height: 18px;
  font-weight: 700;
  letter-spacing: .16em;
}

.rail-item {
  position: relative;
  height: 56px;
  padding: 0 20px;
  border-radius: 4px;
  color: #b9cacb;
  gap: 14px;
  box-sizing: border-box;
}

.rail-item + .rail-item {
  margin-top: 2px;
}

.rail-item text:nth-child(2) {
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
  letter-spacing: .08em;
}

.rail-item.active {
  border: 1px solid rgba(0, 242, 255, .42);
  background: rgba(0, 242, 255, .12);
}

.rail-badge {
  position: absolute;
  right: 20px;
  height: 31px;
  min-width: 28px;
  padding: 0 7px;
  border-radius: 3px;
  background: #3b82f6;
  color: #061014;
  font-size: 12px;
  line-height: 31px;
  font-weight: 800;
  text-align: center;
}

.system-card {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 20px;
  height: 124px;
  padding: 20px;
  border: 1px solid #3a494b;
  border-radius: 6px;
  background: #262a34;
  box-sizing: border-box;
}

.system-head {
  gap: 9px;
  color: #10b981;
}

.system-head text {
  font-size: 13px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: .18em;
}

.system-line {
  display: block;
  margin-top: 15px;
  color: #dfe2f0;
  font-size: 12px;
  line-height: 12px;
}

.system-line + .system-line {
  margin-top: 12px;
}

.main-scroll {
  position: fixed;
  left: 296px;
  right: 0;
  top: 72px;
  bottom: 0;
  background: #0b0e14;
}

.grid-layer {
  position: fixed;
  left: 296px;
  right: 0;
  top: 72px;
  bottom: 0;
  pointer-events: none;
  opacity: .18;
  background-image:
    linear-gradient(rgba(58, 73, 75, .25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(58, 73, 75, .25) 1px, transparent 1px);
  background-size: 32px 32px;
}

.main-content {
  position: relative;
  z-index: 1;
  width: calc(100vw - 360px);
  max-width: 1640px;
  min-width: 0;
  margin: 0 32px;
  padding: 32px 0 64px;
  box-sizing: border-box;
}

.page-head {
  height: 96px;
  border-bottom: 1px solid #3a494b;
  justify-content: space-between;
  align-items: center;
}

.page-title,
.page-subtitle {
  display: block;
}

.page-title {
  color: #e1fdff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 40px;
  line-height: 46px;
  font-weight: 800;
  letter-spacing: 0;
}

.page-subtitle {
  margin-top: 8px;
  color: #b9cacb;
  font-size: 16px;
  line-height: 22px;
}

.head-actions {
  gap: 20px;
}

.outline-action,
.primary-action {
  height: 42px;
  padding: 0 22px;
  border-radius: 3px;
  gap: 10px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 700;
  box-sizing: border-box;
}

.outline-action {
  border: 1px solid #3b82f6;
  color: #3b82f6;
}

.primary-action {
  background: #00f2ff;
  color: #002022;
  box-shadow: 0 0 15px rgba(0, 242, 255, .3);
}

.flow-feedback {
  margin-top: 20px;
  padding: 14px 18px;
  border: 1px solid rgba(58, 73, 75, .8);
  border-radius: 6px;
  background: rgba(20, 24, 34, .92);
  box-sizing: border-box;
}

.flow-feedback.info {
  border-color: rgba(59, 130, 246, .45);
}

.flow-feedback.success {
  border-color: rgba(16, 185, 129, .55);
}

.flow-feedback.warning {
  border-color: rgba(245, 158, 11, .55);
}

.flow-feedback.danger {
  border-color: rgba(239, 68, 68, .55);
}

.flow-feedback-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.flow-feedback.info .flow-feedback-main :deep(.stitch-icon) {
  color: #3b82f6;
}

.flow-feedback.success .flow-feedback-main :deep(.stitch-icon) {
  color: #10b981;
}

.flow-feedback.warning .flow-feedback-main :deep(.stitch-icon) {
  color: #f59e0b;
}

.flow-feedback.danger .flow-feedback-main :deep(.stitch-icon) {
  color: #ef4444;
}

.flow-feedback-title,
.flow-feedback-copy {
  display: block;
}

.flow-feedback-title {
  color: #f0f3ff;
  font-size: 14px;
  line-height: 18px;
  font-weight: 800;
}

.flow-feedback-copy {
  margin-top: 4px;
  color: #b9cacb;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-top: 24px;
}

.kpi-card {
  position: relative;
  height: 160px;
  padding: 22px 22px;
  border: 1px solid #3a494b;
  border-radius: 8px;
  background: #141822;
  box-sizing: border-box;
  overflow: hidden;
}

.kpi-top {
  justify-content: space-between;
  color: #b9cacb;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: .1em;
}

.cyan {
  color: #00f2ff;
}

.warning {
  color: #f59e0b;
}

.warn-mark {
  position: relative;
  width: 28px;
  height: 25px;
  color: currentColor;
}

.warn-mark::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 1px;
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-bottom: 22px solid currentColor;
}

.warn-mark::after {
  content: "";
  position: absolute;
  left: 6px;
  top: 6px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 15px solid #141822;
}

.warn-mark text {
  position: absolute;
  left: 0;
  right: 0;
  top: 8px;
  z-index: 2;
  color: currentColor;
  font-family: "JetBrains Mono", monospace;
  font-size: 14px;
  line-height: 14px;
  font-weight: 800;
  text-align: center;
}

.warn-mark.small {
  width: 20px;
  height: 18px;
}

.warn-mark.small::before {
  left: 2px;
  border-left-width: 8px;
  border-right-width: 8px;
  border-bottom-width: 16px;
}

.warn-mark.small::after {
  left: 5px;
  top: 4px;
  border-left-width: 5px;
  border-right-width: 5px;
  border-bottom-width: 10px;
}

.warn-mark.small text {
  top: 5px;
  font-size: 10px;
  line-height: 10px;
}

.warn-mark.warning {
  color: #f59e0b;
}

.blue {
  color: #3b82f6;
}

.secondary {
  color: #adc6ff;
}

.kpi-value {
  display: block;
  margin-top: 16px;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 40px;
  line-height: 44px;
  font-weight: 800;
  letter-spacing: 0;
}

.kpi-value.primary {
  color: #e1fdff;
}

.kpi-value.warning {
  color: #f59e0b;
}

.kpi-foot {
  gap: 9px;
  margin-top: 18px;
  color: #b9cacb;
  font-size: 13px;
  line-height: 18px;
  letter-spacing: .05em;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.success-text {
  color: #10b981;
  font-weight: 700;
}

.warning-text {
  color: #f59e0b;
  font-weight: 700;
}

.foot-muted {
  color: #b9cacb;
  font-size: 12px;
}

.kpi-progress {
  height: 5px;
  margin-top: 26px;
  border-radius: 999px;
  background: #313540;
  overflow: hidden;
}

.kpi-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #3b82f6;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
  margin-top: 24px;
}

.left-column {
  grid-column: span 8;
  display: grid;
  gap: 24px;
}

.right-column {
  grid-column: span 4;
  display: grid;
  gap: 24px;
  align-content: start;
}

.map-card,
.chart-card,
.queue-card,
.risk-card {
  border: 1px solid #3a494b;
  border-radius: 8px;
  background: #141822;
  overflow: hidden;
  box-sizing: border-box;
}

.map-card {
  position: relative;
  min-height: 320px;
  aspect-ratio: 1376 / 768;
  container-type: inline-size;
}

.map-chip {
  position: absolute;
  left: 24px;
  top: 22px;
  z-index: 4;
  height: 40px;
  padding: 0 14px;
  gap: 9px;
  border: 1px solid rgba(0, 242, 255, .38);
  border-radius: 3px;
  background: rgba(7, 17, 27, .76);
  box-shadow: 0 0 18px rgba(0, 242, 255, .12);
  font-family: "JetBrains Mono", monospace;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: .05em;
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #10b981;
}

.map-visual {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #07111b;
}

.map-asset {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: .95;
}

.map-asset {
  transform: scale(var(--map-scale, 1));
  transform-origin: center center;
  transition: transform .24s ease;
  will-change: transform;
}

.map-shade {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    linear-gradient(0deg, rgba(7, 17, 27, .18) 0%, rgba(7, 17, 27, 0) 40%),
    radial-gradient(circle at 50% 50%, rgba(0, 242, 255, .08), transparent 55%);
  opacity: .8;
}

.map-title-band {
  position: absolute;
  left: 50%;
  top: 2.6%;
  z-index: 5;
  width: 44%;
  min-width: 0;
  padding: 0 2.5% 6px;
  color: #e1fdff;
  text-align: center;
  transform: translateX(-50%);
  box-sizing: border-box;
}

.map-title-band::before,
.map-title-band::after {
  content: "";
  position: absolute;
  top: 0;
  width: 10%;
  height: 24px;
  height: clamp(16px, 4.4cqw, 34px);
  border-top: 1px solid rgba(0, 242, 255, .46);
}

.map-title-band::before {
  left: 0;
  border-left: 1px solid rgba(0, 242, 255, .28);
  transform: skewX(32deg);
}

.map-title-band::after {
  right: 0;
  border-right: 1px solid rgba(0, 242, 255, .28);
  transform: skewX(-32deg);
}

.map-title-band text {
  position: relative;
  z-index: 1;
  display: block;
  white-space: nowrap;
}

.map-title-band text:first-child {
  font-size: 9px;
  font-size: clamp(7px, 1.38cqw, 18px);
  line-height: 13px;
  line-height: clamp(10px, 1.9cqw, 22px);
  font-weight: 800;
  letter-spacing: .05em;
}

.map-title-band text:last-child {
  margin-top: 2px;
  color: #2fc3c7;
  font-size: 6px;
  font-size: clamp(5px, .65cqw, 11px);
  line-height: 8px;
  line-height: clamp(7px, 1cqw, 12px);
  font-weight: 700;
  letter-spacing: .08em;
}

.fleet-total {
  position: absolute;
  z-index: 5;
  width: 18%;
  min-width: 0;
  max-width: 250px;
  height: 30px;
  height: clamp(22px, 4.9cqw, 40px);
  padding: 0 8px;
  padding: 0 clamp(6px, 1.3cqw, 14px);
  border: 1px solid rgba(245, 158, 11, .55);
  border-radius: 1px;
  background: rgba(50, 35, 12, .48);
  color: #f5bc57;
  font-size: 9px;
  font-size: clamp(7px, 1.24cqw, 14px);
  line-height: 30px;
  line-height: clamp(22px, 4.9cqw, 40px);
  font-weight: 800;
  letter-spacing: .04em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  gap: clamp(3px, .7cqw, 6px);
  white-space: nowrap;
  box-shadow: 0 0 18px rgba(245, 158, 11, .18), inset 0 0 18px rgba(245, 158, 11, .08);
  box-sizing: border-box;
}

.fleet-total::before,
.fleet-total::after {
  content: "";
  position: absolute;
  top: -1px;
  width: 8px;
  width: clamp(6px, 1.25cqw, 12px);
  height: calc(100% + 2px);
  border-top: 2px solid rgba(245, 188, 87, .82);
  border-bottom: 2px solid rgba(245, 188, 87, .82);
  box-sizing: border-box;
}

.fleet-total::before {
  left: -1px;
  border-left: 2px solid rgba(245, 188, 87, .82);
}

.fleet-total::after {
  right: -1px;
  border-right: 2px solid rgba(245, 188, 87, .82);
}

.fleet-total-top {
  top: 5.2%;
  right: 2.4%;
}

.fleet-total-bottom {
  width: 22%;
  left: 4.2%;
  bottom: 5.2%;
}

.map-controls {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 6;
  display: grid;
  gap: 10px;
}

.map-controls view {
  width: 40px;
  height: 40px;
  border: 1px solid #3a494b;
  border-radius: 3px;
  color: #dfe2f0;
  background: rgba(30, 36, 51, .85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-card {
  height: 300px;
  padding: 24px 22px 20px;
}

.chart-head {
  justify-content: space-between;
}

.chart-head > text {
  color: #e1fdff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.range-tabs {
  gap: 10px;
}

.range-tabs view {
  min-width: 39px;
  height: 38px;
  border-radius: 3px;
  background: #313540;
  color: #dfe2f0;
  font-size: 14px;
  line-height: 38px;
  text-align: center;
}

.range-tabs .active {
  border: 1px solid rgba(0, 242, 255, .55);
  background: rgba(0, 242, 255, .18);
  color: #00f2ff;
}

.chart-body {
  position: relative;
  height: 210px;
  margin-top: 18px;
  padding-left: 40px;
  padding-bottom: 28px;
  box-sizing: border-box;
}

.y-axis {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 28px;
  width: 30px;
  color: #b9cacb;
  font-size: 12px;
  line-height: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.chart-grid {
  position: relative;
  height: 100%;
  border-left: 1px solid #3a494b;
  border-bottom: 1px solid #3a494b;
}

.grid-line {
  position: absolute;
  left: 40px;
  right: 0;
  height: 1px;
  background: rgba(58, 73, 75, .45);
}

.grid-line:nth-child(1) {
  top: 0;
}

.grid-line:nth-child(2) {
  top: 33%;
}

.grid-line:nth-child(3) {
  top: 66%;
}

.grid-line:nth-child(4) {
  bottom: 0;
}

.bars {
  position: absolute;
  left: 38px;
  right: 0;
  bottom: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.bar {
  flex: 1;
  border-radius: 3px 3px 0 0;
  background: #353944;
}

.bar.hot {
  border-top: 1px solid #00f2ff;
  background: rgba(59, 130, 246, .7);
  box-shadow: 0 -4px 10px rgba(0, 242, 255, .18);
}

.x-axis {
  position: absolute;
  left: 40px;
  right: 0;
  bottom: 0;
  color: #b9cacb;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
}

.queue-card {
  height: 420px;
  display: flex;
  flex-direction: column;
}

.panel-head {
  height: 70px;
  padding: 0 20px;
  border-bottom: 1px solid #3a494b;
  background: rgba(23, 27, 38, .5);
  justify-content: space-between;
  box-sizing: border-box;
}

.panel-title {
  gap: 10px;
  color: #e1fdff;
}

.panel-title .stitch-icon {
  color: #adc6ff;
}

.panel-title text,
.risk-head text {
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 24px;
  line-height: 30px;
  font-weight: 800;
}

.queue-count {
  min-width: 68px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #313540;
  color: #b9cacb;
  font-size: 12px;
  line-height: 30px;
  text-align: center;
  box-sizing: border-box;
}

.queue-list {
  flex: 1;
  padding: 12px;
  display: grid;
  gap: 10px;
  overflow: hidden;
}

.queue-row {
  min-height: 0;
  padding: 16px;
  border: 1px solid #3a494b;
  border-radius: 4px;
  background: #1b1f2a;
  box-sizing: border-box;
}

.queue-line {
  position: relative;
  gap: 8px;
}

.queue-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.queue-dot.critical {
  background: #ef4444;
}

.queue-dot.warning {
  background: #f59e0b;
}

.queue-dot.muted {
  background: #313540;
}

.queue-id {
  color: #e1fdff;
  font-size: 16px;
  line-height: 20px;
  font-weight: 700;
  letter-spacing: .08em;
}

.queue-time {
  margin-left: auto;
  color: #b9cacb;
  font-size: 12px;
  line-height: 16px;
}

.queue-desc {
  display: block;
  margin-top: 13px;
  color: #dfe2f0;
  font-size: 17px;
  line-height: 22px;
}

.queue-actions {
  gap: 10px;
  margin-top: 13px;
}

.queue-actions view {
  flex: 1;
  height: 32px;
  border: 1px solid #3a494b;
  border-radius: 2px;
  color: #dfe2f0;
  font-size: 12px;
  line-height: 32px;
  text-align: center;
  font-weight: 700;
}

.queue-actions view:nth-child(2) {
  border-color: rgba(0, 242, 255, .55);
  background: rgba(0, 242, 255, .1);
}

.queue-footer {
  height: 40px;
  border-top: 1px solid #3a494b;
  color: #b9cacb;
  background: #0a0e18;
  font-size: 13px;
  line-height: 40px;
  font-weight: 700;
  letter-spacing: .16em;
  text-align: center;
}

.risk-card {
  height: 190px;
  padding: 22px 20px 18px;
}

.risk-head {
  gap: 10px;
  color: #e1fdff;
}

.risk-head .stitch-icon {
  color: #3b82f6;
}

.risk-list {
  margin-top: 25px;
}

.risk-row {
  min-height: 58px;
  border-bottom: 1px solid #3a494b;
}

.risk-row:last-child {
  border-bottom: 0;
}

.risk-icon {
  width: 40px;
  height: 40px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.risk-icon.critical {
  color: #ef4444;
  background: rgba(239, 68, 68, .12);
}

.risk-icon.warning {
  color: #f59e0b;
  background: rgba(245, 158, 11, .12);
}

.risk-copy {
  flex: 1;
  margin-left: 16px;
}

.risk-copy text {
  display: block;
}

.risk-copy text:first-child {
  color: #e1fdff;
  font-size: 17px;
  line-height: 22px;
  font-weight: 700;
  letter-spacing: .08em;
}

.risk-copy text:last-child {
  margin-top: 3px;
  color: #b9cacb;
  font-size: 12px;
  line-height: 16px;
}

.risk-action {
  min-width: 48px;
  text-align: right;
  font-size: 14px;
  line-height: 22px;
  font-weight: 700;
}

.tap-press {
  opacity: .78;
}

@media screen and (max-width: 1100px) {
  .main-content {
    width: calc(100vw - 360px);
  }

  .kpi-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .left-column,
  .right-column {
    grid-column: auto;
  }

  .map-card {
    min-height: 280px;
  }
}

@media screen and (max-width: 900px) {
  .side-rail {
    width: 220px;
    padding: 28px 16px 20px;
  }

  .main-scroll,
  .grid-layer {
    left: 220px;
  }

  .main-content {
    width: calc(100vw - 252px);
    margin: 0 16px;
  }

  .rail-item {
    padding: 0 16px;
    gap: 8px;
  }

  .system-card {
    left: 16px;
    right: 16px;
  }

  .map-card {
    min-height: 240px;
  }

  .fleet-total {
    min-width: 0;
    height: 32px;
    padding: 0 10px;
    font-size: 8px;
    line-height: 32px;
  }

  .map-title-band {
    width: 44%;
    min-width: 0;
    padding: 0 2% 6px;
  }

  .map-title-band text:first-child {
    font-size: 11px;
    line-height: 17px;
  }

  .map-title-band text:last-child {
    font-size: 7px;
    line-height: 10px;
  }
}

@media screen and (max-width: 760px) {
  .op-console {
    height: 100dvh;
  }

  .topbar {
    height: 64px;
    padding: 0 14px;
    gap: 10px;
  }

  .brand-cluster {
    min-width: 0;
    gap: 10px;
  }

  .brand-icon {
    flex: 0 0 auto;
  }

  .brand-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 20px;
    line-height: 26px;
  }

  .version-chip,
  .operator-divider,
  .operator-copy {
    display: none;
  }

  .operator-cluster {
    flex: 0 0 auto;
    gap: 6px;
  }

  .top-icon,
  .operator-card {
    width: 44px;
    height: 44px;
    justify-content: center;
  }

  .operator-card {
    gap: 0;
  }

  .operator-avatar {
    width: 34px;
    height: 34px;
    border-radius: 12px;
  }

  .side-rail {
    left: 0;
    right: 0;
    top: 64px;
    bottom: auto;
    width: auto;
    height: 68px;
    padding: 8px 12px;
    border-right: 0;
    border-bottom: 1px solid #3a494b;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .side-rail::-webkit-scrollbar {
    display: none;
  }

  .rail-label,
  .system-card {
    display: none;
  }

  .rail-item {
    flex: 0 0 auto;
    min-width: 104px;
    height: 48px;
    padding: 0 12px;
    gap: 8px;
  }

  .rail-item + .rail-item {
    margin-top: 0;
  }

  .rail-item text:nth-child(2) {
    font-size: 12px;
    line-height: 16px;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .rail-badge {
    top: 3px;
    right: 5px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    font-size: 10px;
    line-height: 18px;
  }

  .main-scroll {
    left: 0;
    top: 132px;
    bottom: 0;
  }

  .grid-layer {
    left: 0;
    top: 132px;
    background-size: 24px 24px;
  }

  .main-content {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 14px 14px calc(30px + env(safe-area-inset-bottom));
  }

  .page-head {
    height: auto;
    min-height: 0;
    padding-bottom: 14px;
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .page-title {
    font-size: 30px;
    line-height: 36px;
  }

  .page-subtitle {
    margin-top: 5px;
    font-size: 13px;
    line-height: 20px;
  }

  .head-actions {
    width: 100%;
    gap: 8px;
  }

  .outline-action,
  .primary-action {
    min-height: 44px;
    height: auto;
    flex: 1 1 0;
    justify-content: center;
    padding: 0 12px;
    font-size: 12px;
    line-height: 18px;
  }

  .flow-feedback {
    margin-top: 16px;
    padding: 12px 14px;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .kpi-card {
    height: auto;
    min-height: 128px;
    padding: 16px 14px;
  }

  .kpi-top {
    gap: 8px;
    letter-spacing: .04em;
  }

  .kpi-value {
    margin-top: 12px;
    font-size: 32px;
    line-height: 36px;
    word-break: break-word;
  }

  .kpi-foot {
    margin-top: 12px;
    gap: 6px;
    flex-wrap: wrap;
    white-space: normal;
  }

  .kpi-progress {
    margin-top: 18px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-top: 14px;
  }

  .left-column,
  .right-column {
    grid-column: auto;
    gap: 14px;
  }

  .map-card {
    min-height: 240px;
    aspect-ratio: 16 / 11;
  }

  .map-title-band {
    top: 4%;
    width: 70%;
  }

  .map-title-band text:first-child {
    font-size: 10px;
    line-height: 14px;
  }

  .map-title-band text:last-child {
    white-space: normal;
    font-size: 7px;
    line-height: 10px;
  }

  .fleet-total {
    width: auto;
    max-width: none;
    height: 28px;
    padding: 0 8px;
    font-size: 8px;
    line-height: 28px;
  }

  .fleet-total-top {
    top: auto;
    right: 10px;
    bottom: 12px;
  }

  .fleet-total-bottom {
    left: 10px;
    bottom: 12px;
    width: auto;
  }

  .map-controls {
    right: 10px;
    top: 52px;
    bottom: auto;
    gap: 8px;
  }

  .map-controls view {
    width: 44px;
    height: 44px;
  }

  .chart-card {
    height: auto;
    min-height: 280px;
    padding: 18px 14px 16px;
  }

  .chart-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .chart-head > text,
  .panel-title text,
  .risk-head text {
    font-size: 19px;
    line-height: 24px;
  }

  .range-tabs {
    width: 100%;
    gap: 8px;
  }

  .range-tabs view {
    flex: 1;
    min-width: 0;
    height: 44px;
    line-height: 44px;
  }

  .chart-body {
    height: 190px;
    padding-left: 34px;
  }

  .bars {
    left: 20px;
    gap: 4px;
  }

  .x-axis {
    left: 34px;
    font-size: 10px;
  }

  .queue-card,
  .risk-card {
    height: auto;
  }

  .panel-head {
    min-height: 60px;
    height: auto;
    padding: 12px 14px;
    gap: 10px;
  }

  .queue-list {
    max-height: none;
    padding: 10px;
    overflow: visible;
  }

  .queue-row {
    padding: 14px;
  }

  .queue-line {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .queue-id {
    min-width: 0;
    flex: 1;
    font-size: 14px;
    line-height: 18px;
    word-break: break-word;
  }

  .queue-time {
    margin-left: 0;
  }

  .queue-desc {
    font-size: 14px;
    line-height: 20px;
  }

  .queue-actions {
    gap: 8px;
  }

  .queue-actions view {
    min-height: 40px;
    height: auto;
    line-height: 40px;
  }

  .queue-footer {
    min-height: 44px;
    height: auto;
    padding: 0 10px;
    font-size: 11px;
    line-height: 44px;
    letter-spacing: .08em;
  }

  .risk-card {
    padding: 18px 14px;
  }

  .risk-list {
    margin-top: 16px;
  }

  .risk-row {
    min-height: 0;
    padding: 12px 0;
    align-items: flex-start;
  }

  .risk-icon {
    width: 38px;
    height: 38px;
  }

  .risk-copy {
    margin-left: 12px;
  }

  .risk-copy text:first-child {
    font-size: 14px;
    line-height: 18px;
  }

  .risk-action {
    min-width: 44px;
    min-height: 40px;
    line-height: 40px;
  }
}

@media screen and (max-width: 420px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
