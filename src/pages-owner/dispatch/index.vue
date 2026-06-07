<template>
  <view class="page">
    <PageHeader title="在线运力控制" desc="上线运力进入业主匹配池；忙碌运力需订单完成后恢复。" :role="Role.Owner" />

    <view class="section">
      <NoticeBar v-if="error" tone="danger" :message="error" />
      <NoticeBar v-if="feedback" :message="feedback" />
      <view v-for="unit in capacity" :key="unit.id" class="card capacity-card">
        <view class="between">
          <view>
            <text class="capacity-title">{{ droneName(unit.droneId) }}</text>
            <text class="muted">{{ pilotName(unit.pilotId) }} · {{ unit.location.address || '低空货运中心' }}</text>
            <text class="muted">{{ capacityAction(unit.status).description }}</text>
          </view>
          <text :class="['state', unit.status]">{{ capacityStatusLabel(unit.status) }}</text>
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
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import type { CapacityStatus } from '@/models';
import { ownerCapacityAction } from '@/services/action-plans';
import { setCapacityOffline, setCapacityOnline } from '@/services/app-flow';
import { capacityStatusLabel } from '@/services/display-labels';
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

.actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;
  margin-top: $sp-3;
}
</style>
