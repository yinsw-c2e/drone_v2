<template>
  <view class="page task-page">
    <MapTrack title="飞手任务地图" :subtitle="subtitle" :frame="latest" />

    <view v-if="order" class="card section">
      <view class="between">
        <text class="section-title">起飞前安检</text>
        <StatusTag :status="order.status" />
      </view>
      <label v-for="item in checklist" :key="item.key" class="check">
        <checkbox :checked="item.done" @click="item.done = !item.done" />
        <text>{{ item.label }}</text>
      </label>
      <text v-if="error" class="error">{{ error }}</text>
    </view>

    <view class="card section">
      <text class="section-title">应急处置</text>
      <view class="emergency">
        <button class="secondary-button">返航</button>
        <button class="secondary-button">降落</button>
        <button class="danger-button" @click="exception">应急</button>
      </view>
    </view>

    <BottomActionBar primary="放行/推进" secondary="低电量演示" :disabled="!allChecked" @secondary="lowBattery" @primary="advance" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import MapTrack from '@/components/MapTrack.vue';
import StatusTag from '@/components/StatusTag.vue';
import { OrderStatus, Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';
import { transition } from '@/utils/order-machine';

const orderStore = useOrderStore();
const telemetryStore = useTelemetryStore();
const error = ref('');
const checklist = reactive([
  { key: 'battery', label: '电池与动力系统正常', done: true },
  { key: 'cargo', label: '吊框锁具与货物固定完成', done: true },
  { key: 'route', label: '空域批复与航线围栏确认', done: true },
  { key: 'insurance', label: '三者险与货物险有效', done: true },
]);
const order = computed(() => orderStore.activeOrder ?? orderStore.ensureOrder());
const latest = computed(() => telemetryStore.latest);
const allChecked = computed(() => checklist.every((item) => item.done));
const subtitle = computed(() => order.value ? `${order.value.from.address} → ${order.value.to.address}` : '任务航线');

function advance() {
  try {
    error.value = '';
    if (!allChecked.value) throw new Error('安检未完成，不能放行');
    const next = orderStore.advance();
    if (next.status === OrderStatus.InFlight) telemetryStore.start(next.id);
  } catch (e) {
    error.value = e instanceof Error ? e.message : '流程推进失败';
  }
}

function lowBattery() {
  if (!telemetryStore.latest && order.value) telemetryStore.start(order.value.id);
  telemetryStore.injectLowBattery();
}

function exception() {
  const current = order.value;
  if (!current) return;
  try {
    transition(current.id, OrderStatus.Exception, { actor: Role.Pilot, note: '飞手触发应急' });
  } catch (e) {
    error.value = e instanceof Error ? e.message : '应急流转失败';
  }
}
</script>

<style lang="scss" scoped>
.task-page {
  padding-bottom: calc($sp-10 + 160rpx);
}

.check {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  gap: $sp-2;
  border-bottom: 2rpx solid $line;
  color: $ink-700;
  font-size: $fs-body;
}

.error {
  display: block;
  margin-top: $sp-2;
  color: $danger-ink;
  font-size: $fs-cap;
}

.emergency {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-2;
  margin-top: $sp-3;
}
</style>
