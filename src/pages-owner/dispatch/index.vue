<template>
  <view class="dispatch-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand-wrap" hover-class="tap-press" @click="goProfile">
        <view class="avatar-button">
          <StitchIcon name="person" size="34rpx" />
        </view>
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showToast(copy.signalReady)">
          <StitchIcon name="signal_cellular_alt" size="44rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="page-head">
        <view class="title-wrap">
          <text class="title">{{ copy.title }}</text>
          <text class="subtitle">{{ copy.subtitle }}</text>
        </view>
        <view class="kpi-row">
          <view class="kpi-card">
            <text class="kpi-label">{{ copy.onlineDevices }}</text>
            <text class="kpi-value cyan">{{ onlineCount }}</text>
            <view class="kpi-meter">
              <view class="meter-fill cyan" :style="{ width: `${onlinePct}%` }" />
            </view>
          </view>
          <view class="kpi-card">
            <text class="kpi-label">{{ copy.activeMissions }}</text>
            <text class="kpi-value">{{ busyCount }}</text>
            <view class="util-row">
              <StitchIcon name="flight_takeoff" size="22rpx" />
              <text>{{ utilizationText }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="filter-panel">
        <view class="filter-row">
          <view class="search-box" hover-class="tap-press" @click="focusSearch">
            <StitchIcon name="search" size="39rpx" />
            <input v-model="searchText" :placeholder="copy.searchPlaceholder" />
          </view>
          <view :class="['filter-btn', statusFilter !== 'all' ? 'active' : '']" hover-class="tap-press" @click="cycleStatusFilter">
            <StitchIcon name="filter_list" size="26rpx" />
            <text>{{ statusFilterLabel }}</text>
          </view>
          <view :class="['filter-btn', batterySort ? 'active' : '']" hover-class="tap-press" @click="toggleBatterySort">
            <StitchIcon name="sort" size="26rpx" />
            <text>{{ copy.sortBattery }}{{ batterySort === 'asc' ? ' ↑' : batterySort === 'desc' ? ' ↓' : '' }}</text>
          </view>
        </view>
        <view class="new-dispatch" hover-class="tap-press" @click="newDispatch">
          <StitchIcon name="add" size="42rpx" />
          <text>{{ copy.newDispatch }}</text>
        </view>
      </view>

      <view v-if="error" class="message danger">
        <StitchIcon name="warning" size="30rpx" />
        <text>{{ error }}</text>
      </view>
      <view v-if="ownerIssue" class="message danger">
        <StitchIcon name="lock" size="30rpx" />
        <text>{{ ownerIssue }}</text>
      </view>
      <view v-if="feedback" class="message">
        <StitchIcon name="check_circle" size="30rpx" />
        <text>{{ feedback }}</text>
      </view>

      <view class="card-list">
        <view v-if="!dispatchCards.length" class="message">
          <StitchIcon name="search_off" size="30rpx" />
          <text>{{ copy.noResult }}</text>
        </view>
        <view v-for="card in dispatchCards" :key="card.id" :class="['dispatch-card', card.variant]">
          <view class="card-head">
            <view class="card-title-block">
              <view :class="['state-line', card.variant]">
                <StitchIcon :name="card.stateIcon" size="26rpx" />
                <text>{{ card.stateLabel }}</text>
              </view>
              <text class="unit-name">{{ card.name }}</text>
              <text class="unit-id">ID: {{ card.code }}</text>
            </view>
            <view :class="['unit-icon', card.variant]">
              <StitchIcon :name="card.unitIcon" size="51rpx" />
            </view>
          </view>

          <view class="card-body">
            <view class="metric-row">
              <text class="metric-name">{{ copy.batteryLevel }}</text>
              <view class="battery-cell">
                <text :class="['metric-value', card.batteryTone]">{{ card.battery }}%</text>
                <view class="battery-track">
                  <view :class="['battery-fill', card.batteryTone]" :style="{ width: `${card.battery}%` }" />
                </view>
              </view>
            </view>

            <template v-if="card.variant === 'transit'">
              <view class="mission-progress">
                <text class="progress-label">{{ copy.missionProgress }} · {{ card.missionStage }}</text>
                <view v-if="card.missionCode" class="mission-id-row">
                  <text>{{ copy.orderNo }}</text>
                  <text>{{ card.missionCode }}</text>
                </view>
                <text v-if="card.routeText" class="mission-route">{{ card.routeText }}</text>
                <view class="progress-dots">
                  <view class="progress-line" />
                  <view class="progress-line active" :style="{ width: `${card.progressPct}%` }" />
                  <view :class="['progress-point', (card.progressIndex ?? 0) >= 0 ? 'done' : '']" />
                  <view :class="['progress-point', (card.progressIndex ?? 0) >= 1 ? 'active' : '']" />
                  <view :class="['progress-point', (card.progressIndex ?? 0) >= 2 ? 'active' : '']" />
                </view>
                <view class="progress-labels">
                  <text>{{ copy.origin }}</text>
                  <text class="blue">{{ copy.enRoute }}</text>
                  <text>{{ copy.dest }}</text>
                </view>
              </view>
            </template>

            <template v-else>
              <view v-for="item in card.metrics" :key="item.label" class="metric-row">
                <text class="metric-name">{{ item.label }}</text>
                <text :class="['metric-value', item.tone]">{{ item.value }}</text>
              </view>
            </template>
          </view>

          <view class="card-actions">
            <view
              :class="['main-action', card.actionStyle, card.disabled ? 'disabled' : '']"
              hover-class="tap-press"
              @click="handlePrimary(card)"
            >
              <StitchIcon v-if="card.actionIcon" :name="card.actionIcon" size="27rpx" />
              <text>{{ card.actionLabel }}</text>
            </view>
            <view v-if="card.secondaryLabel" :class="['secondary-action', card.variant]" hover-class="tap-press" @click="handleSecondary(card)">
              <text>{{ card.secondaryLabel }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" hover-class="tap-press" @click="goHome">
        <StitchIcon name="grid_view" size="39rpx" />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item active">
        <StitchIcon name="assignment" size="40rpx" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goAssets">
        <StitchIcon name="account_balance_wallet" size="40rpx" />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goWallet">
        <StitchIcon name="account_balance" size="42rpx" />
        <text>{{ copy.wallet }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="38rpx" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { CapacityStatus, OrderStatus, Role } from '@/models';
import type { CapacityUnit, Order } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { setCapacityOffline, setCapacityOnline } from '@/services/app-flow';
import { ownerQualificationIssue } from '@/services/compliance';
import { demoBatteryPct } from '@/services/device-status';
import { droneDisplayName, orderStatusLabel } from '@/services/display-labels';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

interface DispatchMetric {
  label: string;
  value: string;
  tone?: 'blue' | 'warning' | 'critical';
}

interface DispatchCard {
  id: string;
  capacityId?: string;
  variant: 'available' | 'transit' | 'returning';
  stateLabel: string;
  stateIcon: string;
  name: string;
  code: string;
  unitIcon: string;
  battery: number;
  batteryTone: 'cyan' | 'warning' | 'critical';
  metrics: DispatchMetric[];
  missionStage?: string;
  missionId?: string;
  missionCode?: string;
  routeText?: string;
  progressIndex?: number;
  progressPct?: number;
  actionLabel: string;
  actionIcon: string;
  actionStyle: 'primary' | 'danger' | 'disabled';
  secondaryLabel: string;
  disabled: boolean;
}

const userStore = useUserStore();
const localeStore = useLocaleStore();

ensureRole(Role.Owner);

const user = computed(() => userStore.user);
const capacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id));
const ownerProfile = computed(() => repo.owners.find(user.value.id));
const ownerIssue = computed(() => ownerQualificationIssue(ownerProfile.value, repo.users.find(user.value.id)));
const searchText = ref('');
const error = ref('');
const feedback = ref('');
const DISPATCH_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    signalReady: 'Signal ready',
    title: 'Capacity Dispatch',
    subtitle: 'Live monitoring and allocation of active drone fleet.',
    onlineDevices: 'ONLINE DEVICES',
    activeMissions: 'ACTIVE MISSIONS',
    utilizationSuffix: '% UTILIZATION',
    searchPlaceholder: 'Search device ID...',
    status: 'Status',
    sortBattery: 'Battery',
    recalled: 'RECALLED',
    redeploy: 'Deploy',
    viewMission: 'Mission',
    noResult: 'No capacity matches the current filter.',
    newDispatch: 'New Dispatch',
    orderNo: 'Order',
    originPending: 'Origin pending',
    destPending: 'Destination pending',
    batteryLevel: 'Battery Level',
    missionProgress: 'MISSION PROGRESS',
    origin: 'Origin',
    enRoute: 'En Route',
    dest: 'Dest',
    available: 'AVAILABLE',
    standby: 'STANDBY',
    transit: 'IN TRANSIT',
    returning: 'RETURNING',
    assignedUnit: 'Assigned Unit',
    currentZone: 'Current Zone',
    locationPending: 'Area address pending',
    payloadCap: 'Payload Cap.',
    etaBase: 'ETA to Base',
    sectorNorth: 'Sector 4 (North)',
    sectorBase: 'Sector 1 (Base)',
    dispatch: 'Dispatch',
    recall: 'Recall',
    details: 'Details',
    ping: 'Ping',
    unavailable: 'Dispatch Unavailable',
    batteryCritical: 'Dispatch unavailable: battery critical',
    pingSentPrefix: 'Ping sent to ',
    detailsPrefix: 'Details opened for ',
    onlineReady: 'Dispatch capacity is online and ready for allocation.',
    dispatchFailed: 'Dispatch failed',
    recallSent: 'Mission recall sent; capacity removed from new matching candidates.',
    searchLockedPrefix: 'Search locked on ',
    searchReady: 'Search ready for device ID.',
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
    title: '运力调度',
    subtitle: '实时监控并分配活跃无人机运力。',
    onlineDevices: '在线设备',
    activeMissions: '执行任务',
    utilizationSuffix: '% 利用率',
    searchPlaceholder: '搜索设备编号...',
    status: '状态',
    sortBattery: '电量',
    recalled: '已撤回',
    redeploy: '投放',
    viewMission: '查看任务',
    noResult: '没有符合当前筛选的运力。',
    newDispatch: '新增调度',
    orderNo: '任务单',
    originPending: '起点待确认',
    destPending: '终点待确认',
    batteryLevel: '电池电量',
    missionProgress: '任务进度',
    origin: '起点',
    enRoute: '途中',
    dest: '终点',
    available: '可调度',
    standby: '待命',
    transit: '运输中',
    returning: '返航中',
    assignedUnit: '已派设备',
    currentZone: '当前区域',
    locationPending: '已投放，等待接入区域地址',
    payloadCap: '载荷能力',
    etaBase: '返场 ETA',
    sectorNorth: '4区（北）',
    sectorBase: '1区（基地）',
    dispatch: '调度',
    recall: '召回',
    details: '详情',
    ping: '定位',
    unavailable: '不可调度',
    batteryCritical: '不可调度：电量过低',
    pingSentPrefix: '已发送定位到 ',
    detailsPrefix: '已打开详情：',
    onlineReady: '调度运力已上线，可进入分配池。',
    dispatchFailed: '调度失败',
    recallSent: '任务召回已发送，运力已从新增匹配候选中移除。',
    searchLockedPrefix: '已锁定搜索 ',
    searchReady: '可按设备编号搜索。',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    wallet: '钱包',
    profile: '我的',
    languageToast: '已切换为中文',
  },
} as const;
const copy = computed(() => DISPATCH_COPY[localeStore.locale]);

const statusFilter = ref<'all' | CapacityStatus>('all');
const batterySort = ref<'' | 'asc' | 'desc'>('');

const onlineCount = computed(() => ownerIssue.value ? 0 : capacity.value.filter((c) => c.status === CapacityStatus.Online).length);
const busyCount = computed(() => capacity.value.filter((c) => c.status === CapacityStatus.Busy).length);
const onlinePct = computed(() => capacity.value.length ? Math.round((onlineCount.value / capacity.value.length) * 100) : 0);
const utilizationText = computed(() => `${capacity.value.length ? Math.round((busyCount.value / capacity.value.length) * 100) : 0}${copy.value.utilizationSuffix}`);

const statusFilterLabel = computed(() => {
  if (statusFilter.value === CapacityStatus.Online) return copy.value.available;
  if (statusFilter.value === CapacityStatus.Busy) return copy.value.transit;
  if (statusFilter.value === CapacityStatus.Offline) return copy.value.recalled;
  return copy.value.status;
});

const dispatchCards = computed<DispatchCard[]>(() => {
  const keyword = searchText.value.trim().toLowerCase();
  let units = capacity.value.filter((unit) => {
    if (statusFilter.value !== 'all' && unit.status !== statusFilter.value) return false;
    if (!keyword) return true;
    const drone = repo.drones.find(unit.droneId);
    return [unit.id, drone?.sn, drone ? droneDisplayName(drone) : ''].some((field) => field?.toLowerCase().includes(keyword));
  });
  if (batterySort.value) {
    units = units.slice().sort((a, b) => {
      const delta = demoBatteryPct(a.droneId) - demoBatteryPct(b.droneId);
      return batterySort.value === 'asc' ? delta : -delta;
    });
  }
  return units.map((unit) => toDispatchCard(unit));
});

function activeMissionOf(unit: CapacityUnit): Order | undefined {
  return repo.orders
    .where((o) => o.capacityId === unit.id && o.status !== OrderStatus.Settled && o.status !== OrderStatus.Cancelled && o.status !== OrderStatus.Created)
    .reverse()[0];
}

const MISSION_PROGRESS: Partial<Record<OrderStatus, number>> = {
  [OrderStatus.Confirmed]: 0,
  [OrderStatus.AirspaceApplying]: 0,
  [OrderStatus.Preparing]: 0,
  [OrderStatus.Loading]: 0,
  [OrderStatus.InFlight]: 1,
  [OrderStatus.Unloading]: 2,
  [OrderStatus.Completed]: 2,
};

function toDispatchCard(unit: CapacityUnit): DispatchCard {
  const drone = repo.drones.find(unit.droneId);
  const name = drone ? droneDisplayName(drone) : unit.droneId;
  const code = drone?.sn ?? unit.id;
  const battery = demoBatteryPct(unit.droneId);
  const batteryTone: DispatchCard['batteryTone'] = battery <= 20 ? 'critical' : battery <= 45 ? 'warning' : 'cyan';
  const locationText = capacityLocationText(unit);

  if (unit.status === CapacityStatus.Busy) {
    const mission = activeMissionOf(unit);
    const progressIndex = mission ? (MISSION_PROGRESS[mission.status] ?? 0) : 0;
    return {
      id: unit.id,
      capacityId: unit.id,
      variant: 'transit',
      stateLabel: copy.value.transit,
      stateIcon: 'sync',
      name,
      code,
      unitIcon: 'local_shipping',
      battery,
      batteryTone,
      metrics: [],
      missionStage: mission ? orderStatusLabel(mission.status, localeStore.locale) : copy.value.transit,
      missionId: mission?.id,
      missionCode: mission?.id.toUpperCase(),
      routeText: mission ? missionRouteText(mission) : '',
      progressIndex,
      progressPct: [15, 55, 90][progressIndex],
      actionLabel: copy.value.viewMission,
      actionIcon: 'visibility',
      actionStyle: 'primary',
      secondaryLabel: copy.value.details,
      disabled: false,
    };
  }

  if (ownerIssue.value) {
    return {
      id: unit.id,
      capacityId: unit.id,
      variant: 'returning',
      stateLabel: copy.value.unavailable,
      stateIcon: 'lock',
      name,
      code,
      unitIcon: 'lock',
      battery,
      batteryTone,
      metrics: [
        { label: copy.value.currentZone, value: locationText },
        { label: copy.value.payloadCap, value: drone ? `${drone.maxPayloadKg.toFixed(1)} kg` : '—' },
      ],
      actionLabel: copy.value.unavailable,
      actionIcon: 'lock',
      actionStyle: 'disabled',
      secondaryLabel: copy.value.details,
      disabled: true,
    };
  }

  if (unit.status === CapacityStatus.Offline) {
    return {
      id: unit.id,
      capacityId: unit.id,
      variant: 'returning',
      stateLabel: copy.value.recalled,
      stateIcon: 'power_settings_new',
      name,
      code,
      unitIcon: 'keyboard_return',
      battery,
      batteryTone,
      metrics: [
        { label: copy.value.currentZone, value: locationText },
        { label: copy.value.payloadCap, value: drone ? `${drone.maxPayloadKg.toFixed(1)} kg` : '—' },
      ],
      actionLabel: copy.value.redeploy,
      actionIcon: 'play_arrow',
      actionStyle: 'primary',
      secondaryLabel: copy.value.ping,
      disabled: false,
    };
  }

  return {
    id: unit.id,
    capacityId: unit.id,
    variant: 'available',
    stateLabel: copy.value.available,
    stateIcon: 'radio_button_checked',
    name,
    code,
    unitIcon: 'flight',
    battery,
    batteryTone,
    metrics: [
      { label: copy.value.currentZone, value: locationText },
      { label: copy.value.payloadCap, value: drone ? `${drone.maxPayloadKg.toFixed(1)} kg` : '—' },
    ],
    actionLabel: copy.value.recall,
    actionIcon: 'undo',
    actionStyle: 'danger',
    secondaryLabel: copy.value.ping,
    disabled: false,
  };
}

function handlePrimary(card: DispatchCard) {
  if (!card.capacityId) return;
  if (card.disabled) {
    error.value = ownerIssue.value || copy.value.dispatchFailed;
    return;
  }
  if (card.variant === 'transit') {
    showMission(card);
    return;
  }
  if (card.variant === 'returning') {
    setOnline(card.capacityId);
    return;
  }
  setOffline(card.capacityId);
}

function handleSecondary(card: DispatchCard) {
  if (card.variant === 'transit') {
    showMission(card);
    return;
  }
  const unit = capacity.value.find((c) => c.id === card.capacityId);
  showToast(`${copy.value.pingSentPrefix}${card.code} · ${unit ? capacityLocationText(unit) : copy.value.locationPending}`);
}

function showMission(card: DispatchCard) {
  if (!card.missionId) {
    showToast(`${copy.value.detailsPrefix}${card.code}`);
    return;
  }
  uni.navigateTo({ url: `/pages-owner/mission/index?orderId=${encodeURIComponent(card.missionId)}` });
}

function missionRouteText(mission: Order) {
  return `${routePointText(mission.from.address, copy.value.originPending)} → ${routePointText(mission.to.address, copy.value.destPending)}`;
}

function routePointText(value: string | undefined, fallback: string) {
  const text = value?.trim();
  if (!text || text === '当前位置' || text.toLowerCase() === 'current location') return fallback;
  return text.length > 18 ? `${text.slice(0, 18)}...` : text;
}

function capacityLocationText(unit: CapacityUnit) {
  return routePointText(unit.location.address, copy.value.locationPending);
}

function setOnline(id: string) {
  try {
    error.value = '';
    feedback.value = '';
    setCapacityOnline(user.value.id, id);
    feedback.value = copy.value.onlineReady;
  } catch (e) {
    error.value = e instanceof Error ? e.message : copy.value.dispatchFailed;
  }
}

function setOffline(id: string) {
  error.value = '';
  feedback.value = '';
  setCapacityOffline(user.value.id, id);
  feedback.value = copy.value.recallSent;
}

function focusSearch() {
  feedback.value = searchText.value ? `${copy.value.searchLockedPrefix}${searchText.value}` : copy.value.searchReady;
}

function cycleStatusFilter() {
  const order: Array<'all' | CapacityStatus> = ['all', CapacityStatus.Online, CapacityStatus.Busy, CapacityStatus.Offline];
  statusFilter.value = order[(order.indexOf(statusFilter.value) + 1) % order.length];
}

function toggleBatterySort() {
  batterySort.value = batterySort.value === '' ? 'asc' : batterySort.value === 'asc' ? 'desc' : '';
}

function newDispatch() {
  uni.navigateTo({ url: '/pages-owner/devices/index' });
}

function showToast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function goHome() {
  uni.reLaunch({ url: '/pages-owner/home/index' });
}

function goAssets() {
  uni.navigateTo({ url: '/pages-owner/devices/index' });
}

function goWallet() {
  uni.navigateTo({ url: '/pages-owner/wallet/index' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/index' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  uni.showToast({ title: copy.value.languageToast, icon: 'none' });
}
</script>

<style lang="scss" scoped>
.dispatch-page {
  min-height: 100vh;
  padding-bottom: 158rpx;
  box-sizing: border-box;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 60;
  height: 128rpx;
  padding: 0 31rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 24rpx;
  min-width: 0;
  flex: 1;
}

.avatar-button {
  width: 61rpx;
  height: 61rpx;
  border-radius: 31rpx;
  background: #313540;
  color: #b9cacb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 45rpx;
  line-height: 60rpx;
  font-weight: 700;
  white-space: nowrap;
  @include ellipsis(1);
}

.top-actions {
  display: flex;
  align-items: center;
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
  width: 48rpx;
  height: 48rpx;
  color: #e1fdff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .title,
.zh-copy .language-switch,
.zh-copy .kpi-label,
.zh-copy .util-row,
.zh-copy .state-line,
.zh-copy .unit-name,
.zh-copy .unit-id,
.zh-copy .metric-value,
.zh-copy .progress-label,
.zh-copy .mission-id-row,
.zh-copy .mission-route,
.zh-copy .progress-labels,
.zh-copy .nav-item {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .title {
  font-size: 68rpx;
  line-height: 84rpx;
}

.zh-copy .kpi-label,
.zh-copy .util-row {
  font-size: 22rpx;
  line-height: 30rpx;
}

.content {
  padding: 175rpx 31rpx 0;
  box-sizing: border-box;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 35rpx;
}

.title-wrap {
  display: flex;
  flex-direction: column;
}

.title {
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 75rpx;
  line-height: 91rpx;
  font-weight: 700;
}

.subtitle {
  margin-top: 10rpx;
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 35rpx;
  white-space: nowrap;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 31rpx;
}

.kpi-card {
  height: 216rpx;
  padding: 30rpx 31rpx 24rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(58, 73, 75, .72);
  background: #141822;
  box-sizing: border-box;
}

.kpi-label {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 30rpx;
  letter-spacing: 2rpx;
  font-weight: 700;
  white-space: nowrap;
}

.kpi-value {
  display: block;
  margin-top: 27rpx;
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 46rpx;
  line-height: 55rpx;
  font-weight: 600;
}

.kpi-value.cyan {
  color: #00f2ff;
}

.kpi-meter {
  margin-top: 30rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #1b1f2a;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: #00f2ff;
  border-radius: inherit;
}

.util-row {
  margin-top: 21rpx;
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 7rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 21rpx;
  line-height: 30rpx;
  letter-spacing: 2rpx;
  font-weight: 700;
  white-space: nowrap;
}

.util-row text {
  white-space: nowrap;
}

.filter-panel {
  margin-top: 40rpx;
  padding: 31rpx;
  border-radius: 11rpx;
  border: 2rpx solid rgba(58, 73, 75, .62);
  background: #141822;
}

.filter-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 151rpx 151rpx;
  gap: 17rpx;
}

.search-box,
.filter-btn {
  height: 73rpx;
  border-radius: 4rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.search-box {
  min-width: 0;
  padding: 0 18rpx;
  gap: 13rpx;
}

.search-box input {
  min-width: 0;
  height: 69rpx;
  flex: 1;
  color: #dfe2f0;
  font-size: 27rpx;
}

.search-box :deep(.uni-input-placeholder) {
  color: #849495;
}

.filter-btn {
  justify-content: center;
  gap: 12rpx;
  background: #262a34;
  font-size: 27rpx;
  line-height: 34rpx;
}

.filter-btn.active {
  border-color: #00f2ff;
  color: #00f2ff;
}

.new-dispatch {
  margin-top: 32rpx;
  height: 82rpx;
  border-radius: 4rpx;
  background: #00f2ff;
  color: #00363a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  font-size: 34rpx;
  line-height: 42rpx;
  font-weight: 700;
}

.message {
  margin-top: 24rpx;
  min-height: 56rpx;
  padding: 10rpx 18rpx;
  border-radius: 7rpx;
  border: 2rpx solid rgba(16, 185, 129, .45);
  background: rgba(16, 185, 129, .12);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  line-height: 31rpx;
  box-sizing: border-box;
}

.message.danger {
  border-color: rgba(239, 68, 68, .5);
  background: rgba(239, 68, 68, .12);
  color: #ffb4ab;
}

.card-list {
  margin-top: 42rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 31rpx;
}

.dispatch-card {
  border-radius: 11rpx;
  border: 2rpx solid rgba(58, 73, 75, .72);
  background: #141822;
  overflow: hidden;
}

.dispatch-card.returning {
  border-color: rgba(245, 158, 11, .55);
}

.card-head {
  min-height: 217rpx;
  padding: 39rpx 39rpx 28rpx;
  border-bottom: 2rpx solid rgba(58, 73, 75, .5);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  box-sizing: border-box;
}

.state-line {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 28rpx;
  letter-spacing: 6rpx;
  font-weight: 900;
}

.state-line.available {
  color: #10b981;
}

.state-line.transit {
  color: #3b82f6;
}

.state-line.returning {
  color: #f59e0b;
}

.unit-name {
  display: block;
  margin-top: 18rpx;
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 36rpx;
  line-height: 43rpx;
  font-weight: 800;
}

.unit-id {
  display: block;
  margin-top: 8rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 29rpx;
  letter-spacing: 2rpx;
  font-weight: 700;
}

.unit-icon {
  width: 92rpx;
  height: 92rpx;
  border-radius: 18rpx;
  border: 4rpx solid #10b981;
  background: #262a34;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 92rpx;
  box-sizing: border-box;
}

.unit-icon.transit {
  border-color: #3b82f6;
}

.unit-icon.returning {
  border-color: #f59e0b;
}

.card-body {
  padding: 36rpx 39rpx 32rpx;
}

.metric-row {
  min-height: 39rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.metric-row + .metric-row {
  margin-top: 30rpx;
}

.metric-name {
  color: #dfe2f0;
  font-size: 28rpx;
  line-height: 36rpx;
}

.metric-value {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 25rpx;
  line-height: 32rpx;
  letter-spacing: 1rpx;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}

.metric-value.cyan {
  color: #00f2ff;
}

.metric-value.warning {
  color: #f59e0b;
}

.metric-value.critical {
  color: #ef4444;
}

.battery-cell {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.battery-track {
  width: 122rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #1b1f2a;
  overflow: hidden;
}

.battery-fill {
  height: 100%;
  border-radius: inherit;
}

.battery-fill.cyan {
  background: #00f2ff;
}

.battery-fill.warning {
  background: #f59e0b;
}

.battery-fill.critical {
  background: #ef4444;
}

.mission-progress {
  margin-top: 28rpx;
  padding-top: 23rpx;
  border-top: 2rpx solid rgba(58, 73, 75, .42);
}

.progress-label {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 28rpx;
  letter-spacing: 6rpx;
  font-weight: 900;
}

.mission-id-row {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22rpx;
  color: #00f2ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 30rpx;
  font-weight: 900;
}

.mission-route {
  display: block;
  margin-top: 12rpx;
  color: #b9cacb;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 700;
}

.progress-dots {
  position: relative;
  height: 43rpx;
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-line,
.progress-line.active {
  position: absolute;
  left: 11rpx;
  right: 11rpx;
  top: 24rpx;
  height: 3rpx;
  background: rgba(58, 73, 75, .8);
}

.progress-line.active {
  right: auto;
  background: #3b82f6;
}

.progress-point {
  position: relative;
  z-index: 2;
  width: 25rpx;
  height: 25rpx;
  border-radius: 50%;
  background: #313540;
  border: 2rpx solid rgba(132, 148, 149, .5);
}

.progress-point.done,
.progress-point.active {
  background: #3b82f6;
  border-color: #3b82f6;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 25rpx;
}

.progress-labels .blue {
  color: #3b82f6;
}

.card-actions {
  padding: 28rpx 31rpx;
  background: #171b26;
  display: flex;
  align-items: center;
  gap: 22rpx;
}

.main-action,
.secondary-action {
  height: 78rpx;
  border-radius: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-size: 27rpx;
  line-height: 34rpx;
}

.main-action {
  flex: 1;
  gap: 10rpx;
}

.main-action.primary {
  color: #00363a;
  background: #00f2ff;
}

.main-action.danger {
  color: #ef4444;
  border: 2rpx solid #ef4444;
  background: transparent;
}

.main-action.disabled {
  color: #849495;
  background: #262a34;
  opacity: .6;
}

.secondary-action {
  width: 116rpx;
  border: 2rpx solid #3b82f6;
  color: #3b82f6;
}

.secondary-action.transit {
  border-color: #3a494b;
  color: #dfe2f0;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  height: 147rpx;
  padding: 14rpx 17rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid #3a494b;
  border-radius: 12rpx 12rpx 0 0;
  background: #0f131d;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  gap: 4rpx;
  box-sizing: border-box;
}

.nav-item {
  min-width: 0;
  height: 82rpx;
  border-radius: 23rpx;
  color: #dfe2f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-family: "JetBrains Mono", monospace;
}

.nav-item.active {
  color: #00f2ff;
  background: rgba(5, 102, 217, .38);
}

.nav-item text {
  font-size: 19rpx;
  line-height: 22rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
}

.tap-press {
  opacity: .72;
  transform: scale(.985);
}

@media (min-width: 900px) {
  .content {
    max-width: 720rpx;
    margin: 0 auto;
  }
}
</style>
