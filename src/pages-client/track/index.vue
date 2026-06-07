<template>
  <view class="page track-page">
    <PageHeader title="航线与状态总览" :desc="subtitle" :role="Role.Client" compact />
    <NoticeBar v-if="order" :tone="alerts.length ? 'warning' : 'success'" :message="alerts.length ? alerts.join(' · ') : '空域、合规、遥测均处于可控状态'" />

    <RouteHero
      class="section"
      title="实时吊运轨迹"
      subtitle="地图、遥测、空域与围栏同步监控。"
      :from="order?.from.address"
      :to="order?.to.address"
      :frame="latest"
      :status="alerts.length ? '告警需关注' : '空域可控'"
      :metrics="heroMetrics"
      compact
    />

    <view v-if="order" class="drawer">
      <view class="between">
        <view>
          <text class="section-title">当前阶段：{{ action.stage }}</text>
          <text class="stage-desc">{{ action.next }}</text>
        </view>
        <StatusTag :status="order.status" />
      </view>
      <text v-if="message" class="message">{{ message }}</text>
      <KpiStrip class="telemetry-strip" :items="telemetryItems" />
      <StepFlow :steps="steps" />
    </view>

    <BottomActionBar :primary="action.primary" secondary="刷新遥测" :loading="orderStore.loading" @secondary="startTelemetry" @primary="advance" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import KpiStrip from '@/components/KpiStrip.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteHero from '@/components/RouteHero.vue';
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
const eta = computed(() => order.value?.status === OrderStatus.Settled ? '已送达' : latest.value ? '飞行中' : '--');
const distance = computed(() => order.value?.distanceKm ? `${order.value.distanceKm.toFixed(1)}km` : '5km');
const heroMetrics = computed(() => {
  if (order.value?.status === OrderStatus.Settled || order.value?.status === OrderStatus.Completed) {
    return [
      { label: '送达状态', value: '已送达', hint: order.value.status === OrderStatus.Settled ? '已结算' : '待结算', tone: 'success' as const },
      { label: '航线距离', value: distance.value, hint: '本单', tone: 'neutral' as const },
      { label: '空域状态', value: '已留痕', hint: '审批记录', tone: 'info' as const },
    ];
  }
  return [
    { label: '航线状态', value: eta.value === '飞行中' ? '飞行中' : '待执行', hint: eta.value === '飞行中' ? '遥测更新中' : '按阶段推进', tone: eta.value === '飞行中' ? 'info' as const : 'neutral' as const },
    { label: '航线距离', value: distance.value, hint: '预计', tone: 'neutral' as const },
    { label: '电量', value: latest.value && latest.value.batteryPct > 0 ? `${latest.value.batteryPct}%` : '--', hint: latest.value ? '遥测' : '暂无遥测', tone: latest.value && latest.value.batteryPct > 0 && latest.value.batteryPct <= 30 ? 'danger' as const : 'success' as const },
  ];
});
const telemetryItems = computed(() => [
  { label: '高度', value: latest.value?.altM ?? '--', hint: '米', tone: 'info' as const },
  { label: '速度', value: latest.value?.speedMs ?? '--', hint: '米/秒', tone: 'neutral' as const },
  { label: '电量', value: latest.value && latest.value.batteryPct > 0 ? `${latest.value.batteryPct}%` : '--', hint: '低电告警', tone: latest.value && latest.value.batteryPct > 0 && latest.value.batteryPct <= 30 ? 'danger' as const : 'success' as const },
  { label: '摆度', value: latest.value ? `${latest.value.swingDeg}°` : '--', hint: '吊挂稳定', tone: 'warning' as const },
]);
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

.telemetry-strip {
  margin: $sp-4 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
