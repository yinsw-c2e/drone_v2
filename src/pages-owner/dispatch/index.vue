<template>
  <view class="page">
    <view class="between">
      <text class="title">运力调度</text>
      <RoleBadge :role="Role.Owner" />
    </view>

    <view class="section">
      <text v-if="error" class="error">{{ error }}</text>
      <text v-if="feedback" class="feedback">{{ feedback }}</text>
      <view v-for="unit in capacity" :key="unit.id" class="card capacity-card">
        <view class="between">
          <view>
            <text class="capacity-title">{{ droneName(unit.droneId) }}</text>
            <text class="muted">{{ pilotName(unit.pilotId) }} · {{ unit.location.address || '低空货运中心' }}</text>
            <text class="muted">{{ capacityAction(unit.status).description }}</text>
          </view>
          <text :class="['state', unit.status]">{{ unit.status }}</text>
        </view>
        <view class="actions">
          <button v-if="capacityAction(unit.status).secondaryLabel" class="secondary-button" @click="setOffline(unit.id)">{{ capacityAction(unit.status).secondaryLabel }}</button>
          <button v-if="capacityAction(unit.status).primaryLabel" class="primary-button" @click="setOnline(unit.id)">{{ capacityAction(unit.status).primaryLabel }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import RoleBadge from '@/components/RoleBadge.vue';
import { Role } from '@/models';
import type { CapacityStatus } from '@/models';
import { ownerCapacityAction } from '@/services/action-plans';
import { setCapacityOffline, setCapacityOnline } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const capacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id));
const error = ref('');
const feedback = ref('');

function droneName(id: string) {
  const drone = repo.drones.find(id);
  return drone ? `${drone.brand} ${drone.model}` : id;
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
.title {
  font-size: $fs-h1;
  line-height: 1.25;
  color: $ink-900;
  font-weight: $fw-bold;
}

.capacity-card {
  margin-bottom: $sp-3;
}

.capacity-title {
  display: block;
  font-size: $fs-h3;
  line-height: 1.35;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.state {
  padding: $sp-1 $sp-2;
  border-radius: $r-pill;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-cap;
}

.state.online {
  background: $success-bg;
  color: $success-ink;
}

.state.busy {
  background: $warning-bg;
  color: $warning-ink;
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

.feedback {
  display: block;
  margin-bottom: $sp-3;
  color: $info-ink;
  background: $info-bg;
  border-radius: $r-sm;
  padding: $sp-2;
  font-size: $fs-sm;
}

.actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;
  margin-top: $sp-3;
}
</style>
