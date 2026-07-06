<template>
  <view class="flight-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand-wrap">
        <view class="avatar-button">
          <StitchIcon name="person" size="37rpx" />
        </view>
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="handleTelemetryAction">
          <StitchIcon name="signal_cellular_alt" size="48rpx" fill />
        </view>
      </view>
    </view>

    <view class="content">
      <LiveRouteMap
        v-if="order"
        :from="order.from"
        :to="order.to"
        :frame="latest"
        :craft-tag="craftTag"
        :locale="localeStore.locale"
        :live="order.status === OrderStatus.InFlight"
        :gps-status="routeMapGpsStatus"
      />
      <view v-else class="empty-map-panel">
        <StitchIcon name="route" size="54rpx" />
        <text>{{ copy.noTrackOrder }}</text>
      </view>

      <view class="telemetry-grid">
        <view class="metric-card altitude">
          <view class="metric-head">
            <text>{{ copy.altitude }}</text>
            <StitchIcon name="height" size="33rpx" />
          </view>
          <view class="metric-value">
            <text class="value cyan">{{ altitude }}</text>
            <text class="unit">m</text>
          </view>
          <view class="bars">
            <view v-for="bar in altitudeBars" :key="bar" :style="{ height: bar + '%' }" :class="['bar', bar === 88 ? 'active' : '']" />
          </view>
        </view>

        <view class="metric-card speed">
          <view class="metric-head">
            <text>{{ copy.groundSpeed }}</text>
            <StitchIcon name="speed" size="33rpx" />
          </view>
          <view class="metric-value">
            <text class="value">{{ speed }}</text>
            <text class="unit">km/h</text>
          </view>
          <view class="speed-track"><view class="speed-fill" /></view>
        </view>

        <view class="metric-card energy">
          <view class="metric-head">
            <text>{{ copy.energyLevel }}</text>
            <StitchIcon name="battery_alert" size="33rpx" fill />
          </view>
          <view class="metric-value">
            <text :class="['value', lowBattery ? 'red' : '']">{{ battery }}</text>
            <text class="unit">%</text>
          </view>
          <view v-if="alertText" class="rtl">
            <view />
            <text>{{ alertText }}</text>
          </view>
        </view>

        <view class="metric-card attitude">
          <view class="metric-head">
            <text>{{ copy.attitude }}</text>
            <StitchIcon name="explore" size="33rpx" />
          </view>
          <view class="att-list">
            <view class="att-row">
              <text>{{ copy.pitch }}</text>
              <text>{{ pitch }}</text>
            </view>
            <view class="att-row">
              <text>{{ copy.roll }}</text>
              <text>{{ roll }}</text>
            </view>
            <view class="att-row">
              <text>{{ copy.yaw }}</text>
              <text>{{ yaw }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="mission-card">
        <text class="mission-title">{{ copy.missionPhase }}</text>
        <view class="phase-track">
          <view class="phase-line" />
          <view class="phase-line active" />
          <view v-for="phase in phases" :key="phase.label" :class="['phase-node', phase.state]">
            <view class="phase-dot">
              <StitchIcon v-if="phase.state === 'done'" name="check" size="25rpx" />
              <view v-else-if="phase.state === 'current'" />
            </view>
            <text>{{ phase.label }}</text>
          </view>
        </view>
      </view>

      <text v-if="message" class="message">{{ message }}</text>
    </view>

    <view class="bottom-bar">
      <view class="task-button" hover-class="tap-press" @click="back">
        <StitchIcon name="arrow_back" size="38rpx" />
        <text>{{ copy.returnTaskList }}</text>
      </view>
      <view class="identity-button" hover-class="tap-press" @click="switchIdentity">
        <StitchIcon name="switch_account" size="38rpx" />
        <text>{{ copy.switchIdentity }}</text>
      </view>
      <view v-if="orderDone" class="refresh-button" hover-class="tap-press" @click="goReview">
        <StitchIcon name="receipt_long" size="38rpx" />
        <text>{{ copy.viewSettlement }}</text>
      </view>
      <view
        v-else
        class="refresh-button"
        :class="{ disabled: !canRefreshTelemetry }"
        hover-class="tap-press"
        @click="handleTelemetryAction"
      >
        <StitchIcon :name="telemetryActionIcon" size="38rpx" />
        <text>{{ telemetryActionLabel }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import LiveRouteMap from '@/components/LiveRouteMap.vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { OrderStatus, Role } from '@/models';
import type { GeoPoint, Telemetry } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { latestOrderFrom } from '@/services/app-flow';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';
import { displayTelemetryAlert } from '@/utils/telemetry-alerts';

const orderStore = useOrderStore();
const telemetryStore = useTelemetryStore();
const localeStore = useLocaleStore();
const userStore = useUserStore();
ensureRole(Role.Client);
const message = ref('');
const routeOrderId = ref('');
const altitudeBars = [18, 27, 45, 64, 88, 72];
const TRACK_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    gpsFix: 'GPS: FIX',
    link98: 'LINK: 98%',
    altitude: 'ALTITUDE (AGL)',
    groundSpeed: 'GROUND SPEED',
    energyLevel: 'ENERGY LEVEL',
    rtlRecommended: 'RTL RECOMMENDED',
    attitude: 'ATTITUDE',
    pitch: 'Pitch',
    roll: 'Roll',
    yaw: 'Yaw',
    missionPhase: 'Mission Phase',
    preFlight: 'Pre-Flight',
    takeoff: 'Takeoff',
    inFlight: 'In Flight',
    landing: 'Landing',
    complete: 'Complete',
    returnTaskList: 'Back',
    switchIdentity: 'Switch Role',
    refreshTelemetry: 'Refresh Telemetry',
    waitingTakeoff: 'Waiting for Takeoff',
    viewSettlement: 'Settlement & Review',
    refreshed: 'Telemetry stream refreshed',
    standbyTelemetry: 'Mission has not taken off. Waiting for pilot execution.',
    languageToast: 'Switched to English',
    noTrackOrder: 'No trackable order',
  },
  zh: {
    brand: '天链物流',
    gpsFix: 'GPS：已定位',
    link98: '链路：98%',
    altitude: '高度 (AGL)',
    groundSpeed: '地速',
    energyLevel: '电量',
    rtlRecommended: '建议返航',
    attitude: '姿态',
    pitch: '俯仰',
    roll: '横滚',
    yaw: '偏航',
    missionPhase: '任务阶段',
    preFlight: '起飞前',
    takeoff: '起飞',
    inFlight: '飞行中',
    landing: '降落',
    complete: '完成',
    returnTaskList: '返回上一页',
    switchIdentity: '切换身份',
    refreshTelemetry: '刷新遥测',
    waitingTakeoff: '等待飞手起飞',
    viewSettlement: '查看结算评价',
    refreshed: '遥测流已刷新',
    standbyTelemetry: '任务尚未起飞，等待飞手端执行',
    languageToast: '已切换为中文',
    noTrackOrder: '暂无可追踪订单',
  },
} as const;
const copy = computed(() => TRACK_COPY[localeStore.locale]);

onLoad((query: Record<string, string | undefined> = {}) => {
  const id = query.orderId;
  if (id && repo.orders.find(id)) {
    routeOrderId.value = id;
    orderStore.activeOrderId = id;
  }
});

const order = computed(() => {
  const routeOrder = routeOrderId.value ? repo.orders.find(routeOrderId.value) : undefined;
  return routeOrder ?? orderStore.activeOrder ?? latestOrderFrom(repo.orders.where((item) => item.status !== OrderStatus.Cancelled));
});
const canRefreshTelemetry = computed(() => order.value?.status === OrderStatus.InFlight);
const telemetryActionLabel = computed(() => canRefreshTelemetry.value ? copy.value.refreshTelemetry : copy.value.waitingTakeoff);
const telemetryActionIcon = computed(() => canRefreshTelemetry.value ? 'sync' : 'hourglass_empty');
const latest = computed(() => {
  if (!order.value) return undefined;
  if (order.value.status === OrderStatus.InFlight) {
    return telemetryStore.orderId === order.value.id ? telemetryStore.latest : repo.telemetry.where((item) => item.orderId === order.value!.id)[0]?.frame;
  }
  const snapshot = repo.telemetry.where((item) => item.orderId === order.value!.id)[0]?.frame;
  if (snapshot) return snapshot;
  return groundTrackFrame(routeMapGpsStatus.value === 'arrived' ? order.value.to : order.value.from);
});
const orderDone = computed(() => order.value?.status === OrderStatus.Completed || order.value?.status === OrderStatus.Settled);
const routeMapGpsStatus = computed<'standby' | 'live' | 'arrived'>(() => {
  const status = order.value?.status;
  if (status === OrderStatus.InFlight) return 'live';
  if (status === OrderStatus.Unloading || status === OrderStatus.Completed || status === OrderStatus.Settled) return 'arrived';
  return 'standby';
});
const craftTag = computed(() => {
  const droneId = order.value?.droneId;
  const drone = droneId ? repo.drones.find(droneId) : undefined;
  return drone?.sn ?? order.value?.id.toUpperCase() ?? '—';
});
const altitude = computed(() => latest.value ? Math.round(latest.value.altM).toLocaleString('en-US') : '—');
const speed = computed(() => latest.value ? (latest.value.speedMs * 3.6).toFixed(1) : '—');
const battery = computed(() => latest.value ? latest.value.batteryPct.toString() : '—');
const lowBattery = computed(() => (latest.value?.batteryPct ?? 100) <= 30);
const telemetryAlert = computed(() => displayTelemetryAlert(telemetryStore.alerts, latest.value, localeStore.locale));
const alertText = computed(() => order.value?.status === OrderStatus.InFlight ? telemetryAlert.value?.notice ?? '' : '');
const pitch = computed(() => latest.value ? `+${latest.value.swingDeg.toFixed(1)}°` : '—');
const roll = computed(() => latest.value ? `${(-latest.value.swingDeg / 3).toFixed(1)}°` : '—');
const yaw = computed(() => latest.value ? `${Math.round(latest.value.heading)}°` : '—');

// 真实订单状态映射到飞行阶段轴
const PHASE_KEYS = ['preFlight', 'takeoff', 'inFlight', 'landing', 'complete'] as const;
const phaseIndex = computed(() => {
  const status = order.value?.status;
  if (!status) return 0;
  if (status === OrderStatus.Loading) return 1;
  if (status === OrderStatus.InFlight) return 2;
  if (status === OrderStatus.Unloading) return 3;
  if (status === OrderStatus.Completed || status === OrderStatus.Settled) return 4;
  return 0;
});
const phases = computed(() => PHASE_KEYS.map((key, index) => ({
  label: copy.value[key],
  state: index < phaseIndex.value || (index === 4 && phaseIndex.value === 4) ? 'done' : index === phaseIndex.value ? 'current' : 'todo',
})));

// 飞行中自动开启遥测流，无需手动点刷新
if (order.value?.status === OrderStatus.InFlight) {
  void telemetryStore.refreshShared(order.value.id);
}

function back() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages-client/match/index' }) });
}

function switchIdentity() {
  void userStore.logout().finally(() => {
    uni.reLaunch({ url: '/pages/login/index' });
  });
}

async function startTelemetry() {
  if (!order.value) {
    message.value = '暂无可追踪订单，请先发起吊运任务';
    return;
  }
  if (order.value.status !== OrderStatus.InFlight) {
    telemetryStore.standby(order.value.id);
    message.value = copy.value.standbyTelemetry;
    return;
  }
  const shared = await telemetryStore.refreshShared(order.value.id);
  if (!shared) telemetryStore.start(order.value.id, 'client');
  message.value = copy.value.refreshed;
}

function handleTelemetryAction() {
  if (!order.value) {
    message.value = copy.value.noTrackOrder;
    return;
  }
  if (!canRefreshTelemetry.value) {
    message.value = copy.value.standbyTelemetry;
    return;
  }
  void startTelemetry();
}

function goReview() {
  const id = order.value?.id;
  if (id) {
    orderStore.activeOrderId = id;
    uni.navigateTo({ url: `/pages-client/review/index?orderId=${encodeURIComponent(id)}` });
    return;
  }
  uni.navigateTo({ url: '/pages-client/review/index' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  uni.showToast({ title: copy.value.languageToast, icon: 'none' });
}

function groundTrackFrame(pos: GeoPoint): Telemetry {
  return {
    ts: new Date().toISOString(),
    pos,
    altM: 0,
    speedMs: 0,
    batteryPct: 80,
    heading: 0,
    swingDeg: 0,
  };
}
</script>

<style lang="scss" scoped>
.flight-page {
  min-height: 100vh;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 174rpx;
  box-sizing: border-box;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 50;
  height: 122rpx;
  padding: 0 30rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap,
.avatar-button,
.top-actions,
.signal-button,
.metric-head,
.metric-value,
.bars,
.rtl,
.att-row,
.phase-track,
.phase-node,
.phase-dot,
.bottom-bar,
.task-button,
.identity-button,
.refresh-button {
  display: flex;
  align-items: center;
}

.brand-wrap {
  gap: 18rpx;
  min-width: 0;
  flex: 1;
}

.avatar-button {
  width: 49rpx;
  height: 49rpx;
  border-radius: 16rpx;
  border: 2rpx solid #3a494b;
  background: #313540;
  color: #dfe2f0;
  justify-content: center;
  flex: 0 0 49rpx;
}

.brand {
  color: #00f2ff;
  font-size: 35rpx;
  line-height: 48rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
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
  width: 54rpx;
  height: 54rpx;
  justify-content: center;
  color: #e1fdff;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .language-switch,
.zh-copy .craft-tag text,
.zh-copy .map-badge text,
.zh-copy .metric-head text,
.zh-copy .rtl text,
.zh-copy .value,
.zh-copy .phase-node text,
.zh-copy .task-button,
.zh-copy .identity-button,
.zh-copy .refresh-button {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.content {
  padding: 154rpx 30rpx 0;
}

.empty-map-panel {
  height: 760rpx;
  border-radius: 14rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  color: #849495;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  box-sizing: border-box;
}

.empty-map-panel text {
  color: #dfe2f0;
  font-size: 26rpx;
  line-height: 36rpx;
  font-weight: 800;
}

.telemetry-grid {
  margin-top: 31rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
}

.metric-card {
  min-height: 268rpx;
  padding: 28rpx 30rpx;
  border-radius: 12rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
}

.metric-head {
  justify-content: space-between;
  gap: 10rpx;
  color: #849495;
}

.metric-head text {
  color: #b9cacb;
  font-size: 17rpx;
  line-height: 24rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  letter-spacing: 3rpx;
}

.metric-value {
  align-items: flex-end;
  margin-top: 34rpx;
  gap: 10rpx;
}

.value {
  color: #dfe2f0;
  font-size: 58rpx;
  line-height: 66rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
}

.value.cyan {
  color: #00f2ff;
}

.value.red {
  color: #ef4444;
}

.unit {
  color: #dfe2f0;
  font-size: 24rpx;
  line-height: 35rpx;
}

.bars {
  align-items: flex-end;
  gap: 6rpx;
  height: 54rpx;
  margin-top: 34rpx;
}

.bar {
  flex: 1;
  border-radius: 4rpx 4rpx 0 0;
  background: #313540;
}

.bar.active {
  background: #00f2ff;
  box-shadow: 0 0 10rpx #00f2ff;
}

.speed-track {
  height: 8rpx;
  margin-top: 54rpx;
  border-radius: 8rpx;
  background: #313540;
  overflow: hidden;
}

.speed-fill {
  width: 65%;
  height: 100%;
  border-radius: inherit;
  background: #3b82f6;
  box-shadow: 16rpx 0 18rpx rgba(255, 255, 255, .38);
}

.rtl {
  margin-top: 48rpx;
  gap: 11rpx;
}

.rtl view {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: #ef4444;
}

.rtl text {
  color: #ef4444;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  letter-spacing: 3rpx;
}

.att-list {
  margin-top: 21rpx;
}

.att-row {
  min-height: 45rpx;
  justify-content: space-between;
  border-bottom: 2rpx solid #262a34;
}

.att-row:last-child {
  border-bottom: 0;
}

.att-row text {
  color: #dfe2f0;
  font-size: 25rpx;
  line-height: 35rpx;
}

.att-row text:last-child {
  font-size: 22rpx;
}

.mission-card {
  min-height: 256rpx;
  margin-top: 37rpx;
  padding: 42rpx 36rpx 30rpx;
  border-radius: 12rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
}

.mission-title {
  display: block;
  color: #dfe2f0;
  font-size: 29rpx;
  line-height: 41rpx;
  font-weight: 700;
}

.phase-track {
  position: relative;
  justify-content: space-between;
  margin-top: 42rpx;
}

.phase-line {
  position: absolute;
  left: 30rpx;
  right: 30rpx;
  top: 30rpx;
  height: 2rpx;
  background: #313540;
  z-index: 0;
}

.phase-line.active {
  right: 50%;
  background: #3b82f6;
  box-shadow: 0 0 12rpx rgba(59, 130, 246, .62);
}

.phase-node {
  position: relative;
  z-index: 1;
  flex-direction: column;
  gap: 18rpx;
  align-items: center;
}

.phase-dot {
  width: 43rpx;
  height: 43rpx;
  border-radius: 50%;
  border: 4rpx solid #849495;
  background: #141822;
  justify-content: center;
  color: #0b0e14;
}

.phase-node.done .phase-dot {
  border-color: #3b82f6;
  background: #3b82f6;
  box-shadow: 0 0 16rpx rgba(59, 130, 246, .45);
}

.phase-node.current .phase-dot {
  border-color: #00f2ff;
  box-shadow: 0 0 22rpx rgba(0, 242, 255, .85), 0 0 0 14rpx rgba(0, 242, 255, .10);
}

.phase-node.current .phase-dot view {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: #00f2ff;
}

.phase-dot :deep(.wd-icon),
.phase-dot :deep(.stitch-icon) {
  color: #0b0e14;
}

.phase-node text {
  color: #849495;
  font-size: 17rpx;
  line-height: 24rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.phase-node.done text {
  color: #e1fdff;
}

.phase-node.current text {
  color: #00f2ff;
}

.message {
  display: block;
  margin-top: 22rpx;
  padding: 18rpx 22rpx;
  border-radius: 8rpx;
  background: rgba(0, 242, 255, .10);
  border: 2rpx solid rgba(0, 242, 255, .25);
  color: #e1fdff;
  font-size: 24rpx;
  line-height: 34rpx;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  min-height: 194rpx;
  padding: 27rpx 30rpx calc(27rpx + env(safe-area-inset-bottom));
  gap: 23rpx;
  border-top: 2rpx solid #3a494b;
  background: rgba(30, 36, 51, .96);
  box-sizing: border-box;
}

.task-button,
.identity-button,
.refresh-button {
  height: 128rpx;
  justify-content: center;
  gap: 18rpx;
  border-radius: 8rpx;
  box-sizing: border-box;
}

.task-button {
  flex: 1;
  border: 2rpx solid #849495;
  color: #dfe2f0;
  background: #141822;
}

.identity-button {
  flex: 1;
  border: 2rpx solid #3b82f6;
  color: #e1fdff;
  background: rgba(59, 130, 246, .18);
}

.refresh-button {
  flex: 1;
  color: #0b0e14;
  background: #00f2ff;
  box-shadow: 0 0 18rpx rgba(0, 242, 255, .20);
}

.refresh-button.disabled {
  color: #b9cacb;
  background: #313540;
  border: 2rpx solid #3a494b;
  box-shadow: none;
}

.task-button text,
.identity-button text,
.refresh-button text {
  max-width: 150rpx;
  text-align: center;
  font-size: 24rpx;
  line-height: 33rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
}

.tap-press {
  opacity: .86;
  transform: scale(.985);
}
</style>
