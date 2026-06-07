<template>
  <view class="page">
    <PageHeader title="在线运力控制" desc="上线运力进入业主匹配池；忙碌运力需订单完成后恢复。" :role="Role.Owner" />

    <view class="section">
      <NoticeBar v-if="error" tone="danger" :message="error" />
      <NoticeBar v-if="feedback" :message="feedback" />
      <wd-card v-for="unit in capacity" :key="unit.id" class="capacity-card">
        <view class="capacity-line">
          <view class="pool-indicator">
            <view :class="['pool-dot', unit.status]" />
            <view class="pool-line" />
          </view>
          <view>
            <text class="capacity-title">{{ droneName(unit.droneId) }}</text>
            <text class="muted">{{ pilotName(unit.pilotId) }} · {{ unit.location.address || '低空货运中心' }}</text>
            <text class="muted">{{ capacityAction(unit.status).description }}</text>
          </view>
          <wd-tag round :type="unit.status === 'online' ? 'success' : unit.status === 'busy' ? 'warning' : 'default'">{{ capacityStatusLabel(unit.status) }}</wd-tag>
        </view>
        <view class="pool-strip">
          <text>匹配池</text>
          <text>{{ capacityStatusLabel(unit.status) }}</text>
          <text>{{ pilotName(unit.pilotId) }}</text>
        </view>
        <view class="actions">
          <wd-button v-if="capacityAction(unit.status).secondaryLabel" type="info" plain block @click="setOffline(unit.id)">{{ capacityAction(unit.status).secondaryLabel }}</wd-button>
          <wd-button v-if="capacityAction(unit.status).primaryLabel" type="primary" block @click="setOnline(unit.id)">{{ capacityAction(unit.status).primaryLabel }}</wd-button>
        </view>
      </wd-card>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import type { CapacityStatus } from '@/models';
import { ownerCapacityAction } from '@/services/action-plans';
import { setCapacityOffline, setCapacityOnline } from '@/services/app-flow';
import { capacityStatusLabel, droneDisplayName } from '@/services/display-labels';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const capacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id));
const error = ref('');
const feedback = ref('');

function droneName(id: string) {
  const drone = repo.drones.find(id);
  return drone ? droneDisplayName(drone) : id;
}

function pilotName(id: string) {
  return repo.users.find(id)?.nickname ?? id;
}

function capacityAction(status: CapacityStatus) {
  return ownerCapacityAction(status);
}

function setOnline(id: string) {
  try {
    error.value = '';
    feedback.value = '';
    setCapacityOnline(user.value.id, id);
    feedback.value = '运力已上线，可被业主匹配。';
  } catch (e) {
    error.value = e instanceof Error ? e.message : '投放失败';
  }
}

function setOffline(id: string) {
  error.value = '';
  feedback.value = '';
  setCapacityOffline(user.value.id, id);
  feedback.value = '运力已撤回，不会进入新的匹配候选。';
}
</script>

<style lang="scss" scoped>
.capacity-card {
  margin-bottom: $sp-3;
  border: 2rpx solid $line;
  border-radius: $r-lg;
  box-shadow: $shadow-soft;
}

.capacity-line {
  display: grid;
  grid-template-columns: 56rpx minmax(0, 1fr) auto;
  gap: $sp-3;
  align-items: start;
}

.pool-indicator {
  min-height: 116rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pool-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: $r-pill;
  background: $ink-400;
  box-shadow: 0 0 0 8rpx $bg-sunken;
}

.pool-dot.online {
  background: $success;
  box-shadow: 0 0 0 8rpx $success-bg;
}

.pool-dot.busy {
  background: $warning;
  box-shadow: 0 0 0 8rpx $warning-bg;
}

.pool-line {
  width: 4rpx;
  flex: 1;
  margin-top: $sp-2;
  border-radius: $r-pill;
  background: $line;
}

.capacity-title {
  display: block;
  font-size: $fs-h3;
  line-height: 1.35;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.pool-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
  margin-top: $sp-3;
  padding: $sp-3;
  border-radius: $r-md;
  background: $surface-panel;
  border: 2rpx solid $line;
}

.pool-strip text {
  color: $ink-700;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;
  margin-top: $sp-3;
}
</style>
