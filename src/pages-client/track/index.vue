<template>
  <view class="page track-page">
    <view v-if="order" class="alert-strip">
      <text v-if="alerts.length">{{ alerts.join(' · ') }}</text>
      <text v-else>空域、合规、遥测均处于可控状态</text>
    </view>

    <MapTrack title="实时吊运轨迹" :subtitle="subtitle" :frame="latest" />

    <view v-if="order" class="drawer">
      <view class="between">
        <text class="section-title">订单进度</text>
        <StatusTag :status="order.status" />
      </view>
      <StepFlow :steps="steps" />
      <view class="telemetry-grid">
        <MetricCard label="高度" :value="latest?.altM ?? 0" hint="米" />
        <MetricCard label="速度" :value="latest?.speedMs ?? 0" hint="米/秒" />
        <MetricCard label="电量" :value="(latest?.batteryPct ?? 96) + '%'" hint="低于30%告警" :delta-tone="(latest?.batteryPct ?? 96) <= 30 ? 'down' : 'up'" />
        <MetricCard label="摆度" :value="(latest?.swingDeg ?? 0) + '°'" hint="超过30°告警" />
      </view>
    </view>

    <BottomActionBar primary="推进流程" secondary="刷新遥测" @secondary="startTelemetry" @primary="advance" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import MapTrack from '@/components/MapTrack.vue';
import MetricCard from '@/components/MetricCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import StepFlow from '@/components/StepFlow.vue';
import { OrderStatus } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';

const orderStore = useOrderStore();
const telemetryStore = useTelemetryStore();
const order = computed(() => orderStore.activeOrder ?? orderStore.ensureOrder());
const latest = computed(() => telemetryStore.latest);
const alerts = computed(() => telemetryStore.alerts);
const subtitle = computed(() => order.value ? `${order.value.from.address} → ${order.value.to.address}` : '起终点与围栏实时联动');
const steps = computed(() => {
  const status = order.value?.status ?? OrderStatus.Created;
  const labels = [
    [OrderStatus.Created, '发单'],
    [OrderStatus.Matching, '智能匹配'],
    [OrderStatus.Confirmed, '确认运力'],
    [OrderStatus.AirspaceApplying, '空域审批'],
    [OrderStatus.Preparing, '合规安检'],
    [OrderStatus.Loading, '装货'],
    [OrderStatus.InFlight, '飞行中'],
    [OrderStatus.Unloading, '卸货'],
    [OrderStatus.Completed, '完成'],
    [OrderStatus.Settled, '结算'],
  ] as const;
  const currentIndex = labels.findIndex(([value]) => value === status);
  return labels.map(([, title], index) => ({
    title,
    state: index < currentIndex ? 'done' as const : index === currentIndex ? 'current' as const : 'todo' as const,
    time: order.value?.events[index]?.at?.slice(11, 16),
  }));
});

function startTelemetry() {
  if (order.value) telemetryStore.start(order.value.id);
}

function advance() {
  const next = orderStore.advance();
  if (next.status === OrderStatus.InFlight) telemetryStore.start(next.id);
  if (next.status === OrderStatus.Settled) uni.navigateTo({ url: '/pages-client/review/index' });
}
</script>

<style lang="scss" scoped>
.track-page {
  padding-bottom: calc($sp-10 + 160rpx);
}

.alert-strip {
  margin-bottom: $sp-3;
  min-height: 72rpx;
  padding: 0 $sp-3;
  border-radius: $r-md;
  background: $warning-bg;
  color: $warning-ink;
  display: flex;
  align-items: center;
  font-size: $fs-sm;
}

.drawer {
  margin-top: -$sp-5;
  position: relative;
  border-radius: $r-lg $r-lg $r-md $r-md;
  background: $bg-card;
  box-shadow: $shadow-2;
  padding: $sp-4;
}

.telemetry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-3;
  margin-top: $sp-4;
}
</style>
