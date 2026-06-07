<template>
  <view class="page track-page">
    <PageHeader title="订单追踪" :desc="subtitle" :role="Role.Client" compact />
    <NoticeBar v-if="order" :tone="alerts.length ? 'warning' : 'success'" :message="alerts.length ? alerts.join(' · ') : '空域、合规、遥测均处于可控状态'" />

    <MapTrack title="实时吊运轨迹" :subtitle="subtitle" :frame="latest" />

    <view v-if="order" class="drawer">
      <view class="between">
        <view>
          <text class="section-title">当前阶段：{{ action.stage }}</text>
          <text class="stage-desc">{{ action.next }}</text>
        </view>
        <StatusTag :status="order.status" />
      </view>
      <text v-if="message" class="message">{{ message }}</text>
      <StepFlow :steps="steps" />
      <view class="telemetry-grid">
        <MetricCard label="高度" :value="latest?.altM ?? '--'" hint="米" />
        <MetricCard label="速度" :value="latest?.speedMs ?? '--'" hint="米/秒" />
        <MetricCard label="电量" :value="latest && latest.batteryPct > 0 ? `${latest.batteryPct}%` : '--'" hint="低于30%告警" :delta-tone="latest && latest.batteryPct > 0 && latest.batteryPct <= 30 ? 'down' : 'up'" />
        <MetricCard label="摆度" :value="latest ? `${latest.swingDeg}°` : '--'" hint="超过30°告警" />
      </view>
    </view>

    <BottomActionBar :primary="action.primary" secondary="刷新遥测" :loading="orderStore.loading" @secondary="startTelemetry" @primary="advance" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import MapTrack from '@/components/MapTrack.vue';
import MetricCard from '@/components/MetricCard.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import StepFlow from '@/components/StepFlow.vue';
import { OrderStatus, Role } from '@/models';
import { taskActionForStatus, taskSteps } from '@/services/task-guidance';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const telemetryStore = useTelemetryStore();
const message = ref('');
const order = computed(() => orderStore.activeOrder ?? orderStore.ensureOrder());
const latest = computed(() => telemetryStore.latest);
const alerts = computed(() => telemetryStore.alerts);
const subtitle = computed(() => order.value ? `${order.value.from.address} → ${order.value.to.address}` : '起终点与围栏实时联动');
const airspace = computed(() => order.value ? repo.airspace.where((item) => item.orderId === order.value!.id)[0] : undefined);
const action = computed(() => order.value ? taskActionForStatus(order.value, true, airspace.value) : {
  stage: '待处理',
  next: '暂无订单，请返回首页发起吊运。',
  primary: '返回首页',
  disabled: false,
  reason: '',
  terminal: true,
});
const steps = computed(() => taskSteps(order.value?.status ?? OrderStatus.Confirmed));

function startTelemetry() {
  if (order.value) telemetryStore.start(order.value.id);
  message.value = '遥测已刷新，地图和告警将随飞行状态更新。';
}

async function advance() {
  const current = order.value;
  if (!current) return;
  if (current.status === OrderStatus.Settled) {
    message.value = '订单已结算，正在前往评价与结算页。';
    uni.navigateTo({ url: '/pages-client/review/index' });
    return;
  }
  if (current.status === OrderStatus.Cancelled || current.status === OrderStatus.Exception) {
    message.value = '当前订单不能继续推进，请查看异常处理或重新发单。';
    return;
  }
  try {
    const before = current.status;
    orderStore.loading = true;
    const next = await orderStore.advance();
    if (next.status === OrderStatus.InFlight) telemetryStore.start(next.id);
    message.value = next.status === before ? '状态未变化，请查看当前阶段说明。' : `已进入${taskActionForStatus(next, true, airspace.value).stage}`;
    if (next.status === OrderStatus.Settled) uni.navigateTo({ url: '/pages-client/review/index' });
  } catch (e) {
    message.value = e instanceof Error ? e.message : '流程推进失败';
  } finally {
    orderStore.loading = false;
  }
}
</script>

<style lang="scss" scoped>
.track-page {
  padding-bottom: calc($sp-10 + 160rpx);
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

.stage-desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.message {
  display: block;
  margin: $sp-3 0;
  padding: $sp-2;
  border-radius: $r-sm;
  background: $info-bg;
  color: $info-ink;
  font-size: $fs-sm;
  line-height: 1.45;
}
</style>
