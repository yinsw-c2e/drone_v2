<template>
  <view class="page task-page">
    <PageHeader title="任务执行态势" :desc="subtitle" :role="Role.Pilot" compact />
    <RouteHero
      class="section"
      title="飞手任务地图"
      subtitle="围栏、航线、遥测和应急指令统一监控。"
      :from="order?.from.address"
      :to="order?.to.address"
      :frame="latest"
      :status="emergencyAvailable ? '执行阶段可应急' : '应急关闭'"
      :metrics="heroMetrics"
      tone="pilot"
      compact
    />

    <KpiStrip class="section telemetry-strip" :items="telemetryItems" />

    <view v-if="order" class="card section cockpit-card">
      <view class="between">
        <view>
          <text class="section-title">当前阶段：{{ action.stage }}</text>
          <text class="stage-desc">{{ action.next }}</text>
        </view>
        <StatusTag :status="order.status" />
      </view>
      <NoticeBar v-if="action.reason" tone="warning" :message="action.reason" />
      <StepFlow :steps="steps" />
    </view>

    <view v-if="order" class="card section checklist-card">
      <SectionHeader title="起飞前安检" :desc="`${checkedCount}/${checklist.length} 项完成；完成后主按钮才可继续。`" />
      <wd-cell-group insert>
        <InfoCell v-for="item in checklist" :key="item.key" :title="item.label">
          <template #side>
            <wd-checkbox :model-value="item.done" shape="square" @change="item.done = !item.done" />
          </template>
        </InfoCell>
      </wd-cell-group>
      <NoticeBar v-if="!allChecked" tone="warning" message="完成 4 项安检后可放行" />
      <text v-if="error" class="error">{{ error }}</text>
    </view>

    <CommandPanel
      class="section"
      tone="pilot"
      eyebrow="飞行指挥"
      title="应急处置"
      desc="返航/降落当前为演示指令反馈；异常只在状态机允许阶段开启。"
      primary="处置菜单"
      secondary="低电量"
      :disabled="!emergencyAvailable"
      :reason="emergencyReason"
      @secondary="lowBattery"
      @primary="showEmergencySheet = true"
    />
    <wd-action-sheet v-model="showEmergencySheet" title="应急处置" cancel-text="取消" :actions="emergencyActions" @select="handleEmergencySelect" />
    <view class="section emergency-grid">
      <NoticeBar v-if="emergencyReason" tone="warning" :message="emergencyReason" />
      <NoticeBar v-if="feedback" class="feedback" :message="feedback" />
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
import CommandPanel from '@/components/CommandPanel.vue';
import InfoCell from '@/components/InfoCell.vue';
import KpiStrip from '@/components/KpiStrip.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteHero from '@/components/RouteHero.vue';
import SectionHeader from '@/components/SectionHeader.vue';
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
const showEmergencySheet = ref(false);
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
const flightState = computed(() => {
  if (!order.value) return '待处理';
  if (order.value.status === OrderStatus.Settled) return '已结算';
  if (order.value.status === OrderStatus.Completed) return '已完成';
  if (order.value.status === OrderStatus.Exception) return '异常';
  if (order.value.status === OrderStatus.InFlight) return '飞行中';
  if (order.value.status === OrderStatus.Unloading) return '卸货中';
  if (order.value.status === OrderStatus.Loading) return '装货中';
  if (order.value.status === OrderStatus.Preparing) return '准备中';
  return '待起飞';
});
const heroMetrics = computed(() => [
  { label: '当前阶段', value: stageBrief.value, hint: action.value.terminal ? '终态' : '流程节点', tone: action.value.terminal ? 'success' as const : 'info' as const },
  { label: '飞行状态', value: flightState.value, hint: latest.value ? '遥测在线' : '按阶段判断', tone: flightState.value === '飞行中' ? 'info' as const : flightState.value === '异常' ? 'danger' as const : 'neutral' as const },
  { label: '电量', value: latest.value && latest.value.batteryPct > 0 ? `${latest.value.batteryPct}%` : '--', hint: latest.value ? '遥测' : '暂无遥测', tone: latest.value && latest.value.batteryPct > 0 && latest.value.batteryPct <= 30 ? 'danger' as const : 'success' as const },
]);
const stageBrief = computed(() => {
  const map: Partial<Record<string, string>> = {
    待空域审批: '待审批',
    起飞前准备: '准备中',
    已完成: '已完成',
    已结算: '已结算',
    异常处理: '异常',
  };
  return map[action.value.stage] ?? action.value.stage;
});
const telemetryItems = computed(() => [
  { label: '高度', value: latest.value?.altM ?? '--', hint: '米', tone: 'info' as const },
  { label: '速度', value: latest.value?.speedMs ?? '--', hint: '米/秒', tone: 'neutral' as const },
  { label: '电量', value: latest.value && latest.value.batteryPct > 0 ? `${latest.value.batteryPct}%` : '--', hint: '动力', tone: latest.value && latest.value.batteryPct > 0 && latest.value.batteryPct <= 30 ? 'danger' as const : 'success' as const },
  { label: '摆度', value: latest.value ? `${latest.value.swingDeg}°` : '--', hint: '吊挂', tone: 'warning' as const },
]);
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
const emergencyActions = computed(() => [
  { name: '返航', subname: '记录演示返航指令' },
  { name: '降落', subname: '记录演示就近降落指令' },
  { name: '低电量', subname: '注入 30% 低电告警' },
  { name: '应急', subname: emergencyAvailable.value ? '进入异常处置流' : emergencyReason.value, disabled: !emergencyAvailable.value },
]);

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
    ? '返航指令已记录；生产环境接入真机 SDK 后执行自动返航。'
    : '降落指令已记录；生产环境接入真机 SDK 后执行就近降落。';
}

function handleEmergencySelect(event: { item: { name: string } }) {
  if (event.item.name === '返航') mockEmergency('return');
  if (event.item.name === '降落') mockEmergency('land');
  if (event.item.name === '低电量') lowBattery();
  if (event.item.name === '应急') exception();
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

.telemetry-strip {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.stage-desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
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
  margin-top: $sp-3;
}

.emergency-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $sp-2;
}

.emergency-grid :deep(.notice-bar) {
  grid-column: 1 / -1;
}
</style>
