<template>
  <view class="page">
    <view class="between">
      <text class="title">设备与运力</text>
      <RoleBadge :role="Role.Owner" />
    </view>

    <view class="section">
      <view v-for="drone in drones" :key="drone.id" class="card drone-card">
        <view class="between">
          <view>
            <text class="drone-title">{{ drone.brand }} {{ drone.model }}</text>
            <text class="muted">载荷 {{ drone.maxPayloadKg }}kg · 三者险 {{ Math.round(drone.insured.thirdPartyAmount / 10000) }}万</text>
          </view>
          <text :class="['state', drone.status]">{{ drone.status }}</text>
        </view>
        <view class="actions">
          <button class="secondary-button" @click="withdraw(drone.id)">撤回</button>
          <button class="primary-button" @click="deploy(drone.id)">投放</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import RoleBadge from '@/components/RoleBadge.vue';
import { CapacityStatus, Role } from '@/models';
import { createCapacity } from '@/models/factory';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));

function deploy(droneId: string) {
  const existing = repo.capacity.where((c) => c.droneId === droneId)[0];
  if (existing) {
    repo.capacity.update(existing.id, { status: CapacityStatus.Online });
  } else {
    const pilot = repo.pilots.all()[0];
    repo.capacity.insert(createCapacity({ pilotId: pilot.userId, droneId, ownerId: user.value.id, location: pilot.location }));
  }
  repo.drones.update(droneId, { status: 'idle' });
}

function withdraw(droneId: string) {
  repo.capacity.where((c) => c.droneId === droneId).forEach((c) => repo.capacity.update(c.id, { status: CapacityStatus.Offline }));
}
</script>

<style lang="scss" scoped>
.title {
  font-size: $fs-h1;
  line-height: 1.25;
  color: $ink-900;
  font-weight: $fw-bold;
}

.drone-card {
  margin-bottom: $sp-3;
}

.drone-title {
  display: block;
  font-size: $fs-h3;
  line-height: 1.35;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.state {
  @include tabular;
  padding: 6rpx 16rpx;
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
  grid-template-columns: 1fr 1fr;
  gap: $sp-3;
  margin-top: $sp-3;
}
</style>
