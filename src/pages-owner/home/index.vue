<template>
  <view class="page">
    <PageHeader title="设备运营态势" :desc="`${user.nickname} · 设备合规、运力投放与分账钱包`" :role="Role.Owner" />

    <KpiStrip class="section" :items="kpis" />

    <view class="section owner-console">
      <view class="pool-board">
        <view class="pool-head">
          <view>
            <text class="console-label">运力池</text>
            <text class="pool-title">{{ onlineCapacity ? '合规设备正在接入匹配池' : '暂无在线合规运力' }}</text>
          </view>
          <wd-tag round :type="onlineCapacity ? 'success' : 'warning'">{{ onlineCapacity ? '可调度' : '待投放' }}</wd-tag>
        </view>
        <view class="pool-lanes">
          <view v-for="item in poolStats" :key="item.label" :class="['pool-lane', item.tone]">
            <text class="lane-value">{{ item.value }}</text>
            <text class="lane-label">{{ item.label }}</text>
          </view>
        </view>
        <view class="compliance-gate">
          <view v-for="item in gateItems" :key="item.label" class="gate-item">
            <text :class="['gate-dot', item.pass ? 'pass' : 'warn']" />
            <text>{{ item.label }}</text>
          </view>
        </view>
        <view class="home-actions">
          <wd-button type="info" plain block @click="openWallet">钱包</wd-button>
          <wd-button type="primary" block @click="openDevices">调度</wd-button>
        </view>
      </view>

      <wd-card class="queue-card" title="设备队列">
        <view class="device-queue">
          <view v-for="drone in visibleDrones" :key="drone.id" class="device-row">
            <view class="device-mark">
              <text>{{ drone.brand.slice(0, 1) }}</text>
            </view>
            <view class="device-copy">
              <text class="device-name">{{ droneName(drone) }}</text>
              <text class="muted">载荷 {{ drone.maxPayloadKg }}kg · 三者险 {{ Math.round(drone.insured.thirdPartyAmount / 10000) }}万</text>
            </view>
            <wd-tag round :type="canDeploy(drone) ? 'success' : 'warning'">{{ canDeploy(drone) ? droneStatusName(drone.status) : '需补合规' }}</wd-tag>
          </view>
        </view>
        <view v-if="!visibleDrones.length" class="empty-queue">
          <text class="device-name">暂无设备资产</text>
          <text class="muted">提交机主设备认证后会写入设备台账并生成运力。</text>
        </view>
      </wd-card>
    </view>

    <wd-card class="section ops-card" title="下一步操作">
      <wd-cell-group insert>
        <InfoCell title="可投放设备" desc="空闲且保额达标的设备可进入在线运力池">
          <template #side>
            <wd-tag round type="success">{{ deployableDrones.length }} 台</wd-tag>
          </template>
        </InfoCell>
        <InfoCell title="合规缺口" :desc="complianceHint">
          <template #side>
            <wd-tag round :type="blockedDrones.length ? 'warning' : 'success'">{{ blockedDrones.length ? '需处理' : '已满足' }}</wd-tag>
          </template>
        </InfoCell>
      </wd-cell-group>
      <view class="ops-actions">
        <wd-button type="info" plain block @click="openAuth">补认证</wd-button>
        <wd-button type="primary" block @click="openDevices">管理设备</wd-button>
      </view>
    </wd-card>

    <IconActionGrid class="section" :columns="3" :actions="quickActions" @select="handleQuick" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import IconActionGrid from '@/components/IconActionGrid.vue';
import InfoCell from '@/components/InfoCell.vue';
import KpiStrip from '@/components/KpiStrip.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import type { Drone } from '@/models';
import { auditStatusLabel, droneDisplayName, droneStatusLabel } from '@/services/display-labels';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const onlineCapacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id && c.status === 'online').length);
const busyCapacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id && c.status === 'busy').length);
const offlineCapacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id && c.status === 'offline').length);
const deployableDrones = computed(() => drones.value.filter((d) => d.status === 'idle' && d.airworthiness === 'approved' && d.insured.thirdPartyAmount >= 5000000));
const blockedDrones = computed(() => drones.value.filter((d) => d.airworthiness !== 'approved' || d.insured.thirdPartyAmount < 5000000 || !d.maintenanceLog.length));
const visibleDrones = computed(() => drones.value.slice(0, 3));
const kpis = computed(() => [
  { label: '设备数', value: drones.value.length, hint: '绑定资产', tone: 'neutral' as const },
  { label: '在线运力', value: onlineCapacity.value, hint: '可匹配', tone: 'success' as const },
  { label: '保险门槛', value: '500万', hint: '三者险', tone: 'warning' as const },
]);
const poolStats = computed(() => [
  { label: '在线可接', value: onlineCapacity.value, tone: 'success' },
  { label: '任务忙碌', value: busyCapacity.value, tone: 'warning' },
  { label: '已下线', value: offlineCapacity.value, tone: 'neutral' },
]);
const gateItems = computed(() => [
  { label: '适航通过', pass: drones.value.some((d) => d.airworthiness === 'approved') },
  { label: '三者险达标', pass: drones.value.some((d) => d.insured.thirdPartyAmount >= 5000000) },
  { label: '维护记录', pass: drones.value.some((d) => d.maintenanceLog.length) },
]);
const complianceHint = computed(() => blockedDrones.value.length ? `${blockedDrones.value.length} 台设备需补适航、保额或维护记录` : '设备满足投放门槛，可进入匹配池');
const quickActions = [
  { key: 'devices', title: '设备', desc: '投放撤回', symbol: '机', status: '资产', tone: 'owner' as const },
  { key: 'auth', title: '认证', desc: '适航/UOM', symbol: '证', status: '合规', tone: 'warning' as const },
  { key: 'credit', title: '信用', desc: '协作评分', symbol: '信', status: '实时', tone: 'success' as const },
];
const droneStatusName = droneStatusLabel;

function openDevices() {
  uni.navigateTo({ url: '/pages-owner/devices/index' });
}

function openWallet() {
  uni.navigateTo({ url: '/pages-owner/wallet/index' });
}

function openAuth() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function openCredit() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function handleQuick(key: string) {
  if (key === 'devices') openDevices();
  if (key === 'auth') openAuth();
  if (key === 'credit') openCredit();
}

function droneName(drone: Drone) {
  return `${droneDisplayName(drone)} · ${auditStatusLabel(drone.airworthiness)}`;
}

function canDeploy(drone: Drone) {
  return drone.status === 'idle' && drone.airworthiness === 'approved' && drone.insured.thirdPartyAmount >= 5000000 && Boolean(drone.maintenanceLog.length);
}
</script>

<style lang="scss" scoped>
.owner-console {
  display: grid;
  gap: $sp-3;
}

.pool-board {
  padding: $sp-4;
  border-radius: $r-lg;
  background: $bg-card;
  border: 2rpx solid $line;
  box-shadow: $shadow-2;
}

.pool-head,
.home-actions,
.ops-actions,
.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
}

.console-label,
.pool-title,
.lane-value,
.lane-label,
.device-name {
  display: block;
}

.console-label {
  color: $role-owner;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.pool-title {
  margin-top: $sp-1;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.pool-lanes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
  margin-top: $sp-4;
}

.pool-lane {
  min-height: 108rpx;
  padding: $sp-2;
  border-radius: $r-md;
  background: $bg-sunken;
  border: 2rpx solid $line;
}

.pool-lane.success {
  background: $success-bg;
  border-color: $success-line;
}

.pool-lane.warning {
  background: $warning-bg;
  border-color: $warning-line;
}

.lane-value {
  @include tabular;
  color: $ink-900;
  font-size: $fs-h2;
  line-height: 1.2;
  font-weight: $fw-bold;
}

.lane-label {
  font-size: $fs-sm;
  color: $ink-500;
  line-height: 1.4;
}

.home-actions {
  margin-top: $sp-4;
}

.compliance-gate {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
  margin-top: $sp-3;
}

.gate-item {
  min-height: 56rpx;
  padding: 0 $sp-2;
  border-radius: $r-pill;
  display: flex;
  align-items: center;
  gap: $sp-1;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-cap;
}

.gate-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: $r-pill;
  background: $warning;
}

.gate-dot.pass {
  background: $success;
}

.queue-card,
.ops-card {
  border: 2rpx solid $line;
  border-radius: $r-lg;
}

.device-queue {
  display: grid;
  gap: $sp-3;
}

.device-row {
  padding: $sp-3 0;
  border-bottom: 2rpx solid $line;
}

.device-row:last-child {
  border-bottom: 0;
}

.device-mark {
  flex: 0 0 72rpx;
  width: 72rpx;
  height: 72rpx;
  border-radius: $r-md;
  background: $role-owner-weak;
  color: $role-owner;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-h3;
  font-weight: $fw-bold;
}

.device-copy {
  flex: 1;
  min-width: 0;
}

.device-name {
  color: $ink-900;
  font-size: $fs-body;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.empty-queue {
  padding: $sp-3;
  border-radius: $r-md;
  background: $bg-sunken;
}

.ops-actions {
  margin-top: $sp-3;
}

@media screen and (min-width: 900px) {
  .owner-console {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
  }
}
</style>
