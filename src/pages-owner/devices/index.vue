<template>
  <view class="page">
    <view class="between">
      <text class="title">设备与运力</text>
      <RoleBadge :role="Role.Owner" />
    </view>

    <view class="section">
      <text v-if="error" class="error">{{ error }}</text>
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
import { computed, ref } from 'vue';
import RoleBadge from '@/components/RoleBadge.vue';
import { Role } from '@/models';
import { deployOwnerDrone, withdrawOwnerDrone } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const error = ref('');

function deploy(droneId: string) {
  try {
    error.value = '';
    deployOwnerDrone(user.value.id, droneId);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '投放失败';
  }
}

function withdraw(droneId: string) {
  error.value = '';
  withdrawOwnerDrone(user.value.id, droneId);
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

.error {
  display: block;
  margin-bottom: $sp-3;
  color: $danger-ink;
  background: $danger-bg;
  border-radius: $r-sm;
  padding: $sp-2;
  font-size: $fs-sm;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-3;
  margin-top: $sp-3;
}
</style>
