<template>
  <view class="fleet-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand-wrap" hover-class="tap-press" @click="showFeedback(copy.profileOnline)">
        <view class="avatar-button">
          <StitchIcon name="person" size="38rpx" fill />
        </view>
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showFeedback(copy.signalHealthy)">
          <StitchIcon name="signal_cellular_alt" size="44rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="page-head">
        <view class="heading-copy">
          <text class="title">{{ copy.titleTop }}</text>
          <text class="title">{{ copy.titleBottom }}</text>
          <text class="subtitle">{{ copy.subtitle }}</text>
        </view>

        <view class="status-pills">
          <view class="status-pill">
            <view class="pill-dot green" />
            <view class="pill-copy">
              <text class="pill-number">{{ activeCount }}</text>
              <text class="pill-label">{{ copy.active }}</text>
            </view>
          </view>
          <view class="status-pill">
            <view class="pill-dot amber" />
            <view class="pill-copy">
              <text class="pill-number">{{ idleCount }}</text>
              <text class="pill-label">{{ copy.idle }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="error" class="message danger">
        <StitchIcon name="warning" size="31rpx" />
        <text>{{ error }}</text>
      </view>
      <view v-if="ownerIssue" class="message danger">
        <StitchIcon name="lock" size="31rpx" />
        <text>{{ ownerIssue }}</text>
      </view>
      <view v-if="feedback" class="message">
        <StitchIcon name="check_circle" size="31rpx" />
        <text>{{ feedback }}</text>
      </view>

      <view class="asset-grid">
        <view v-for="asset in fleetCards" :key="asset.id" :class="['asset-card', asset.variant]">
          <view class="visual-panel">
            <image v-if="asset.image" class="drone-bg" :src="asset.image" mode="aspectFill" />
            <view v-else :class="['visual-fallback', asset.variant]" />
            <view class="visual-grid" />
            <view v-if="asset.variant === 'maintenance'" class="scan-lines" />
            <view class="fade-layer" />

            <view :class="['status-chip', asset.variant]">
              <StitchIcon v-if="asset.statusIcon" :name="asset.statusIcon" size="25rpx" />
              <view v-else class="status-dot" />
              <text>{{ asset.statusLabel }}</text>
            </view>

            <view class="asset-id">
              <text class="asset-name">{{ asset.name }}</text>
              <text class="asset-sn">ID: {{ asset.code }}</text>
            </view>
          </view>

          <view class="asset-body">
            <view class="metric-grid">
              <view :class="['metric-box', asset.dimMetrics ? 'muted' : '']">
                <text class="metric-label">{{ copy.payloadCap }}</text>
                <view class="metric-line">
                  <text :class="['metric-value', asset.variant === 'deployed' ? 'cyan' : '']">{{ asset.payload }}</text>
                  <text class="metric-unit">kg</text>
                </view>
              </view>

              <view :class="['metric-box', asset.dimMetrics ? 'muted' : '']">
                <text class="metric-label">{{ copy.battery }}</text>
                <view class="battery-row">
                  <text class="battery-value">{{ asset.battery }}%</text>
                  <view class="battery-track">
                    <view :class="['battery-fill', asset.batteryTone]" :style="{ width: `${asset.battery}%` }" />
                  </view>
                </view>
              </view>

              <view :class="['metric-box', asset.dimMetrics ? 'muted' : '']">
                <text class="metric-label">{{ copy.liability }}</text>
                <text class="mono-value">{{ asset.liability }}</text>
              </view>

              <view :class="['metric-box', 'maintenance-box', asset.variant === 'maintenance' ? 'warning-box' : '', asset.dimMaintenance ? 'muted' : '']">
                <text :class="['metric-label', asset.variant === 'maintenance' ? 'warning-text' : '']">{{ copy.maintenance }}</text>
                <text :class="['mono-value', asset.maintenanceTone]">{{ asset.maintenance }}</text>
              </view>
            </view>

            <view class="card-actions">
              <view
                :class="['main-action', asset.actionStyle, asset.disabled ? 'disabled' : '']"
                hover-class="tap-press"
                @click="handlePrimary(asset)"
              >
                <text>{{ asset.actionLabel }}</text>
              </view>
              <view v-if="asset.iconAction" class="icon-action" hover-class="tap-press" @click="handleIconAction(asset)">
                <StitchIcon :name="asset.iconAction" size="38rpx" />
              </view>
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
      <view class="nav-item" hover-class="tap-press" @click="goTasks">
        <StitchIcon name="assignment" size="40rpx" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item active">
        <StitchIcon name="account_balance_wallet" size="41rpx" fill />
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
import { AuditStatus, CapacityStatus, Role } from '@/models';
import type { Drone } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { activeOwnerMissionForDrone, deployOwnerDrone, withdrawOwnerDrone } from '@/services/app-flow';
import { ownerQualificationIssue } from '@/services/compliance';
import { demoBatteryPct } from '@/services/device-status';
import { droneDisplayName } from '@/services/display-labels';
import { PRICE_CONFIG } from '@/stores/config-data';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

interface FleetCard {
  id: string;
  droneId: string;
  name: string;
  code: string;
  payload: string;
  battery: number;
  batteryTone: 'cyan' | 'green' | 'blue' | 'red';
  liability: string;
  maintenance: string;
  maintenanceTone: 'success' | 'neutral' | 'warning';
  statusLabel: string;
  statusIcon: string;
  variant: 'deployed' | 'busy' | 'idle' | 'maintenance';
  actionLabel: string;
  actionStyle: 'outline' | 'primary' | 'warning' | 'locked';
  iconAction: string;
  disabled: boolean;
  image: string;
  dimMetrics: boolean;
  dimMaintenance: boolean;
}

const FLEET_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    profileOnline: 'Owner profile online',
    signalHealthy: 'Network signal healthy',
    titleTop: 'Fleet',
    titleBottom: 'Management',
    subtitle: 'Monitor and deploy your active drone assets.',
    active: 'Active',
    idle: 'Idle',
    payloadCap: 'PAYLOAD CAP.',
    battery: 'BATTERY',
    location: 'LOCATION',
    locationPending: 'Deployed, waiting for area address',
    liability: 'LIABILITY INS.',
    maintenance: 'MAINTENANCE',
    deployed: 'DEPLOYED',
    busy: 'IN SERVICE',
    idleStatus: 'IDLE',
    maintReq: 'MAINT REQ',
    recallUnit: 'RECALL UNIT',
    inFlightLocked: 'IN FLIGHT',
    deployCapacity: 'DEPLOY CAPACITY',
    scheduleMaint: 'SCHEDULE MAINT',
    nextIn42h: 'Next in 42h',
    cleared: 'Cleared',
    overdue4h: 'Overdue 4h',
    complianceGap: 'Compliance gap',
    fixCompliance: 'FIX COMPLIANCE',
    maintenanceOpened: 'Opening certification center to fix compliance',
    capacityDeployed: 'Capacity deployed to the matching pool.',
    deployFailed: 'Deploy failed',
    unitRecalled: 'Unit recalled from new matching candidates.',
    busyLocked: 'Active mission: capacity cannot be recalled.',
    missionMissing: 'No active mission is linked to this drone.',
    telemetryDetails: 'Telemetry details',
    configurationPanel: 'Configuration panel',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    wallet: 'Wallet',
    profile: 'Profile',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    profileOnline: '机主档案在线',
    signalHealthy: '网络信号正常',
    titleTop: '设备与',
    titleBottom: '资产',
    subtitle: '监控并投放你的活跃无人机资产。',
    active: '活跃',
    idle: '空闲',
    payloadCap: '载重能力',
    battery: '电量',
    location: '投放区域',
    locationPending: '已投放，等待接入区域地址',
    liability: '三责险',
    maintenance: '维护状态',
    deployed: '已投放',
    busy: '执行中',
    idleStatus: '空闲',
    maintReq: '需维护',
    recallUnit: '召回设备',
    inFlightLocked: '飞行中',
    deployCapacity: '投放运力',
    scheduleMaint: '安排维护',
    nextIn42h: '42小时后',
    cleared: '已通过',
    overdue4h: '超期4小时',
    complianceGap: '合规缺口',
    fixCompliance: '补齐合规材料',
    maintenanceOpened: '正在打开认证中心补齐合规材料',
    capacityDeployed: '运力已投放至匹配池。',
    deployFailed: '投放失败',
    unitRecalled: '设备已从新增匹配候选中召回。',
    busyLocked: '任务执行中，不能召回设备。',
    missionMissing: '暂无关联任务',
    telemetryDetails: '遥测详情',
    configurationPanel: '配置面板',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    wallet: '钱包',
    profile: '我的',
    languageToast: '已切换为中文',
  },
} as const;

const userStore = useUserStore();
const localeStore = useLocaleStore();
const copy = computed(() => FLEET_COPY[localeStore.locale]);

ensureRole(Role.Owner);

const user = computed(() => userStore.user);
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const ownerProfile = computed(() => repo.owners.find(user.value.id));
const ownerIssue = computed(() => ownerQualificationIssue(ownerProfile.value, repo.users.find(user.value.id)));
const error = ref('');
const feedback = ref('');

const fleetCards = computed<FleetCard[]>(() => drones.value.map((drone, index) => toFleetCard(drone, index)));

const activeCount = computed(() => repo.capacity.where((item) => {
  if (item.ownerId !== user.value.id) return false;
  if (ownerIssue.value) return item.status === CapacityStatus.Busy;
  return [CapacityStatus.Online, CapacityStatus.Busy].includes(item.status);
}).length);
const idleCount = computed(() => fleetCards.value.filter((item) => item.variant === 'idle').length);

function toFleetCard(drone: Drone, index: number): FleetCard {
  const unit = capacityOf(drone.id);
  const busy = unit?.status === CapacityStatus.Busy || drone.status === 'busy';
  const online = unit?.status === CapacityStatus.Online;
  const compliant = !ownerIssue.value && drone.airworthiness === AuditStatus.Approved && drone.insured.thirdPartyAmount >= PRICE_CONFIG.minThirdParty;
  const variant: FleetCard['variant'] = busy
    ? 'busy'
    : !compliant || drone.status === 'maintenance'
      ? 'maintenance'
      : online
        ? 'deployed'
        : 'idle';
  const battery = variant === 'maintenance' ? Math.min(20, demoBatteryPct(drone.id)) : demoBatteryPct(drone.id);
  const lastMaintenance = drone.maintenanceLog[drone.maintenanceLog.length - 1];
  return {
    id: `${drone.id}-${index}`,
    droneId: drone.id,
    name: droneDisplayName(drone),
    code: drone.sn,
    payload: drone.maxPayloadKg.toFixed(1),
    battery,
    batteryTone: variant === 'maintenance' ? 'red' : variant === 'busy' ? 'blue' : variant === 'deployed' ? 'cyan' : 'green',
    liability: `¥${Number(drone.insured.thirdPartyAmount).toLocaleString('en-US')}`,
    maintenance: variant === 'maintenance' ? copy.value.complianceGap : lastMaintenance ? `${lastMaintenance.date} ${lastMaintenance.note}` : copy.value.cleared,
    maintenanceTone: variant === 'maintenance' ? 'warning' : lastMaintenance ? 'success' : 'neutral',
    statusLabel: variant === 'maintenance' ? copy.value.maintReq : variant === 'busy' ? copy.value.busy : variant === 'deployed' ? copy.value.deployed : copy.value.idleStatus,
    statusIcon: variant === 'maintenance' ? 'build' : '',
    variant,
    actionLabel: variant === 'maintenance' ? copy.value.fixCompliance : variant === 'busy' ? copy.value.inFlightLocked : variant === 'deployed' ? copy.value.recallUnit : copy.value.deployCapacity,
    actionStyle: variant === 'maintenance' ? 'warning' : variant === 'busy' ? 'locked' : variant === 'deployed' ? 'outline' : 'primary',
    iconAction: variant === 'maintenance' ? '' : variant === 'busy' ? 'assignment' : 'query_stats',
    disabled: variant === 'busy',
    image: drone.sn === 'SN-D1' ? '/static/stitch/fleet-drone-fc30-source.png' : '',
    dimMetrics: variant === 'maintenance',
    dimMaintenance: false,
  };
}

function capacityOf(droneId: string) {
  return repo.capacity.where((item) => item.droneId === droneId)[0];
}

function handlePrimary(asset: FleetCard) {
  if (asset.disabled) {
    showFeedback(copy.value.busyLocked);
    return;
  }
  if (asset.variant === 'maintenance') {
    // 不合规设备引导走认证流程补齐保险/适航材料
    uni.showToast({ title: copy.value.maintenanceOpened, icon: 'none' });
    uni.navigateTo({ url: '/pages/auth/index' });
    return;
  }

  if (asset.variant === 'deployed') {
    withdraw(asset.droneId);
    return;
  }

  deploy(asset.droneId);
}

function deploy(droneId: string) {
  try {
    error.value = '';
    feedback.value = '';
    deployOwnerDrone(user.value.id, droneId);
    feedback.value = copy.value.capacityDeployed;
  } catch (e) {
    error.value = e instanceof Error ? e.message : copy.value.deployFailed;
  }
}

function withdraw(droneId: string) {
  try {
    error.value = '';
    feedback.value = '';
    withdrawOwnerDrone(user.value.id, droneId);
    feedback.value = copy.value.unitRecalled;
  } catch (e) {
    error.value = e instanceof Error ? e.message : copy.value.busyLocked;
  }
}

function handleIconAction(asset: FleetCard) {
  if (asset.variant === 'busy') {
    const mission = activeOwnerMissionForDrone(user.value.id, asset.droneId);
    if (!mission) {
      showFeedback(copy.value.missionMissing);
      return;
    }
    uni.navigateTo({ url: `/pages-owner/mission/index?orderId=${encodeURIComponent(mission.id)}` });
    return;
  }

  uni.navigateTo({ url: `/pages-owner/drones/index?droneId=${encodeURIComponent(asset.droneId)}` });
}

function showFeedback(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  showFeedback(copy.value.languageToast);
}

function goHome() {
  uni.reLaunch({ url: '/pages-owner/home/index' });
}

function goTasks() {
  uni.navigateTo({ url: '/pages-owner/dispatch/index' });
}

function goWallet() {
  uni.navigateTo({ url: '/pages-owner/wallet/index' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/index' });
}
</script>

<style lang="scss" scoped>
.fleet-page {
  min-height: 100vh;
  padding-bottom: 158rpx;
  box-sizing: border-box;
  color: #dfe2f0;
  background:
    radial-gradient(96% 48% at 50% -12%, rgba(0, 242, 255, .13), transparent 68%),
    radial-gradient(78% 44% at 100% 4%, rgba(245, 158, 11, .12), transparent 72%),
    linear-gradient(0deg, rgba(0, 242, 255, .045) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(0, 242, 255, .045) 1rpx, transparent 1rpx),
    #0b0e14;
  background-size: auto, auto, 48rpx 48rpx, 48rpx 48rpx, auto;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 50;
  height: 123rpx;
  padding: 0 31rpx;
  border-bottom: 2rpx solid #3a494b;
  background: rgba(11, 14, 20, .94);
  backdrop-filter: saturate(160%) blur(18rpx);
  -webkit-backdrop-filter: saturate(160%) blur(18rpx);
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
  width: 62rpx;
  height: 62rpx;
  border-radius: 31rpx;
  border: 2rpx solid #3a494b;
  background: #313540;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 62rpx;
  box-sizing: border-box;
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 37rpx;
  line-height: 45rpx;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.zh-copy .asset-name,
.zh-copy .language-switch {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
}

.zh-copy .pill-copy,
.zh-copy .status-chip,
.zh-copy .asset-sn,
.zh-copy .metric-label,
.zh-copy .mono-value,
.zh-copy .main-action,
.zh-copy .nav-item,
.zh-copy .nav-item text {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .brand {
  font-size: 38rpx;
}

.content {
  padding: 181rpx 31rpx 0;
  box-sizing: border-box;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 23rpx;
  margin-bottom: 39rpx;
}

.heading-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title {
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 46rpx;
  line-height: 59rpx;
  font-weight: 900;
}

.subtitle {
  margin-top: 13rpx;
  max-width: 338rpx;
  color: #d8e2ff;
  font-size: 28rpx;
  line-height: 37rpx;
  font-weight: 400;
}

.status-pills {
  display: flex;
  gap: 18rpx;
  flex: 0 0 auto;
}

.status-pill {
  width: auto;
  min-width: 136rpx;
  height: 81rpx;
  padding: 12rpx 23rpx;
  border-radius: 4rpx;
  border: 2rpx solid rgba(58, 73, 75, .82);
  background: rgba(30, 36, 51, .78);
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .02);
  display: flex;
  align-items: center;
  gap: 17rpx;
  box-sizing: border-box;
}

.status-pill:first-child {
  min-width: 174rpx;
}

.pill-dot,
.status-dot {
  width: 13rpx;
  height: 13rpx;
  border-radius: 50%;
  flex: 0 0 13rpx;
}

.pill-dot.green {
  background: #10b981;
  box-shadow: 0 0 15rpx rgba(16, 185, 129, .88);
}

.pill-dot.amber {
  background: #f59e0b;
  box-shadow: 0 0 15rpx rgba(245, 158, 11, .88);
}

.pill-copy {
  display: flex;
  flex-direction: column;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  min-width: 0;
}

.pill-number {
  font-size: 26rpx;
  line-height: 26rpx;
  font-weight: 900;
}

.pill-label {
  margin-top: 4rpx;
  font-size: 18rpx;
  line-height: 22rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
}

.message {
  min-height: 56rpx;
  margin: -24rpx 0 24rpx;
  padding: 10rpx 18rpx;
  border-radius: 7rpx;
  border: 2rpx solid rgba(16, 185, 129, .45);
  background: rgba(16, 185, 129, .12);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 13rpx;
  font-size: 24rpx;
  line-height: 32rpx;
  box-sizing: border-box;
}

.message.danger {
  border-color: rgba(239, 68, 68, .5);
  background: rgba(239, 68, 68, .12);
  color: #ffb4ab;
}

.asset-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 31rpx;
}

.asset-card {
  border-radius: 13rpx;
  border: 2rpx solid rgba(58, 73, 75, .82);
  background: rgba(30, 36, 51, .82);
  box-shadow: 0 8rpx 26rpx rgba(0, 0, 0, .24);
  overflow: hidden;
  box-sizing: border-box;
}

.asset-card.maintenance {
  border-color: rgba(245, 158, 11, .5);
}

.asset-card.busy {
  border-color: rgba(59, 130, 246, .5);
}

.visual-panel {
  position: relative;
  height: 306rpx;
  overflow: hidden;
  background: #262a34;
}

.drone-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: .48;
  filter: grayscale(1) contrast(1.15) brightness(.78);
}

.visual-fallback {
  position: absolute;
  inset: 0;
  opacity: .88;
  background:
    radial-gradient(circle at 76% 32%, rgba(49, 53, 64, .95) 0, rgba(49, 53, 64, .3) 30%, transparent 55%),
    linear-gradient(135deg, rgba(49, 53, 64, .96), rgba(27, 31, 42, .88));
}

.visual-fallback.maintenance {
  background:
    linear-gradient(180deg, rgba(49, 53, 64, .9), rgba(31, 36, 50, .95)),
    radial-gradient(circle at 34% 35%, rgba(245, 158, 11, .1), transparent 40%);
}

.visual-fallback.busy {
  background:
    radial-gradient(circle at 74% 32%, rgba(59, 130, 246, .18), transparent 42%),
    linear-gradient(135deg, rgba(31, 47, 83, .9), rgba(27, 31, 42, .9));
}

.visual-grid {
  position: absolute;
  inset: 0;
  opacity: .28;
  background-image: radial-gradient(rgba(58, 73, 75, .75) 1px, transparent 1px);
  background-size: 30rpx 30rpx;
}

.scan-lines {
  position: absolute;
  inset: 0;
  opacity: .22;
  background: repeating-linear-gradient(0deg, transparent, transparent 4rpx, #f59e0b 5rpx, #f59e0b 7rpx);
}

.fade-layer {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(30, 36, 51, 0) 0%, rgba(30, 36, 51, .3) 42%, #1e2433 100%);
}

.status-chip {
  position: absolute;
  left: 25rpx;
  top: 25rpx;
  height: 44rpx;
  padding: 0 14rpx;
  border-radius: 4rpx;
  display: inline-flex;
  align-items: center;
  gap: 9rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 24rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.status-chip.deployed {
  color: #10b981;
  border: 2rpx solid rgba(16, 185, 129, .58);
  background: rgba(16, 185, 129, .16);
}

.status-chip.busy {
  color: #3b82f6;
  border: 2rpx solid rgba(59, 130, 246, .58);
  background: rgba(59, 130, 246, .14);
}

.status-chip.idle {
  color: #dfe2f0;
  border: 2rpx solid rgba(132, 148, 149, .55);
  background: rgba(15, 19, 29, .68);
}

.status-chip.maintenance {
  color: #f59e0b;
  border: 2rpx solid rgba(245, 158, 11, .68);
  background: rgba(245, 158, 11, .14);
}

.status-chip.deployed .status-dot {
  background: #10b981;
}

.status-chip.busy .status-dot {
  background: #3b82f6;
}

.status-chip.idle .status-dot {
  background: #dfe2f0;
}

.asset-id {
  position: absolute;
  left: 25rpx;
  right: 25rpx;
  bottom: 16rpx;
  display: flex;
  flex-direction: column;
}

.asset-name {
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 35rpx;
  line-height: 45rpx;
  font-weight: 900;
}

.asset-sn {
  margin-top: 1rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 24rpx;
  line-height: 31rpx;
  letter-spacing: 1rpx;
  font-weight: 700;
}

.asset-body {
  padding: 26rpx 31rpx 31rpx;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx 27rpx;
}

.metric-box {
  height: 116rpx;
  padding: 17rpx 17rpx 14rpx;
  border: 2rpx solid rgba(58, 73, 75, .5);
  background: #0f131d;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.metric-box.muted {
  opacity: .62;
}

.metric-label {
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 26rpx;
  letter-spacing: 6rpx;
  font-weight: 900;
  white-space: nowrap;
}

.metric-line {
  margin-top: 11rpx;
  display: flex;
  align-items: baseline;
  gap: 9rpx;
}

.metric-value {
  color: #dfe2f0;
  font-size: 37rpx;
  line-height: 39rpx;
  font-weight: 900;
}

.metric-value.cyan {
  color: #00f2ff;
}

.metric-unit {
  color: #dfe2f0;
  font-size: 24rpx;
  line-height: 29rpx;
}

.battery-row {
  margin-top: 13rpx;
  display: flex;
  align-items: center;
  gap: 13rpx;
}

.battery-value {
  color: #dfe2f0;
  font-size: 37rpx;
  line-height: 39rpx;
  font-weight: 900;
}

.battery-track {
  height: 10rpx;
  flex: 1;
  border-radius: 999rpx;
  background: #313540;
  overflow: hidden;
}

.battery-fill {
  height: 100%;
  border-radius: inherit;
}

.battery-fill.cyan {
  background: #00f2ff;
}

.battery-fill.green {
  background: #10b981;
}

.battery-fill.blue {
  background: #3b82f6;
}

.battery-fill.red {
  background: #ef4444;
}

.mono-value {
  margin-top: 11rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 27rpx;
  line-height: 32rpx;
  font-weight: 700;
  white-space: nowrap;
}

.mono-value.success {
  color: #10b981;
}

.mono-value.warning,
.warning-text {
  color: #f59e0b;
}

.warning-box {
  border-color: rgba(245, 158, 11, .5);
  background: rgba(245, 158, 11, .04);
}

.card-actions {
  margin-top: 50rpx;
  padding-top: 0;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.main-action {
  height: 81rpx;
  flex: 1;
  border-radius: 3rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 26rpx;
  letter-spacing: 5rpx;
  font-weight: 900;
}

.main-action.outline {
  border: 2rpx solid #849495;
  color: #00f2ff;
  background: #0f131d;
}

.main-action.primary {
  color: #00363a;
  background: #00f2ff;
  box-shadow: 0 0 15rpx rgba(0, 242, 255, .22);
}

.main-action.warning {
  border: 2rpx solid #f59e0b;
  color: #f59e0b;
  background: #0f131d;
}

.main-action.locked {
  border: 2rpx solid rgba(59, 130, 246, .62);
  color: #8fb7ff;
  background: rgba(59, 130, 246, .1);
}

.icon-action {
  width: 68rpx;
  height: 81rpx;
  border: 2rpx solid rgba(132, 148, 149, .82);
  border-radius: 3rpx;
  color: #dfe2f0;
  background: #0f131d;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 68rpx;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  height: 149rpx;
  padding: 15rpx 17rpx calc(16rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid #3a494b;
  border-radius: 13rpx 13rpx 0 0;
  background: #0f131d;
  box-shadow: 0 -8rpx 28rpx rgba(0, 0, 0, .24);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  gap: 4rpx;
  box-sizing: border-box;
}

.nav-item {
  min-width: 0;
  height: 83rpx;
  border-radius: 24rpx;
  color: #dfe2f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-family: "JetBrains Mono", monospace;
}

.nav-item text {
  font-size: 18rpx;
  line-height: 22rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
}

.nav-item.active {
  color: #00f2ff;
  background: rgba(5, 102, 217, .38);
}

.tap-press {
  opacity: .72;
  transform: scale(.985);
}

@media (min-width: 900px) {
  .content {
    max-width: 690rpx;
    margin: 0 auto;
  }
}
</style>
