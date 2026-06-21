<template>
  <view class="device-page">
    <view class="topbar">
      <view class="back-button" hover-class="tap-press" @click="back">
        <StitchIcon name="arrow_back_ios_new" size="54rpx" />
      </view>
      <text class="topbar-title">设备管理</text>
      <view class="topbar-spacer" />
    </view>

    <view class="content">
      <view class="section-head">
        <view class="heading-wrap">
          <view class="cyan-line" />
          <text class="section-title">资质与保险状态</text>
        </view>
        <view class="role-chip">
          <view class="role-dot" />
          <text>机主</text>
        </view>
      </view>

      <text class="section-desc">查看适航、三者险、载荷和设备运行状态。</text>

      <view class="info-banner">
        <StitchIcon name="info" size="50rpx" />
        <text>三者险不足 <text class="mono">500</text> 万或适航未通过的设备不会进入在线运力池。</text>
      </view>

      <view class="device-list">
        <view v-for="device in deviceRows" :key="device.id" :class="['device-card', device.dim ? 'dim' : '', selectedDevice?.id === device.id ? 'selected' : '']" hover-class="tap-press" @click="openDevice(device)">
          <view class="device-top">
            <view class="aircraft-tile">
              <image class="aircraft-icon" src="/static/stitch/device-plane.png" mode="aspectFit" />
            </view>
            <view class="device-copy">
              <view class="name-row">
                <text class="device-name">{{ device.name }}</text>
                <StitchIcon v-if="device.warning" class="warn-icon" name="warning" size="32rpx" />
              </view>
              <view class="device-meta">
                <text v-if="device.isNew" class="new-chip">NEW</text>
                <text>{{ device.sn }}</text>
                <view class="meta-dot" />
                <text>载荷</text>
                <text class="mono">{{ device.payload }}kg</text>
              </view>
            </view>
            <view class="pass-chip">{{ device.audit }}</view>
          </view>

          <view :class="['status-grid', device.warning ? 'warning' : '']">
            <view class="status-col insurance">
              <text class="label">三者险</text>
              <view class="value-line">
                <StitchIcon :name="device.warning ? 'warning' : 'check_circle'" size="34rpx" />
                <text>{{ device.warning ? '保障不足' : '已投保' }}</text>
              </view>
            </view>
            <view class="status-col">
              <text class="label">保额</text>
              <text :class="['amount', device.warning ? 'amber' : '']">{{ device.coverage }}万</text>
            </view>
            <view class="status-col">
              <text class="label">设备状态</text>
              <view :class="['run-state', device.running ? 'running' : 'idle']">
                <view class="state-dot" />
                <text>{{ device.state }}</text>
              </view>
            </view>
          </view>

          <view v-if="selectedDevice?.id === device.id" class="device-detail-panel" @click.stop>
            <view class="detail-head">
              <view>
                <text class="detail-kicker">DEVICE DETAIL</text>
                <text class="detail-title">{{ device.name }}</text>
              </view>
              <view class="detail-close" hover-class="tap-press" @click.stop="selectedDeviceId = ''">
                <StitchIcon name="close" size="34rpx" />
              </view>
            </view>
            <view class="detail-grid">
              <view class="detail-item">
                <text>设备序列号</text>
                <text>{{ device.sn }}</text>
              </view>
              <view class="detail-item">
                <text>适航审定</text>
                <text>{{ device.audit }}</text>
              </view>
              <view class="detail-item">
                <text>三者险保额</text>
                <text>{{ device.coverage }}万</text>
              </view>
              <view class="detail-item">
                <text>载荷能力</text>
                <text>{{ device.payload }}kg</text>
              </view>
              <view class="detail-item">
                <text>运行状态</text>
                <text>{{ device.state }}</text>
              </view>
              <view class="detail-item">
                <text>最近维护</text>
                <text>{{ device.maintenance }}</text>
              </view>
            </view>
            <view v-if="device.warning" class="detail-warning">
              <StitchIcon name="warning" size="32rpx" />
              <text>{{ device.warningHint }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { AuditStatus, Role } from '@/models';
import type { Drone } from '@/models';
import { droneDisplayName } from '@/services/display-labels';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

interface DeviceRow {
  id: string;
  name: string;
  sn: string;
  payload: number;
  coverage: number;
  audit: string;
  state: string;
  running: boolean;
  warning: boolean;
  dim: boolean;
  isNew: boolean;
  maintenance: string;
  warningHint: string;
}

const userStore = useUserStore();

if (userStore.user.currentRole !== Role.Owner) {
  userStore.loginAs(Role.Owner);
}

const user = computed(() => userStore.user);
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const deviceRows = computed<DeviceRow[]>(() => drones.value.map(toDeviceRow));
const selectedDeviceId = ref('');
const selectedDevice = computed(() => deviceRows.value.find((device) => device.id === selectedDeviceId.value));

onLoad((query: Record<string, string | undefined> = {}) => {
  const droneId = query.droneId;
  if (droneId) selectedDeviceId.value = decodeURIComponent(droneId);
});

function toDeviceRow(drone: Drone): DeviceRow {
  const coverage = Math.round(drone.insured.thirdPartyAmount / 10000);
  const warning = coverage < 500 || drone.airworthiness !== AuditStatus.Approved;
  const running = drone.status === 'busy';
  const lastMaintenance = drone.maintenanceLog[drone.maintenanceLog.length - 1];
  return {
    id: drone.id,
    name: droneDisplayName(drone),
    sn: drone.sn,
    payload: drone.maxPayloadKg,
    coverage,
    audit: drone.airworthiness === AuditStatus.Approved ? '已通过' : '待补齐',
    state: running ? '执行中' : drone.status === 'maintenance' ? '维护中' : '空闲可投放',
    running,
    warning,
    dim: warning,
    isNew: drone.sn === 'SN-NEW',
    maintenance: lastMaintenance ? `${lastMaintenance.date} ${lastMaintenance.note}` : '暂无维护记录',
    warningHint: '三者险不足500万或适航未通过，不能进入在线运力池。',
  };
}

function back() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }
  uni.redirectTo({ url: '/pages-owner/devices/index' });
}

function openDevice(device: DeviceRow) {
  selectedDeviceId.value = selectedDeviceId.value === device.id ? '' : device.id;
}
</script>

<style lang="scss" scoped>
.device-page {
  min-height: 100vh;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 46rpx;
  box-sizing: border-box;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 50;
  height: 122rpx;
  padding: 0 48rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.back-button,
.topbar-spacer {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 60rpx;
}

.back-button {
  color: #e1fdff;
}

.topbar-title {
  margin-left: 34rpx;
  color: #f0f3ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 49rpx;
  line-height: 64rpx;
  font-weight: 900;
}

.content {
  padding: 172rpx 31rpx 0;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.heading-wrap {
  display: flex;
  align-items: center;
  gap: 23rpx;
  min-width: 0;
}

.cyan-line {
  width: 8rpx;
  height: 48rpx;
  border-radius: 8rpx;
  background: #00f2ff;
  flex: 0 0 8rpx;
}

.section-title {
  color: #f0f3ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 36rpx;
  line-height: 49rpx;
  font-weight: 900;
  white-space: nowrap;
}

.role-chip {
  height: 50rpx;
  padding: 0 17rpx;
  border-radius: 5rpx;
  border: 2rpx solid rgba(58, 73, 75, .72);
  background: #262a34;
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 22rpx;
  line-height: 30rpx;
  font-weight: 900;
}

.role-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #3b82f6;
}

.section-desc {
  display: block;
  margin: 30rpx 0 46rpx 31rpx;
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 42rpx;
  font-weight: 700;
}

.info-banner {
  min-height: 155rpx;
  margin-bottom: 46rpx;
  padding: 30rpx 35rpx;
  border-radius: 13rpx;
  border: 2rpx solid rgba(58, 73, 75, .52);
  background: rgba(30, 36, 51, .62);
  color: #b9cacb;
  display: flex;
  align-items: flex-start;
  gap: 29rpx;
  font-size: 27rpx;
  line-height: 41rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.info-banner :deep(.wd-icon),
.info-banner :deep(.stitch-icon) {
  color: #3b82f6;
  flex: 0 0 auto;
}

.mono {
  font-family: "JetBrains Mono", monospace;
  letter-spacing: .08em;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.device-card {
  padding: 41rpx 40rpx;
  border-radius: 14rpx;
  border: 2rpx solid rgba(58, 73, 75, .42);
  background: #0f131d;
  box-sizing: border-box;
}

.device-card.selected {
  border-color: rgba(0, 242, 255, .72);
  box-shadow: 0 0 0 2rpx rgba(0, 242, 255, .18);
}

.device-card.dim {
  opacity: .74;
}

.device-top {
  display: grid;
  grid-template-columns: 93rpx minmax(0, 1fr) auto;
  align-items: start;
  gap: 32rpx;
  margin-bottom: 32rpx;
}

.aircraft-tile {
  width: 93rpx;
  height: 93rpx;
  border-radius: 7rpx;
  border: 2rpx solid rgba(58, 73, 75, .2);
  background: #262a34;
  display: flex;
  align-items: center;
  justify-content: center;
}

.aircraft-icon {
  width: 66rpx;
  height: 66rpx;
}

.device-copy {
  min-width: 0;
}

.name-row {
  min-height: 43rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.device-name {
  color: #e8ebf8;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 35rpx;
  line-height: 47rpx;
  font-weight: 900;
  @include ellipsis(1);
}

.warn-icon {
  color: #f59e0b;
  flex: 0 0 auto;
}

.device-meta {
  margin-top: 13rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 23rpx;
  line-height: 34rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 13rpx;
  flex-wrap: wrap;
}

.new-chip {
  padding: 3rpx 9rpx;
  border-radius: 3rpx;
  background: #313540;
  color: #b9cacb;
}

.meta-dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background: #3a494b;
}

.pass-chip {
  min-width: 101rpx;
  height: 50rpx;
  padding: 0 15rpx;
  border-radius: 5rpx;
  border: 2rpx solid rgba(16, 185, 129, .45);
  background: rgba(16, 185, 129, .1);
  color: #10b981;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23rpx;
  line-height: 31rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.status-grid {
  position: relative;
  min-height: 128rpx;
  border-radius: 7rpx;
  border: 2rpx solid rgba(58, 73, 75, .35);
  background: #1b1f2a;
  display: grid;
  grid-template-columns: 1.08fr .96fr 1fr;
  overflow: hidden;
}

.status-grid.warning {
  border-color: rgba(245, 158, 11, .3);
}

.status-grid.warning::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 7rpx;
  background: #f59e0b;
}

.status-col {
  min-width: 0;
  padding: 28rpx 25rpx;
  border-left: 2rpx solid rgba(58, 73, 75, .43);
  box-sizing: border-box;
}

.status-col:first-child {
  border-left: 0;
}

.status-col.insurance {
  padding-left: 26rpx;
}

.status-grid.warning .status-col.insurance {
  padding-left: 41rpx;
}

.label {
  display: block;
  color: #b9cacb;
  font-size: 23rpx;
  line-height: 31rpx;
  font-weight: 900;
}

.value-line,
.run-state {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 29rpx;
  line-height: 39rpx;
  font-weight: 900;
}

.value-line {
  color: #e8ebf8;
}

.value-line :deep(.wd-icon),
.value-line :deep(.stitch-icon) {
  color: #10b981;
}

.amount {
  display: block;
  margin-top: 10rpx;
  color: #e8ebf8;
  font-family: "JetBrains Mono", monospace;
  font-size: 29rpx;
  line-height: 39rpx;
  font-weight: 900;
}

.amount.amber {
  color: #f59e0b;
}

.run-state {
  color: #b9cacb;
}

.run-state.running {
  color: #00f2ff;
}

.state-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  border: 2rpx solid #3a494b;
  box-sizing: border-box;
  flex: 0 0 16rpx;
}

.run-state.running .state-dot {
  background: #00dbe7;
  border-color: #00dbe7;
}

.device-detail-panel {
  margin-top: 32rpx;
  padding: 34rpx;
  border-radius: 14rpx;
  border: 2rpx solid rgba(0, 242, 255, .42);
  background: #101723;
  box-sizing: border-box;
}

.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

.detail-kicker,
.detail-title {
  display: block;
}

.detail-kicker {
  color: #00f2ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 21rpx;
  line-height: 28rpx;
  font-weight: 900;
  letter-spacing: .14em;
}

.detail-title {
  margin-top: 8rpx;
  color: #f0f3ff;
  font-size: 34rpx;
  line-height: 44rpx;
  font-weight: 900;
}

.detail-close {
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  background: rgba(58, 73, 75, .42);
  color: #e8ebf8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 54rpx;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.detail-item {
  min-height: 96rpx;
  padding: 18rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(58, 73, 75, .38);
  background: #0b0e14;
  box-sizing: border-box;
}

.detail-item text:first-child {
  display: block;
  color: #b9cacb;
  font-size: 22rpx;
  line-height: 30rpx;
  font-weight: 800;
}

.detail-item text:last-child {
  display: block;
  margin-top: 8rpx;
  color: #e8ebf8;
  font-size: 27rpx;
  line-height: 36rpx;
  font-weight: 900;
}

.detail-warning {
  margin-top: 22rpx;
  padding: 20rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(245, 158, 11, .36);
  background: rgba(245, 158, 11, .1);
  color: #fbbf24;
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  font-size: 25rpx;
  line-height: 36rpx;
  font-weight: 800;
}
</style>
