<template>
  <view class="pilot-dashboard" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="scanline" />

    <view class="topbar">
      <view class="brand-wrap">
        <image class="pilot-avatar" src="/static/stitch/pilot-dashboard-avatar.png" mode="aspectFill" />
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showToast(copy.signalReady)">
          <StitchIcon name="signal_cellular_alt" size="49rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="hero-row">
        <view class="hero-copy">
          <text class="callsign">{{ callsign }}</text>
          <text class="hero-title">{{ heroTitle }}</text>
        </view>
        <view class="uplink-pill">
          <view class="uplink-dot" />
          <text>{{ copy.uplinkOk }}</text>
        </view>
      </view>

      <view v-if="advisory" class="advisory-card" hover-class="tap-press" @click="openHall">
        <view class="advisory-line" />
        <StitchIcon class="warning-symbol" name="warning" size="47rpx" fill />
        <view class="advisory-copy">
          <view class="advisory-head">
            <text class="advisory-title">{{ advisory.title }}</text>
            <text class="advisory-time">{{ advisory.time }}</text>
          </view>
          <text class="advisory-body">{{ advisory.body }}</text>
        </view>
      </view>

      <view class="mission-card" hover-class="tap-press" @click="openTaskOrHall">
        <image class="mission-bg" src="/static/stitch/pilot-dashboard-map.png" mode="aspectFill" />
        <view class="mission-inner">
          <view class="mission-head">
            <view class="waypoint-label">
              <StitchIcon name="my_location" size="28rpx" />
              <text>{{ copy.activeWaypoint }}</text>
            </view>
            <view class="route-state">{{ missionStage }}</view>
          </view>
          <text class="mission-title">{{ missionTitle }}</text>
          <view class="mission-order-row">
            <text class="mission-order-label">{{ copy.taskNoPrefix }}</text>
            <text class="mission-order-code">{{ taskCode }}</text>
          </view>
          <text class="mission-route">{{ routeSummary }}</text>
          <view class="mission-facts">
            <text>{{ cargoSummary }}</text>
            <text v-if="scheduleSummary">{{ scheduleSummary }}</text>
          </view>
          <text v-if="flightTraceText" class="mission-trace">{{ copy.flightTracePrefix }} <text>{{ flightTraceText }}</text></text>
          <view class="progress-row">
            <view class="origin-dot" />
            <view class="progress-track">
              <view class="progress-fill" :style="{ width: `${missionProgressPct}%` }" />
            </view>
            <view class="dest-dot" />
          </view>
          <view class="progress-meta">
            <text>{{ copy.departed }}</text>
            <text>{{ copy.estPrefix }} {{ etaClock }}</text>
          </view>
        </view>
      </view>

      <view class="stats-grid">
        <view class="status-card power-card" hover-class="tap-press" @click="openTaskOrHall">
          <text class="card-label">{{ copy.powerCell }}</text>
          <view class="battery-gauge">
            <view class="gauge-ring" />
            <text>{{ batteryText }}</text>
          </view>
          <text class="status-bottom">{{ copy.discharging }}</text>
        </view>

        <view class="status-card dispatch-card" hover-class="tap-press" @click="openHall">
          <text class="card-label">{{ copy.dispatch }}</text>
          <view class="dispatch-icon">
            <StitchIcon name="assignment" size="83rpx" />
            <view class="dispatch-dot" />
          </view>
          <text class="dispatch-count">{{ pendingDispatchCount }}</text>
          <text class="dispatch-label">{{ copy.pending }}</text>
        </view>
      </view>

      <view class="command-section">
        <text class="command-title">{{ copy.commandActions }}</text>
        <view class="action-grid">
          <view class="action-card earnings" hover-class="tap-press" @click="openWallet">
            <view class="action-icon">
              <StitchIcon name="account_balance_wallet" size="52rpx" />
            </view>
            <text>{{ copy.earnings }}</text>
          </view>
          <view class="action-card accept" hover-class="tap-press" @click="openHall">
            <view class="action-icon dark">
              <StitchIcon name="flight_takeoff" size="40rpx" />
            </view>
            <text>{{ copy.acceptOrders }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item active">
        <StitchIcon name="grid_view" size="40rpx" fill />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="openHall">
        <StitchIcon name="assignment" size="42rpx" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="openCredit">
        <StitchIcon name="account_balance_wallet" size="42rpx" />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="openWallet">
        <StitchIcon name="account_balance" size="42rpx" />
        <text>{{ copy.wallet }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="openProfile">
        <StitchIcon name="person" size="40rpx" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { CargoType, OrderStatus, Role } from '@/models';
import type { GeoPoint } from '@/models';
import { currentPilotOrder, matchingOrdersForPilot } from '@/services/app-flow';
import { pilotQualificationIssue } from '@/services/compliance';
import { demoBatteryPct } from '@/services/device-status';
import { orderStatusLabel } from '@/services/display-labels';
import { isCoordinateAddress, isGenericMapAddress } from '@/services/geocoding';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';
import { useUserStore } from '@/stores/user';
import { distanceKm } from '@/utils/geo';
import { etaMinutes } from '@/utils/price';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const orderStore = useOrderStore();
const localeStore = useLocaleStore();

if (userStore.user.currentRole !== Role.Pilot) {
  userStore.loginAs(Role.Pilot);
}

const PILOT_HOME_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    signalReady: 'Signal ready',
    callsignPrefix: 'CALLSIGN: ',
    heroTitle: 'Ready for Deployment',
    qualificationBlockedHero: 'Qualification blocked',
    uplinkOk: 'UPLINK OK',
    standby: 'STANDBY',
    airspaceApproved: 'AIRSPACE APPROVED',
    justNow: 'JUST NOW',
    minutesAgo: 'M AGO',
    hoursAgo: 'H AGO',
    activeWaypoint: 'ACTIVE WAYPOINT',
    enRoute: 'EN ROUTE',
    taskNoPrefix: 'TASK NO:',
    flightTracePrefix: 'FLIGHT TRACE:',
    flightTraceRecording: 'RECORDING',
    flightTraceReady: 'ARCHIVED',
    routeFallback: 'No assigned route',
    originFallback: 'Loading point',
    destinationFallback: 'Delivery point',
    noMissionMeta: 'Waiting for dispatch',
    instantSchedule: 'Immediate task',
    scheduledPrefix: 'Scheduled',
    distanceUnit: 'km',
    cargoUnit: 'KG',
    departed: 'DEPARTED',
    estPrefix: 'EST:',
    powerCell: 'PWR CELL',
    discharging: 'DISCHARGING',
    dispatch: 'DISPATCH',
    pending: 'PENDING',
    commandActions: 'COMMAND ACTIONS',
    earnings: 'Earnings',
    acceptOrders: 'Accept Orders',
    fallbackMission: 'Medical Resupply: Outpost V',
    profileToast: 'Current identity: Pilot',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    wallet: 'Wallet',
    profile: 'Profile',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    signalReady: '信号正常',
    callsignPrefix: '呼号：',
    heroTitle: '待命可起飞',
    qualificationBlockedHero: '资质待补',
    uplinkOk: '链路正常',
    standby: '待命',
    airspaceApproved: '空域已批准',
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前',
    activeWaypoint: '当前航点',
    enRoute: '航行中',
    taskNoPrefix: '任务单号：',
    flightTracePrefix: '飞行轨迹：',
    flightTraceRecording: '记录中',
    flightTraceReady: '已归档',
    routeFallback: '暂无任务路线',
    originFallback: '装货点',
    destinationFallback: '卸货点',
    noMissionMeta: '等待派单',
    instantSchedule: '即时任务',
    scheduledPrefix: '预约',
    distanceUnit: '公里',
    cargoUnit: 'KG',
    departed: '已出发',
    estPrefix: '预计：',
    powerCell: '电池',
    discharging: '放电中',
    dispatch: '派单',
    pending: '待处理',
    commandActions: '指令操作',
    earnings: '收益',
    acceptOrders: '接单',
    fallbackMission: '医疗补给：前哨站 V',
    profileToast: '当前为飞手身份',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    wallet: '钱包',
    profile: '我的',
    languageToast: '已切换为中文',
  },
} as const;
const copy = computed(() => PILOT_HOME_COPY[localeStore.locale]);
const user = computed(() => userStore.user);
const qualificationIssue = computed(() => pilotQualificationIssue(repo.pilots.find(user.value.id)));
const notifications = computed(() => repo.notifications.where((n) => n.userId === user.value.id && !n.read));
const matchingCount = computed(() => {
  try {
    return matchingOrdersForPilot(user.value.id).length;
  } catch {
    return 0;
  }
});
const telemetryStore = useTelemetryStore();
const order = computed(() => {
  return currentPilotOrder(user.value.id, orderStore.activeOrder);
});
const airspace = computed(() => order.value ? repo.airspace.where((item) => item.orderId === order.value!.id)[0] : undefined);
const missionTitle = computed(() => order.value?.cargo.remark || copy.value.fallbackMission);
const pendingDispatchCount = computed(() => Math.max(notifications.value.length, matchingCount.value));

const callsign = computed(() => `${copy.value.callsignPrefix}${user.value.nickname || user.value.id.toUpperCase()}`);
const heroTitle = computed(() => qualificationIssue.value ? copy.value.qualificationBlockedHero : copy.value.heroTitle);
const taskCode = computed(() => order.value ? order.value.id.toUpperCase() : '—');
const missionStage = computed(() => {
  if (!order.value) return copy.value.standby;
  if (order.value.status === OrderStatus.AirspaceApplying && airspace.value?.status === 'approved') return copy.value.airspaceApproved;
  return orderStatusLabel(order.value.status, localeStore.locale);
});
const routeSummary = computed(() => {
  const current = order.value;
  if (!current) return copy.value.routeFallback;
  return `${pointAddress(current.from, copy.value.originFallback)} -> ${pointAddress(current.to, copy.value.destinationFallback)}`;
});
const cargoSummary = computed(() => {
  const current = order.value;
  if (!current) return copy.value.noMissionMeta;
  const km = current.distanceKm ?? distanceKm(current.from, current.to);
  return `${cargoLabel(current.cargo.type)} · ${current.cargo.weightKg}${copy.value.cargoUnit} · ${km.toFixed(1)}${copy.value.distanceUnit}`;
});
const scheduleSummary = computed(() => {
  const current = order.value;
  if (!current) return '';
  if (current.timeMode === 'scheduled' && current.scheduledAt) return `${copy.value.scheduledPrefix} ${formatSchedule(current.scheduledAt)}`;
  return copy.value.instantSchedule;
});
const flightTraceText = computed(() => {
  const status = order.value?.status;
  if (status === OrderStatus.InFlight) return copy.value.flightTraceRecording;
  if (status && [OrderStatus.Unloading, OrderStatus.Completed, OrderStatus.Settled].includes(status)) return copy.value.flightTraceReady;
  return '';
});

const CARGO_LABELS = {
  en: {
    [CargoType.Normal]: 'General cargo',
    [CargoType.Valuable]: 'Valuable cargo',
    [CargoType.Dangerous]: 'Hazardous cargo',
    [CargoType.Agricultural]: 'Agricultural cargo',
  },
  zh: {
    [CargoType.Normal]: '普货',
    [CargoType.Valuable]: '贵重货物',
    [CargoType.Dangerous]: '危险品',
    [CargoType.Agricultural]: '农资',
  },
} as const;

const MISSION_PCT: Partial<Record<OrderStatus, number>> = {
  [OrderStatus.Confirmed]: 10,
  [OrderStatus.AirspaceApplying]: 20,
  [OrderStatus.Preparing]: 35,
  [OrderStatus.Loading]: 50,
  [OrderStatus.InFlight]: 70,
  [OrderStatus.Unloading]: 90,
  [OrderStatus.Completed]: 100,
  [OrderStatus.Settled]: 100,
};
const missionProgressPct = computed(() => order.value ? (MISSION_PCT[order.value.status] ?? 5) : 0);

const etaClock = computed(() => {
  const current = order.value;
  if (!current) return '--:--';
  const km = current.distanceKm ?? distanceKm(current.from, current.to);
  const date = new Date(Date.now() + etaMinutes(km) * 60 * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
});

const batteryText = computed(() => {
  if (telemetryStore.latest) return `${telemetryStore.latest.batteryPct}%`;
  const droneId = order.value?.droneId;
  return droneId ? `${demoBatteryPct(droneId)}%` : '—';
});

const advisory = computed(() => {
  const latest = repo.notifications
    .where((n) => n.userId === user.value.id)
    .slice()
    .sort((a, b) => notificationTimeMs(b.createdAt) - notificationTimeMs(a.createdAt))[0];
  if (!latest) return undefined;
  return { title: latest.title, body: latest.body, time: relativeTime(latest.createdAt) };
});

function notificationTimeMs(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function relativeTime(value: string) {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMin < 1) return copy.value.justNow;
  if (diffMin < 60) return `${diffMin}${copy.value.minutesAgo}`;
  return `${Math.round(diffMin / 60)}${copy.value.hoursAgo}`;
}

function cargoLabel(type: CargoType | string) {
  return CARGO_LABELS[localeStore.locale][type as CargoType] ?? `${type}`;
}

function pointAddress(point: GeoPoint, fallback: string) {
  const value = point.address?.trim();
  if (value && !isGenericMapAddress(value) && !isCoordinateAddress(value)) return shortAddress(value, fallback);
  return localeStore.isZh ? `${fallback}待确认` : `${fallback} pending`;
}

function shortAddress(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
}

function formatSchedule(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function openHall() {
  uni.navigateTo({ url: '/pages-pilot/hall/index' });
}

function openTaskOrHall() {
  if (order.value) {
    uni.navigateTo({ url: '/pages-pilot/task/index' });
    return;
  }
  uni.navigateTo({ url: '/pages-pilot/hall/index' });
}

function openWallet() {
  uni.navigateTo({ url: '/pages-pilot/wallet/index' });
}

function openCredit() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function openProfile() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function showToast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  showToast(copy.value.languageToast);
}
</script>

<style lang="scss" scoped>
.pilot-dashboard {
  min-height: 100vh;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 196rpx;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.scanline {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(to bottom, rgba(0, 242, 255, 0) 0, rgba(0, 242, 255, 0) 7rpx, rgba(0, 242, 255, .05) 8rpx, rgba(0, 242, 255, .05) 10rpx);
  background-size: 100% 10rpx;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 60;
  height: 126rpx;
  padding: 0 32rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap,
.top-actions,
.signal-button,
.hero-row,
.uplink-pill,
.advisory-card,
.advisory-head,
.mission-head,
.waypoint-label,
.progress-row,
.progress-meta,
.bottom-nav,
.nav-item {
  display: flex;
  align-items: center;
}

.brand-wrap {
  gap: 22rpx;
  min-width: 0;
  flex: 1;
}

.pilot-avatar {
  width: 62rpx;
  height: 62rpx;
  flex: 0 0 62rpx;
  border-radius: 50%;
  border: 2rpx solid #3a494b;
  background: #141822;
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 45rpx;
  line-height: 58rpx;
  font-weight: 900;
  letter-spacing: 0;
  @include ellipsis(1);
}

.top-actions {
  gap: 12rpx;
  flex: 0 0 auto;
}

.language-switch {
  min-width: 56rpx;
  height: 44rpx;
  padding: 0 14rpx;
  border: 2rpx solid #3a494b;
  border-radius: 8rpx;
  background: rgba(49, 53, 64, .72);
  color: #00f2ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 18rpx;
  line-height: 40rpx;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.signal-button {
  width: 62rpx;
  height: 62rpx;
  color: #e1fdff;
  justify-content: center;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .language-switch,
.zh-copy .callsign,
.zh-copy .hero-title,
.zh-copy .uplink-pill,
.zh-copy .advisory-time,
.zh-copy .waypoint-label,
.zh-copy .route-state,
.zh-copy .mission-title,
.zh-copy .mission-order-label,
.zh-copy .mission-order-code,
.zh-copy .mission-route,
.zh-copy .mission-facts,
.zh-copy .mission-trace,
.zh-copy .progress-meta,
.zh-copy .card-label,
.zh-copy .status-bottom,
.zh-copy .dispatch-label,
.zh-copy .command-title,
.zh-copy .nav-item {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .uplink-pill {
  font-size: 28rpx;
}

.content {
  position: relative;
  z-index: 1;
  padding: 188rpx 32rpx 0;
}

.hero-row {
  justify-content: space-between;
  align-items: flex-end;
  gap: 24rpx;
}

.hero-copy {
  min-width: 0;
}

.callsign {
  display: block;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 27rpx;
  line-height: 38rpx;
  font-weight: 900;
  letter-spacing: .15em;
}

.hero-title {
  display: block;
  margin-top: 15rpx;
  color: #f0f3ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 49rpx;
  line-height: 1.22;
  font-weight: 900;
  max-width: 360rpx;
}

.uplink-pill {
  width: 244rpx;
  min-height: 98rpx;
  padding: 16rpx 24rpx;
  border-radius: 26rpx;
  border: 2rpx solid #3a494b;
  background: #292e38;
  gap: 18rpx;
  box-sizing: border-box;
  color: #10b981;
  font-family: "JetBrains Mono", monospace;
  font-size: 31rpx;
  line-height: 38rpx;
  font-weight: 900;
  letter-spacing: .18em;
}

.uplink-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 18rpx rgba(16, 185, 129, .75);
  flex: 0 0 18rpx;
}

.advisory-card {
  position: relative;
  min-height: 230rpx;
  margin-top: 42rpx;
  padding: 34rpx 30rpx 31rpx 111rpx;
  border-radius: 14rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
  overflow: hidden;
}

.advisory-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  background: #f59e0b;
}

.warning-symbol {
  position: absolute;
  left: 36rpx;
  top: 42rpx;
  color: #f59e0b;
}

.advisory-copy {
  min-width: 0;
  width: 100%;
}

.advisory-head {
  justify-content: space-between;
  gap: 20rpx;
}

.advisory-title {
  color: #f0f3ff;
  font-size: 32rpx;
  line-height: 40rpx;
  font-weight: 900;
}

.advisory-time {
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 900;
  letter-spacing: .18em;
  white-space: nowrap;
}

.advisory-body {
  display: block;
  margin-top: 13rpx;
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 36rpx;
  font-weight: 500;
}

.mission-card {
  position: relative;
  min-height: 476rpx;
  margin-top: 34rpx;
  padding: 40rpx 42rpx 37rpx;
  border-radius: 14rpx;
  border: 2rpx solid #3a494b;
  background: #11161f;
  box-sizing: border-box;
  overflow: hidden;
}

.mission-bg {
  position: absolute;
  right: 0;
  top: 0;
  width: 68%;
  height: 100%;
  opacity: .16;
  filter: grayscale(1) contrast(1.5);
}

.mission-inner {
  position: relative;
  z-index: 1;
}

.mission-head {
  justify-content: space-between;
  gap: 20rpx;
}

.waypoint-label {
  min-width: 0;
  gap: 13rpx;
  color: #00f2ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 900;
  letter-spacing: .22em;
}

.waypoint-label :deep(.stitch-icon) {
  color: currentColor;
}

.route-state {
  min-width: 160rpx;
  min-height: 46rpx;
  padding: 8rpx 18rpx;
  border-radius: 4rpx;
  border: 2rpx solid #849495;
  background: rgba(225, 253, 255, .08);
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 24rpx;
  line-height: 30rpx;
  font-weight: 900;
  letter-spacing: .18em;
  text-align: center;
  box-sizing: border-box;
}

.mission-title {
  display: block;
  margin-top: 42rpx;
  color: #f0f3ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 41rpx;
  line-height: 40rpx;
  font-weight: 900;
  letter-spacing: -1rpx;
  @include ellipsis(1);
}

.mission-order-row {
  display: flex;
  align-items: baseline;
  min-width: 0;
  margin-top: 18rpx;
  gap: 8rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 29rpx;
  line-height: 39rpx;
  font-weight: 700;
  letter-spacing: .08em;
}

.mission-order-label {
  flex: 0 0 auto;
}

.mission-order-code {
  min-width: 0;
  color: #dfe2f0;
  @include ellipsis(1);
}

.mission-route {
  display: block;
  margin-top: 14rpx;
  color: #f0f3ff;
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: 800;
  @include ellipsis(1);
}

.mission-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}

.mission-facts text {
  min-height: 42rpx;
  padding: 7rpx 14rpx;
  border: 2rpx solid rgba(132, 148, 149, .54);
  border-radius: 4rpx;
  background: rgba(20, 24, 34, .78);
  color: #b9cacb;
  font-size: 22rpx;
  line-height: 28rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.mission-trace {
  display: block;
  margin-top: 14rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 800;
  letter-spacing: .08em;
}

.mission-trace text {
  color: #dfe2f0;
}

.progress-row {
  margin-top: 28rpx;
  gap: 15rpx;
}

.origin-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  background: #00f2ff;
  box-shadow: 0 0 20rpx rgba(0, 242, 255, .75);
  flex: 0 0 24rpx;
}

.dest-dot {
  width: 21rpx;
  height: 21rpx;
  border-radius: 50%;
  border: 2rpx solid #849495;
  background: #313540;
  flex: 0 0 21rpx;
}

.progress-track {
  flex: 1;
  height: 4rpx;
  background: rgba(0, 242, 255, .28);
}

.progress-fill {
  height: 100%;
  background: #00f2ff;
}

.progress-meta {
  margin-top: 18rpx;
  justify-content: space-between;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 20rpx;
  line-height: 27rpx;
  font-weight: 900;
  letter-spacing: .08em;
}

.progress-meta text:first-child {
  color: #00f2ff;
}

.stats-grid {
  margin-top: 34rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 33rpx;
}

.status-card {
  min-height: 256rpx;
  border-radius: 14rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
  padding: 28rpx 25rpx 24rpx;
}

.card-label {
  display: block;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 900;
  letter-spacing: .22em;
}

.power-card,
.dispatch-card {
  display: flex;
  flex-direction: column;
}

.battery-gauge {
  position: relative;
  width: 132rpx;
  height: 132rpx;
  margin: 22rpx auto 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gauge-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    conic-gradient(#00f2ff 0deg, #00f2ff 281deg, #313540 281deg, #313540 360deg);
}

.gauge-ring::after {
  content: "";
  position: absolute;
  inset: 11rpx;
  border-radius: 50%;
  background: #141822;
}

.battery-gauge text {
  position: relative;
  color: #f0f3ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 31rpx;
  line-height: 40rpx;
  font-weight: 900;
}

.status-bottom {
  display: block;
  margin-top: auto;
  color: #00f2ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 900;
  letter-spacing: .2em;
  text-align: center;
}

.dispatch-icon {
  position: relative;
  width: 94rpx;
  height: 94rpx;
  margin: 13rpx auto 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dfe2f0;
}

.dispatch-icon :deep(.stitch-icon) {
  color: currentColor;
}

.dispatch-dot {
  position: absolute;
  right: 2rpx;
  top: 0;
  width: 17rpx;
  height: 17rpx;
  border-radius: 50%;
  background: #ef4444;
}

.dispatch-count {
  display: block;
  margin-top: 8rpx;
  color: #f0f3ff;
  font-size: 49rpx;
  line-height: 59rpx;
  font-weight: 900;
  text-align: center;
}

.dispatch-label {
  display: block;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 900;
  letter-spacing: .2em;
  text-align: center;
}

.command-section {
  margin-top: 42rpx;
}

.command-title {
  display: block;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 24rpx;
  line-height: 33rpx;
  font-weight: 900;
  letter-spacing: .18em;
}

.action-grid {
  margin-top: 25rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 33rpx;
}

.action-card {
  min-height: 200rpx;
  border-radius: 14rpx;
  border: 2rpx solid #3a494b;
  box-sizing: border-box;
  padding: 32rpx 24rpx 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
}

.action-card.earnings {
  background: #1e2433;
  color: #dfe2f0;
}

.action-card.accept {
  background: #00f2ff;
  color: #061014;
  border-color: #00f2ff;
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 27rpx;
  border: 2rpx solid #3a494b;
  background: #262a34;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dfe2f0;
}

.action-icon.dark {
  background: rgba(0, 32, 34, .16);
  border-color: transparent;
  color: #061014;
}

.action-icon :deep(.stitch-icon) {
  color: currentColor;
}

.action-card text {
  font-size: 29rpx;
  line-height: 39rpx;
  font-weight: 900;
  text-align: center;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  height: 150rpx;
  padding: 12rpx 22rpx 8rpx;
  border-top: 2rpx solid #3a494b;
  border-top-left-radius: 14rpx;
  border-top-right-radius: 14rpx;
  background: #0f131d;
  justify-content: space-around;
  box-sizing: border-box;
}

.nav-item {
  min-width: 94rpx;
  height: 112rpx;
  color: #b9cacb;
  flex-direction: column;
  justify-content: center;
  gap: 4rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 27rpx;
  font-weight: 900;
  letter-spacing: .08em;
}

.nav-item :deep(.stitch-icon) {
  color: currentColor;
}

.nav-item.active {
  min-width: 126rpx;
  border-radius: 31rpx;
  background: rgba(5, 102, 217, .32);
  color: #00f2ff;
}

.tap-press {
  opacity: .86;
  transform: translateY(2rpx);
}
</style>
