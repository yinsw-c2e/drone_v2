<template>
  <view class="owner-dashboard" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand-wrap" hover-class="tap-press" @click="showFeedback(copy.ownerOnline)">
        <image class="avatar" src="/static/stitch/owner-dashboard-avatar.png" mode="aspectFill" />
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showFeedback(copy.signalHealthy)">
          <StitchIcon name="signal_cellular_alt" size="24px" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="overview-section">
        <view class="section-head">
          <text>{{ copy.operationsState }}</text>
        </view>
        <view v-if="ownerIssue" class="auth-warning">
          <StitchIcon name="lock" size="16px" />
          <text>{{ ownerIssue }}</text>
        </view>

        <view class="metrics-grid">
          <view class="metric-card half-card" hover-class="tap-press" @click="showFeedback(`${copy.totalFleet}: ${fleetTotal}`)">
            <view class="metric-label">
              <StitchIcon name="flight" size="16px" />
              <text>{{ copy.totalFleet }}</text>
            </view>
            <text class="metric-value">{{ fleetTotal }}</text>
          </view>

          <view class="metric-card half-card online-card" hover-class="tap-press" @click="showFeedback(`${copy.onlineCapacity}: ${onlineCount} / ${fleetTotal}`)">
            <view class="metric-label">
              <StitchIcon name="cell_tower" size="16px" />
              <text>{{ copy.onlineCapacity }}</text>
            </view>
            <view class="capacity-row">
              <text class="capacity-main">{{ onlineCount }}</text>
              <text class="capacity-sub">/{{ fleetTotal }}</text>
            </view>
            <view class="progress-track"><view class="progress-fill" :style="{ width: `${onlinePct}%` }" /></view>
          </view>

          <view class="metric-card guarantee-card" hover-class="tap-press" @click="showFeedback(copy.guaranteeToast)">
            <view class="guarantee-head">
              <view class="metric-label compact">
                <StitchIcon name="verified" size="16px" />
                <text>{{ copy.guaranteeKpi }}</text>
              </view>
              <text class="healthy">{{ kpiHealthy ? copy.healthy : copy.watch }}</text>
            </view>
            <view class="guarantee-stats">
              <view>
                <text class="stat-value">{{ uptimeText }}</text>
                <text class="stat-label">{{ copy.uptime }}</text>
              </view>
              <view>
                <text class="stat-value">{{ respText }}</text>
                <text class="stat-label">{{ copy.avgResponse }}</text>
              </view>
              <view>
                <text class="stat-value">{{ successText }}</text>
                <text class="stat-label">{{ copy.missionSuccess }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="pool-card">
        <text class="pool-title">{{ copy.capacityPool }}</text>
        <view class="pool-bar">
          <view
            v-for="seg in poolSegments"
            :key="seg.key"
            :class="['pool-seg', seg.key]"
            :style="{ width: `${seg.pct}%` }"
            hover-class="tap-press"
            @click="showFeedback(`${seg.label}: ${seg.count}`)"
          >
            <text v-if="seg.pct >= 12">{{ seg.pct }}%</text>
          </view>
        </view>
        <view class="legend-row">
          <view class="legend-item"><text class="legend-dot ready" /><text>{{ copy.ready }}</text></view>
          <view class="legend-item"><text class="legend-dot busy" /><text>{{ copy.busy }}</text></view>
          <view class="legend-item"><text class="legend-dot offline" /><text>{{ copy.offline }}</text></view>
        </view>
      </view>

      <view class="queue-section">
        <view class="queue-head">
          <text>{{ copy.deviceQueue }}</text>
          <view class="view-all" hover-class="tap-press" @click="openDevices">
            <text>{{ copy.viewAll }}</text>
            <StitchIcon name="arrow_forward" size="16px" />
          </view>
        </view>

        <view class="device-scroll">
          <view class="device-track">
            <view
              v-for="device in devices"
              :key="device.id"
              :class="['device-card', device.dim ? 'dim' : '']"
              hover-class="tap-press"
              @click="handleDevice(device)"
            >
              <view class="device-top">
                <view class="device-title">
                  <view :class="['device-icon', device.tone]">
                    <StitchIcon :name="device.icon" size="24px" />
                  </view>
                  <view class="device-copy">
                    <text class="device-name">{{ device.name }}</text>
                    <text class="device-id">ID: {{ device.code }}</text>
                  </view>
                </view>
                <text :class="['state-badge', device.tone]">{{ device.status }}</text>
              </view>

              <view class="telemetry-grid">
                <view v-for="item in device.telemetry" :key="item.label" :class="['telemetry-box', item.wide ? 'wide' : '']">
                  <text class="telemetry-label">{{ item.label }}</text>
                  <view class="telemetry-value">
                    <StitchIcon v-if="item.icon" :name="item.icon" :class="item.tone" size="14px" />
                    <text>{{ item.value }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="floating-actions">
      <view class="action-panel">
        <view class="action-btn auth" hover-class="tap-press" @click="openAuth">
          <StitchIcon name="verified_user" size="32px" />
          <text>{{ copy.authAction }}</text>
        </view>
        <view class="action-btn manage" hover-class="tap-press" @click="openDevices">
          <StitchIcon name="settings" size="32px" />
          <view class="action-copy">
            <text>{{ copy.manageDevice }}</text>
            <text>{{ copy.manageHint }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item active" hover-class="tap-press" @click="showFeedback(copy.currentSection)">
        <StitchIcon name="grid_view" size="24px" fill />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goTasks">
        <StitchIcon name="assignment" size="24px" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goAssets">
        <StitchIcon name="account_balance_wallet" size="24px" />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goWallet">
        <StitchIcon name="account_balance" size="24px" />
        <text>{{ copy.wallet }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="24px" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { AuditStatus, CapacityStatus, OrderStatus, Role } from '@/models';
import { ownerQualificationIssue } from '@/services/compliance';
import { demoBatteryPct } from '@/services/device-status';
import { droneDisplayName } from '@/services/display-labels';
import { PRICE_CONFIG } from '@/stores/config-data';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

interface TelemetryItem {
  label: string;
  value: string;
  icon?: string;
  tone?: 'success' | 'cyan' | 'warning';
  wide?: boolean;
}

interface DeviceCard {
  id: string;
  name: string;
  code: string;
  status: string;
  tone: 'ready' | 'busy' | 'offline';
  icon: string;
  dim?: boolean;
  telemetry: TelemetryItem[];
}

const OWNER_HOME_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    ownerOnline: 'Owner profile online',
    signalHealthy: 'Network signal healthy',
    operationsState: 'Asset Operations State',
    totalFleet: 'Total Fleet',
    totalFleetToast: 'Total fleet: 12 units',
    onlineCapacity: 'Online Capacity',
    onlineCapacityToast: 'Online capacity: 8 of 12',
    guaranteeKpi: 'Guarantee Threshold KPI',
    guaranteeToast: 'KPI from owner operation stats',
    healthy: 'Healthy',
    watch: 'Watch',
    uptime: 'UPTIME',
    avgResponse: 'AVG RESPONSE',
    missionSuccess: 'MISSION SUCCESS',
    capacityPool: 'Capacity Pool',
    ready: 'Ready',
    busy: 'Busy',
    offline: 'Offline',
    readyToast: 'Ready capacity: 40%',
    busyToast: 'Busy capacity: 35%',
    offlineToast: 'Offline capacity: 25%',
    deviceQueue: 'Device Queue',
    viewAll: 'View All',
    readyStatus: 'READY',
    busyStatus: 'BUSY',
    offlineStatus: 'OFFLINE',
    battery: 'BATTERY',
    signal: 'SIGNAL',
    taskEta: 'TASK ETA',
    strong: 'Strong',
    maintenanceRequired: 'Maintenance Required',
    qualificationBlocked: 'Certification Required',
    maintenanceToast: 'Maintenance required before dispatch',
    authAction: 'Auth',
    manageDevice: 'Manage Devices',
    manageHint: '(Manage)',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    wallet: 'Wallet',
    profile: 'Profile',
    currentSection: 'Current section: Home',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    ownerOnline: '机主档案在线',
    signalHealthy: '网络信号正常',
    operationsState: '资产运营状态',
    totalFleet: '机队总数',
    totalFleetToast: '机队总数：12 台',
    onlineCapacity: '在线运力',
    onlineCapacityToast: '在线运力：8 / 12',
    guaranteeKpi: '保障阈值指标',
    guaranteeToast: '指标来自机主运营统计',
    healthy: '健康',
    watch: '关注',
    uptime: '在线率',
    avgResponse: '平均响应',
    missionSuccess: '任务成功率',
    capacityPool: '运力池',
    ready: '可用',
    busy: '忙碌',
    offline: '离线',
    readyToast: '可用运力：40%',
    busyToast: '忙碌运力：35%',
    offlineToast: '离线运力：25%',
    deviceQueue: '设备队列',
    viewAll: '查看全部',
    readyStatus: '可用',
    busyStatus: '任务中',
    offlineStatus: '离线',
    battery: '电量',
    signal: '信号',
    taskEta: '任务 ETA',
    strong: '强',
    maintenanceRequired: '需要维护',
    qualificationBlocked: '资质待补',
    maintenanceToast: '派单前需完成维护',
    authAction: '补认证',
    manageDevice: '管理设备',
    manageHint: '设备台账',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    wallet: '钱包',
    profile: '我的',
    currentSection: '当前栏目：首页',
    languageToast: '已切换为中文',
  },
} as const;

const userStore = useUserStore();
const localeStore = useLocaleStore();
const copy = computed(() => OWNER_HOME_COPY[localeStore.locale]);

if (userStore.user.currentRole !== Role.Owner) {
  userStore.loginAs(Role.Owner);
}

const user = computed(() => userStore.user);
const ownerDrones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const ownerCapacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id));
const ownerProfile = computed(() => repo.owners.find(user.value.id));
const ownerIssue = computed(() => ownerQualificationIssue(ownerProfile.value, repo.users.find(user.value.id)));
const ownerStats = computed(() => repo.owners.find(user.value.id)?.stats);

const fleetTotal = computed(() => ownerDrones.value.length);
const onlineCount = computed(() => ownerIssue.value ? 0 : ownerCapacity.value.filter((c) => c.status === CapacityStatus.Online).length);
const onlinePct = computed(() => fleetTotal.value ? Math.round((onlineCount.value / fleetTotal.value) * 100) : 0);

const uptimeText = computed(() => ownerStats.value ? `${(ownerStats.value.deviceUptime * 100).toFixed(1)}%` : '—');
const respText = computed(() => ownerStats.value ? `${Math.round(ownerStats.value.respSec)}s` : '—');
const successText = computed(() => ownerStats.value ? `${(ownerStats.value.completeRate * 100).toFixed(1)}%` : '—');
const kpiHealthy = computed(() => Boolean(ownerStats.value && ownerStats.value.deviceUptime >= 0.9 && ownerStats.value.completeRate >= 0.85));

type DroneBucket = 'ready' | 'busy' | 'offline';

function bucketOf(droneId: string): DroneBucket {
  const drone = repo.drones.find(droneId);
  if (!drone) return 'offline';
  const unit = ownerCapacity.value.find((c) => c.droneId === droneId);
  if (drone.status === 'busy' || unit?.status === CapacityStatus.Busy) return 'busy';
  if (ownerIssue.value) return 'offline';
  if (unit?.status === CapacityStatus.Online) return 'ready';
  return 'offline';
}

const poolSegments = computed(() => {
  const counts: Record<DroneBucket, number> = { ready: 0, busy: 0, offline: 0 };
  ownerDrones.value.forEach((drone) => { counts[bucketOf(drone.id)] += 1; });
  const total = Math.max(1, fleetTotal.value);
  const labels: Record<DroneBucket, string> = { ready: copy.value.ready, busy: copy.value.busy, offline: copy.value.offline };
  return (['ready', 'busy', 'offline'] as DroneBucket[]).map((key) => ({
    key,
    label: labels[key],
    count: counts[key],
    pct: Math.round((counts[key] / total) * 100),
  }));
});

function activeOrderEta(droneId: string): string {
  const order = repo.orders.where((o) => o.droneId === droneId && o.status !== OrderStatus.Settled && o.status !== OrderStatus.Cancelled).reverse()[0];
  if (!order) return '—';
  const eta = order.priceBreakdown ? Math.max(1, Math.round(order.priceBreakdown.durationCent / (PRICE_CONFIG.perMinYuan * 100))) : 15;
  return `${eta}m`;
}

const devices = computed<DeviceCard[]>(() => ownerDrones.value.map((drone) => {
  const bucket = bucketOf(drone.id);
  const compliant = !ownerIssue.value && drone.airworthiness === AuditStatus.Approved && drone.insured.thirdPartyAmount >= PRICE_CONFIG.minThirdParty;
  const battery = demoBatteryPct(drone.id);
  if (bucket === 'offline' && ownerIssue.value) {
    return {
      id: drone.id,
      name: droneDisplayName(drone),
      code: drone.sn,
      status: copy.value.qualificationBlocked,
      tone: 'offline',
      icon: 'lock',
      dim: true,
      telemetry: [{ label: '', value: ownerIssue.value, wide: true }],
    };
  }
  if (bucket === 'offline' && (!compliant || drone.status === 'maintenance')) {
    return {
      id: drone.id,
      name: droneDisplayName(drone),
      code: drone.sn,
      status: copy.value.maintenanceRequired,
      tone: 'offline',
      icon: 'power_off',
      dim: true,
      telemetry: [{ label: '', value: copy.value.maintenanceRequired, wide: true }],
    };
  }
  if (bucket === 'busy') {
    return {
      id: drone.id,
      name: droneDisplayName(drone),
      code: drone.sn,
      status: copy.value.busyStatus,
      tone: 'busy',
      icon: 'moving',
      telemetry: [
        { label: copy.value.taskEta, value: activeOrderEta(drone.id), icon: 'timer' },
        { label: copy.value.battery, value: `${battery}%`, icon: battery <= 45 ? 'battery_4_bar' : 'battery_charging_full', tone: battery <= 45 ? 'warning' : 'success' },
      ],
    };
  }
  return {
    id: drone.id,
    name: droneDisplayName(drone),
    code: drone.sn,
    status: bucket === 'ready' ? copy.value.readyStatus : copy.value.offlineStatus,
    tone: bucket === 'ready' ? 'ready' : 'offline',
    icon: bucket === 'ready' ? 'flight_takeoff' : 'power_off',
    dim: bucket !== 'ready',
    telemetry: [
      { label: copy.value.battery, value: `${battery}%`, icon: 'battery_charging_full', tone: 'success' },
      { label: copy.value.signal, value: copy.value.strong, icon: 'signal_cellular_4_bar', tone: 'cyan' },
    ],
  };
}));

function showFeedback(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function handleDevice(device: DeviceCard) {
  if (device.status === copy.value.maintenanceRequired) {
    showFeedback(copy.value.maintenanceToast);
  }
  uni.navigateTo({ url: '/pages-owner/devices/index' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  showFeedback(copy.value.languageToast);
}

function openAuth() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function openDevices() {
  uni.navigateTo({ url: '/pages-owner/devices/index' });
}

function goTasks() {
  uni.navigateTo({ url: '/pages-owner/dispatch/index' });
}

function goAssets() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function goWallet() {
  uni.navigateTo({ url: '/pages-owner/wallet/index' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/auth/index' });
}
</script>

<style lang="scss" scoped>
.owner-dashboard {
  min-height: 100vh;
  background: $bg-page;
  color: #dfe2f0;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 70;
  height: 64px;
  padding: 0 16px;
  border-bottom: 1px solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  border: 1px solid #3a494b;
  background: #313540;
  flex: 0 0 32px;
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.language-switch {
  min-width: 54px;
  height: 40px;
  padding: 0 10px;
  border: 1px solid #3a494b;
  border-radius: 6px;
  background: rgba(49, 53, 64, .72);
  color: #00f2ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 14px;
  line-height: 38px;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.signal-button {
  width: 40px;
  height: 40px;
  color: #e1fdff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .section-head,
.zh-copy .pool-title,
.zh-copy .queue-head,
.zh-copy .metric-value,
.zh-copy .capacity-main,
.zh-copy .language-switch,
.zh-copy .action-btn {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
}

.zh-copy .metric-label,
.zh-copy .stat-label,
.zh-copy .device-id,
.zh-copy .state-badge,
.zh-copy .telemetry-value,
.zh-copy .nav-item text {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .brand {
  font-size: 24px;
}

.content {
  position: fixed;
  left: 0;
  right: 0;
  top: 64px;
  bottom: 118px;
  padding: 24px 16px 118px;
  box-sizing: border-box;
  background:
    radial-gradient(96% 48% at 50% -12%, rgba(0, 242, 255, .13), transparent 68%),
    linear-gradient(0deg, rgba(0, 242, 255, .045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 242, 255, .045) 1px, transparent 1px),
    $bg-page;
  background-size: auto, 24px 24px, 24px 24px, auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.section-head {
  margin-bottom: 24px;
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}

.auth-warning {
  margin: -8px 0 16px;
  padding: 12px 14px;
  border: 1px solid rgba(239, 68, 68, .58);
  border-radius: 6px;
  color: #fecaca;
  background: rgba(127, 29, 29, .42);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 18px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.metric-card,
.pool-card,
.device-card {
  border-radius: 8px;
  border: 1px solid #3a494b;
  background: #171b26;
  box-sizing: border-box;
}

.metric-card {
  min-height: 141px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-label,
.guarantee-head,
.capacity-row,
.legend-row,
.legend-item,
.queue-head,
.view-all,
.device-top,
.device-title,
.telemetry-value,
.action-panel,
.action-btn,
.bottom-nav,
.nav-item {
  display: flex;
  align-items: center;
}

.metric-label {
  gap: 12px;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 2px;
  font-weight: 700;
  white-space: nowrap;
}

.metric-label text {
  white-space: nowrap;
}

.online-card .metric-label {
  align-items: flex-start;
}

.online-card .metric-label text {
  width: 92px;
  white-space: normal;
}

.metric-label.compact {
  min-width: 0;
  gap: 12px;
  letter-spacing: 2px;
}

.metric-label.compact text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 40px;
  line-height: 48px;
  font-weight: 700;
}

.capacity-row {
  gap: 8px;
  margin-top: 18px;
  align-items: baseline;
}

.capacity-main {
  color: #00f2ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 40px;
  line-height: 48px;
  font-weight: 700;
}

.capacity-sub {
  color: #b9cacb;
  font-size: 18px;
  line-height: 24px;
}

.progress-track {
  height: 4px;
  border-radius: 4px;
  background: #353944;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  background: #00f2ff;
}

.guarantee-card {
  grid-column: 1 / span 2;
  min-height: 124px;
}

.guarantee-head {
  justify-content: space-between;
  gap: 12px;
}

.healthy {
  color: #10b981;
  font-size: 16px;
  line-height: 24px;
  flex: 0 0 auto;
}

.guarantee-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 22px;
}

.stat-value,
.stat-label {
  display: block;
}

.stat-value {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 1px;
}

.stat-label {
  margin-top: 4px;
  color: #b9cacb;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 1.6px;
}

.pool-card {
  margin-top: 24px;
  padding: 16px;
}

.pool-title {
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}

.pool-bar {
  height: 48px;
  margin-top: 24px;
  border-radius: 8px;
  border: 1px solid #3a494b;
  overflow: hidden;
  display: flex;
}

.pool-seg {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "JetBrains Mono", monospace;
  font-size: 14px;
  line-height: 20px;
}

.pool-seg.ready {
  color: #0b0e14;
  background: #00f2ff;
}

.pool-seg.busy {
  color: #0b0e14;
  background: #f59e0b;
}

.pool-seg.offline {
  color: #b9cacb;
  background: #353944;
}

.legend-row {
  justify-content: space-between;
  margin-top: 16px;
}

.legend-item {
  gap: 8px;
  color: #dfe2f0;
  font-size: 14px;
  line-height: 20px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex: 0 0 12px;
}

.legend-dot.ready {
  background: #00f2ff;
}

.legend-dot.busy {
  background: #f59e0b;
}

.legend-dot.offline {
  background: #353944;
}

.queue-section {
  position: relative;
  z-index: 2;
  margin-top: 24px;
}

.queue-head {
  justify-content: space-between;
  margin-bottom: 16px;
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
}

.view-all {
  gap: 4px;
  color: #00f2ff;
  font-family: Inter, sans-serif;
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
}

.device-scroll {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 164px;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.device-scroll::-webkit-scrollbar {
  display: none;
}

.device-track {
  position: relative;
  z-index: 2;
  display: flex;
  gap: 16px;
  width: max-content;
  height: 164px;
  padding-bottom: 16px;
}

.device-card {
  position: relative;
  z-index: 3;
  width: 280px;
  min-height: 146px;
  padding: 16px;
  background: #1e2433;
  display: flex;
  flex-direction: column;
  flex: 0 0 280px;
}

.device-card.dim {
  opacity: .7;
}

.device-top {
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.device-title {
  min-width: 0;
  gap: 12px;
}

.device-icon {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: #353944;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 40px;
}

.device-icon.ready {
  color: #00f2ff;
}

.device-icon.busy {
  color: #f59e0b;
}

.device-icon.offline {
  color: #b9cacb;
}

.device-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.device-name {
  color: #dfe2f0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}

.device-id {
  margin-top: 2px;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 1px;
  font-weight: 700;
}

.state-badge {
  padding: 4px 8px;
  border-radius: 2px;
  font-size: 10px;
  line-height: 14px;
  letter-spacing: 1.2px;
  font-weight: 700;
  flex: 0 0 auto;
}

.state-badge.ready {
  color: #00f2ff;
  border: 1px solid rgba(0, 242, 255, .3);
  background: rgba(0, 242, 255, .1);
}

.state-badge.busy {
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, .3);
  background: rgba(245, 158, 11, .1);
}

.state-badge.offline {
  color: #b9cacb;
  border: 1px solid #3a494b;
  background: #353944;
}

.telemetry-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.telemetry-box {
  min-height: 58px;
  padding: 8px;
  border-radius: 6px;
  background: #171b26;
  box-sizing: border-box;
}

.telemetry-box.wide {
  grid-column: 1 / span 2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b9cacb;
}

.telemetry-label {
  display: block;
  min-height: 14px;
  color: #b9cacb;
  font-size: 10px;
  line-height: 14px;
  text-transform: uppercase;
}

.telemetry-value {
  gap: 4px;
  margin-top: 4px;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 14px;
  line-height: 20px;
}

.telemetry-value .success {
  color: #10b981;
}

.telemetry-value .cyan {
  color: #00f2ff;
}

.telemetry-value .warning {
  color: #f59e0b;
}

.floating-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 64px;
  z-index: 80;
  padding: 0 16px;
  box-sizing: border-box;
}

.action-panel {
  gap: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(58, 73, 75, .5);
  background: rgba(30, 36, 51, .6);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .35);
}

.action-btn {
  flex: 1;
  min-height: 56px;
  border-radius: 8px;
  justify-content: center;
  gap: 10px;
  box-sizing: border-box;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.action-btn.auth {
  color: #3b82f6;
  border: 1px solid #3b82f6;
  background: transparent;
}

.action-btn.manage {
  color: #00363a;
  background: #00f2ff;
}

.action-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 20px;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  min-height: 64px;
  padding: 8px 8px 16px;
  border-top: 1px solid #3a494b;
  border-radius: 8px 8px 0 0;
  background: #0f131d;
  justify-content: space-around;
  box-shadow: 0 -8px 20px rgba(0, 0, 0, .28);
  box-sizing: border-box;
}

.nav-item {
  min-width: 56px;
  padding: 8px;
  border-radius: 999px;
  color: #b9cacb;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
}

.nav-item.active {
  min-width: 73px;
  padding: 4px 16px;
  color: #00f2ff;
  background: rgba(5, 102, 217, .2);
}

.nav-item text {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 2px;
  font-weight: 700;
}

.tap-press {
  opacity: .78;
  transform: scale(.985);
}
</style>
