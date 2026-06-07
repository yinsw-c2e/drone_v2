<template>
  <view class="page">
    <PageHeader title="合规设备投放" desc="投放会复用合规门：适航通过、三者险不低于 500 万、载荷有效。" :role="Role.Owner" />

    <view class="section">
      <NoticeBar v-if="error" tone="danger" :message="error" />
      <NoticeBar v-if="feedback" :message="feedback" />
      <view v-for="drone in drones" :key="drone.id" class="card drone-card">
        <view class="asset-line">
          <view class="asset-thumb">
            <view class="asset-wing" />
            <view class="asset-body" />
          </view>
          <view class="asset-copy">
            <text class="drone-title">{{ droneDisplayName(drone) }}</text>
            <text class="muted">载荷 {{ drone.maxPayloadKg }}kg · 三者险 {{ Math.round(drone.insured.thirdPartyAmount / 10000) }}万</text>
            <text class="muted">{{ droneAction(drone).description }}</text>
          </view>
          <text :class="['state', drone.status]">{{ droneStatusLabel(drone.status) }}</text>
        </view>
        <KpiStrip class="asset-kpis" :items="assetKpis(drone)" />
        <view class="actions">
          <button v-if="droneAction(drone).secondaryLabel" class="secondary-button" @click="withdraw(drone.id)">{{ droneAction(drone).secondaryLabel }}</button>
          <button v-if="droneAction(drone).primaryLabel" class="primary-button" @click="deploy(drone.id)">{{ droneAction(drone).primaryLabel }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import KpiStrip from '@/components/KpiStrip.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import type { Drone } from '@/models';
import { ownerDroneAction } from '@/services/action-plans';
import { deployOwnerDrone, withdrawOwnerDrone } from '@/services/app-flow';
import { droneDisplayName, droneStatusLabel } from '@/services/display-labels';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const error = ref('');
const feedback = ref('');

function isOnline(droneId: string) {
  return repo.capacity.where((item) => item.droneId === droneId && item.status === 'online').length > 0;
}

function droneAction(drone: Drone) {
  return ownerDroneAction(drone, isOnline(drone.id));
}

function assetKpis(drone: Drone) {
  return [
    { label: '载荷', value: `${drone.maxPayloadKg}kg`, hint: '有效', tone: 'info' as const },
    { label: '三者险', value: `${Math.round(drone.insured.thirdPartyAmount / 10000)}万`, hint: '门槛500万', tone: drone.insured.thirdPartyAmount >= 5000000 ? 'success' as const : 'danger' as const },
    { label: '维护', value: drone.maintenanceLog.length ? '已记录' : '待补录', hint: '例检', tone: drone.maintenanceLog.length ? 'success' as const : 'warning' as const },
  ];
}

function deploy(droneId: string) {
  try {
    error.value = '';
    feedback.value = '';
    deployOwnerDrone(user.value.id, droneId);
    feedback.value = '设备已上线，已进入匹配候选池。';
  } catch (e) {
    error.value = e instanceof Error ? e.message : '投放失败';
  }
}

function withdraw(droneId: string) {
  error.value = '';
  feedback.value = '';
  withdrawOwnerDrone(user.value.id, droneId);
  feedback.value = '设备已撤回，不会继续进入新的匹配候选。';
}
</script>

<style lang="scss" scoped>
.drone-card {
  margin-bottom: $sp-3;
}

.asset-line {
  display: grid;
  grid-template-columns: 104rpx minmax(0, 1fr) auto;
  gap: $sp-3;
  align-items: start;
}

.asset-thumb {
  width: 104rpx;
  height: 104rpx;
  border-radius: $r-md;
  background: $role-owner-weak;
  position: relative;
}

.asset-wing,
.asset-body {
  position: absolute;
  border-radius: $r-pill;
  background: $role-owner;
}

.asset-wing {
  left: 20rpx;
  right: 20rpx;
  top: 50rpx;
  height: 8rpx;
}

.asset-body {
  width: 32rpx;
  height: 32rpx;
  left: 36rpx;
  top: 34rpx;
}

.asset-copy {
  min-width: 0;
}

.drone-title {
  display: block;
  font-size: $fs-h3;
  line-height: 1.35;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.asset-kpis {
  margin-top: $sp-3;
}

.state {
  @include tabular;
  padding: $sp-1 $sp-2;
  border-radius: $r-pill;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-cap;
}

.state.idle {
  color: $success-ink;
  background: $success-bg;
}

.state.busy {
  color: $warning-ink;
  background: $warning-bg;
}

.actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;
  margin-top: $sp-3;
}
</style>
