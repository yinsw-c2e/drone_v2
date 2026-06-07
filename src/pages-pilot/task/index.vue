<template>
  <view class="page task-page">
    <MapTrack title="飞手任务地图" :subtitle="subtitle" :frame="latest" />

    <view v-if="order" class="card section">
      <view class="between">
        <view>
          <text class="section-title">当前阶段：{{ action.stage }}</text>
          <text class="stage-desc">{{ action.next }}</text>
        </view>
        <StatusTag :status="order.status" />
      </view>
      <text v-if="action.reason" class="notice">{{ action.reason }}</text>
      <StepFlow :steps="steps" />
    </view>

    <view v-if="order" class="card section">
      <view class="between">
        <text class="section-title">起飞前安检</text>
        <text class="muted">{{ checkedCount }}/{{ checklist.length }} 项完成</text>
      </view>
      <label v-for="item in checklist" :key="item.key" class="check">
        <checkbox :checked="item.done" @click="item.done = !item.done" />
        <text>{{ item.label }}</text>
      </label>
      <text v-if="!allChecked" class="notice">完成 4 项安检后可放行</text>
      <text v-if="error" class="error">{{ error }}</text>
    </view>

    <view class="card section">
      <text class="section-title">应急处置</text>
      <view class="emergency">
        <button class="secondary-button" @click="mockEmergency('return')">返航</button>
        <button class="secondary-button" @click="mockEmergency('land')">降落</button>
        <button class="danger-button" :disabled="!emergencyAvailable" @click="exception">应急</button>
      </view>
      <text v-if="emergencyReason" class="notice">{{ emergencyReason }}</text>
      <text v-if="feedback" class="feedback">{{ feedback }}</text>
    </view>

    <BottomActionBar
      :primary="action.primary"
      secondary="低电量演示"
      :disabled="action.disabled || orderStore.loading"
      :loading="orderStore.loading"
      @secondary="lowBattery"
      @primary="advance"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import MapTrack from '@/components/MapTrack.vue';
import StatusTag from '@/components/StatusTag.vue';
import StepFlow from '@/components/StepFlow.vue';
import { OrderStatus, Role } from '@/models';
import { canTriggerEmergency, emergencyClosedReason } from '@/services/action-plans';
import { taskActionForStatus, taskSteps } from '@/services/task-guidance';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';
import { transition } from '@/utils/order-machine';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const telemetryStore = useTelemetryStore();
const error = ref('');
const feedback = ref('');
const checklist = reactive([
  { key: 'battery', label: '电池与动力系统正常', done: true },
  { key: 'cargo', label: '吊框锁具与货物固定完成', done: true },
  { key: 'route', label: '空域批复与航线围栏确认', done: true },
  { key: 'insurance', label: '三者险与货物险有效', done: true },
]);
const order = computed(() => {
  const active = orderStore.activeOrder;
  if (active?.pilotId) return active;
  const latestAssigned = repo.orders.all().reverse().find((item) => item.pilotId);
  if (latestAssigned) return latestAssigned;
  return active ?? orderStore.ensureOrder();
});
const latest = computed(() => telemetryStore.latest);
const allChecked = computed(() => checklist.every((item) => item.done));
const checkedCount = computed(() => checklist.filter((item) => item.done).length);
const airspace = computed(() => order.value ? repo.airspace.where((item) => item.orderId === order.value!.id)[0] : undefined);
const action = computed(() => order.value ? taskActionForStatus(order.value, allChecked.value, airspace.value) : {
  stage: '待处理',
  next: '暂无任务，请返回任务列表。',
  primary: '返回任务列表',
  disabled: false,
  reason: '',
  terminal: true,
});
const steps = computed(() => taskSteps(order.value?.status ?? OrderStatus.Confirmed));
const emergencyAvailable = computed(() => order.value ? canTriggerEmergency(order.value.status) : false);
const emergencyReason = computed(() => order.value ? emergencyClosedReason(order.value.status) : '');
const subtitle = computed(() => order.value ? `${order.value.from.address} → ${order.value.to.address}` : '任务航线');

async function advance() {
  const current = order.value;
  if (!current) return;
  if (action.value.disabled) {
    error.value = action.value.reason || '当前状态暂不能操作';
    return;
  }
  if (current.status === OrderStatus.Settled) {
    feedback.value = '已跳转到飞手钱包，可查看本单分账入账。';
    uni.navigateTo({ url: '/pages-pilot/wallet/index' });
    return;
  }
  if (current.status === OrderStatus.Cancelled || current.status === OrderStatus.Exception) {
    feedback.value = '已返回任务列表，可继续查看其他任务。';
    uni.navigateTo({ url: '/pages-pilot/hall/index' });
    return;
  }
  try {
    error.value = '';
    feedback.value = '';
    const before = current.status;
    orderStore.loading = true;
    orderStore.activeOrderId = current.id;
    const next = await orderStore.advance();
    if (next.status === OrderStatus.InFlight) telemetryStore.start(next.id);
    if (next.status === before) {
      error.value = action.value.reason || '当前状态未变化，请查看阶段说明后再操作';
    } else {
      feedback.value = `已进入${taskActionForStatus(next, allChecked.value, airspace.value).stage}`;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '流程推进失败';
  } finally {
    orderStore.loading = false;
  }
}

function lowBattery() {
  error.value = '';
  if (!telemetryStore.latest && order.value) {
    telemetryStore.start(order.value.id);
  }
  telemetryStore.injectLowBattery();
  feedback.value = telemetryStore.latest ? '已注入低电量告警，电量降至 30%。' : '暂无任务遥测，进入飞行中后可注入低电量告警。';
}

function mockEmergency(type: 'return' | 'land') {
  feedback.value = type === 'return'
    ? 'Mock 返航指令已记录；生产环境接入真机 SDK 后执行自动返航。'
    : 'Mock 降落指令已记录；生产环境接入真机 SDK 后执行就近降落。';
}

function exception() {
  const current = order.value;
  if (!current) return;
  if (!emergencyAvailable.value) {
    feedback.value = emergencyReason.value || '当前状态不能发起应急处置。';
    return;
  }
  try {
    transition(current.id, OrderStatus.Exception, { actor: Role.Pilot, note: '飞手触发应急' });
    feedback.value = '订单已进入异常状态，后台和业主端可同步看到。';
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    error.value = message.includes('非法流转') ? '当前阶段不能发起应急处置，请查看阶段说明或联系后台。' : '应急处置失败，请联系后台处理。';
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

.stage-desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.notice {
  display: block;
  margin: $sp-3 0;
  padding: $sp-2;
  border-radius: $r-sm;
  color: $warning-ink;
  background: $warning-bg;
  font-size: $fs-sm;
  line-height: 1.45;
}

.error {
  display: block;
  margin-top: $sp-2;
  color: $danger-ink;
  font-size: $fs-cap;
}

.feedback {
  display: block;
  margin-top: $sp-3;
  color: $info-ink;
  background: $info-bg;
  border-radius: $r-sm;
  padding: $sp-2;
  font-size: $fs-sm;
  line-height: 1.45;
}

.emergency {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-2;
  margin-top: $sp-3;
}
</style>
