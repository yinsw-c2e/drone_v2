<template>
  <view class="page">
    <PageHeader title="今日吊运态势" :desc="`${user.nickname} · 发单、匹配、追踪、结算一屏掌控`" :role="Role.Client" />

    <KpiStrip class="section" :items="kpis" />

    <view class="section mission-console">
      <view class="mission-map command-surface">
        <view class="mission-head">
          <view>
            <text class="console-label">{{ order ? '当前吊运' : '常用航线' }}</text>
            <text class="mission-title">{{ missionTitle }}</text>
          </view>
          <StatusTag v-if="order" :status="order.status" />
          <wd-tag v-else round type="primary">可发单</wd-tag>
        </view>
        <view class="route-lane">
          <view class="route-line" />
          <view class="route-node start" />
          <view class="route-node end" />
          <view class="drone-dot" />
        </view>
        <view class="route-copy">
          <text>{{ routeStart }}</text>
          <text>{{ routeEnd }}</text>
        </view>
        <view class="mission-metrics surface-metrics">
          <view v-for="item in missionMetrics" :key="item.label" class="mission-metric">
            <text class="metric-value">{{ item.value }}</text>
            <text class="metric-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="mission-panel command-surface">
        <text class="panel-title">{{ order ? '下一步' : '发单准备' }}</text>
        <NoticeBar class="order-notice" :message="nextCopy" />
        <view class="risk-strip">
          <view v-for="item in riskCards" :key="item.label" :class="['risk-chip', item.tone]">
            <text class="risk-value">{{ item.value }}</text>
            <text class="risk-label">{{ item.label }}</text>
          </view>
        </view>
        <view v-if="order" class="mini-flow">
          <wd-steps class="wot-steps" :active="activeStep" align-center>
            <wd-step v-for="step in homeSteps" :key="step.title" :title="step.title" :description="step.desc" />
          </wd-steps>
        </view>
        <view class="command-actions">
          <wd-button type="primary" block @click="primaryAction">{{ primaryActionLabel }}</wd-button>
          <wd-button type="info" plain block @click="secondaryAction">{{ secondaryActionLabel }}</wd-button>
        </view>
      </view>
    </view>

    <view class="section workbench-grid">
      <wd-card class="work-card" title="常用航线与预算">
        <view class="route-row">
          <view>
            <text class="order-title">北京低空货运中心</text>
            <text class="muted">顺义临空交付点 · 约 38 分钟 · 6-12kg</text>
          </view>
          <wd-tag round type="success">合规池 {{ availableCount }} 台</wd-tag>
        </view>
        <view class="budget-band">
          <view>
            <text class="metric-value">¥260-360</text>
            <text class="metric-label">预估吊运费</text>
          </view>
          <view>
            <text class="metric-value">500万</text>
            <text class="metric-label">三者险门槛</text>
          </view>
        </view>
      </wd-card>

      <wd-card class="work-card" title="最近订单">
        <view v-if="recentOrders.length" class="recent-list">
          <view v-for="item in recentOrders" :key="item.id" class="recent-row">
            <view>
              <text class="order-title">{{ item.cargo.remark || '低空吊运订单' }}</text>
              <text class="muted">{{ item.from.address }} → {{ item.to.address }}</text>
            </view>
            <StatusTag :status="item.status" />
          </view>
        </view>
        <view v-else class="recent-empty">
          <text class="order-title">还没有历史订单</text>
          <text class="muted">先从常用航线发起一笔订单，匹配、追踪和结算会自动串联。</text>
        </view>
      </wd-card>
    </view>

    <IconActionGrid class="section" :actions="quickActions" @select="handleQuick" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import IconActionGrid from '@/components/IconActionGrid.vue';
import KpiStrip from '@/components/KpiStrip.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { OrderStatus, Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const orderStore = useOrderStore();
const user = computed(() => userStore.user.currentRole === Role.Client ? userStore.user : userStore.loginAs(Role.Client));
const order = computed(() => orderStore.activeOrder);
const credit = computed(() => repo.credits.find(user.value.id));
const availableCount = computed(() => repo.capacity.where((c) => c.status === 'online').length);
const allOrders = computed(() => repo.orders.where((item) => item.clientId === user.value.id).reverse());
const recentOrders = computed(() => allOrders.value.slice(0, 2));
const kpis = computed(() => [
  { label: '信用分', value: credit.value?.total ?? 0, hint: credit.value ? `${credit.value.level}级` : '待计算', tone: 'info' as const },
  { label: '在线运力', value: availableCount.value, hint: '合规池', tone: 'success' as const },
  { label: '预算', value: order.value ? `¥${(order.value.budgetCent / 100).toFixed(0)}` : '¥260起', hint: order.value ? '当前单' : '常用航线', tone: 'neutral' as const },
]);
const missionTitle = computed(() => order.value?.cargo.remark || (order.value ? '低空吊运任务' : '精密设备即时吊运'));
const routeStart = computed(() => order.value?.from.address || '北京低空货运中心');
const routeEnd = computed(() => order.value?.to.address || '顺义临空交付点');
const primaryActionLabel = computed(() => {
  if (!order.value) return '立即发单';
  if (order.value.status === OrderStatus.Matching) return '确认方案';
  if (order.value.status === OrderStatus.Settled) return '提交评价';
  return '查看追踪';
});
const secondaryActionLabel = computed(() => order.value ? '补充需求' : '保险方案');
const missionMetrics = computed(() => [
  { label: order.value?.status === OrderStatus.Settled ? '送达状态' : '航线状态', value: order.value ? etaText.value : '可预约' },
  { label: '预算', value: order.value ? `¥${(order.value.budgetCent / 100).toFixed(0)}` : '¥260起' },
  { label: '空域', value: airspaceCopy.value },
]);
const riskCards = computed(() => [
  { label: '在线运力', value: `${availableCount.value}台`, tone: availableCount.value ? 'success' : 'warning' },
  { label: '保险', value: order.value?.policyId ? '已关联' : '可投保', tone: order.value?.policyId ? 'success' : 'info' },
  { label: '货物规则', value: order.value?.cargo.type === 'dangerous' ? '需审批' : '可承运', tone: order.value?.cargo.type === 'dangerous' ? 'warning' : 'success' },
]);
const quickActions = computed(() => [
  { key: 'auth', title: '认证', desc: '实名与货物声明', symbol: '证', status: '可补充', tone: 'info' as const },
  { key: 'credit', title: '信用', desc: `${credit.value?.level ?? '待评'}级雷达`, symbol: '信', status: '实时', tone: 'success' as const },
  { key: 'insurance', title: '保险', desc: '投保与理赔', symbol: '保', status: order.value?.policyId ? '已关联' : '待投保', tone: 'warning' as const },
]);
const etaText = computed(() => {
  if (!order.value) return '--';
  const candidate = order.value.status === 'matching' && !order.value.capacityId ? orderStore.candidates[0] : undefined;
  if (candidate) return `约${candidate.etaMin}分钟`;
  if (order.value.status === 'settled' || order.value.status === 'completed') return '已送达';
  if (order.value.status === 'inflight') return '飞行中';
  return '待确认';
});
const airspaceCopy = computed(() => {
  if (!order.value) return '待发单';
  const item = repo.airspace.where((entry) => entry.orderId === order.value!.id)[0];
  if (item?.status === 'approved') return '已批准';
  if (item?.status === 'rejected') return '需复核';
  if (order.value.status === 'confirmed') return '待申请';
  if (order.value.status === 'matching') return '待确认';
  return '处理中';
});
type StepState = 'done' | 'current' | 'todo';
const nextCopy = computed(() => {
  if (!order.value) return '当前没有进行中订单，可按常用航线快速发单；提交后会进入智能匹配与追踪。';
  const map: Partial<Record<string, string>> = {
    matching: '等待选择匹配方案，确认后飞手和机主端会同步进入任务。',
    confirmed: '下一步提交空域申请，审批通过后进入起飞前准备。',
    airspace: '等待空域审批结果，危险品会进入人工复核流程。',
    preparing: '空域已通过，请飞手完成安检后开始装货。',
    loading: '正在装货，完成后进入起飞执行。',
    inflight: '飞行中，请关注追踪页告警、电量和摆度。',
    unloading: '到达终点，确认卸货后可完成任务。',
    completed: '任务已完成，可生成结算与分账。',
    settled: '订单已结算，可提交评价并查看分账。',
    exception: '订单异常，请查看理赔或联系后台处理。',
  };
  return map[order.value.status] ?? '按页面主操作推进下一阶段。';
});
const homeSteps = computed(() => {
  const status = order.value?.status ?? 'created';
  const orderMap = ['created', 'matching', 'confirmed', 'airspace', 'preparing', 'loading', 'inflight', 'unloading', 'completed', 'settled'];
  const groups = [
    { title: '发单', states: ['created', 'matching'] },
    { title: '确认', states: ['confirmed', 'airspace'] },
    { title: '执行', states: ['preparing', 'loading', 'inflight', 'unloading'] },
    { title: '结算', states: ['completed', 'settled'] },
  ];
  const current = Math.max(0, orderMap.indexOf(status));
  return groups.map((step) => {
    const last = Math.max(...step.states.map((item) => orderMap.indexOf(item)));
    const first = Math.min(...step.states.map((item) => orderMap.indexOf(item)));
    const state: StepState = current > last ? 'done' : current >= first ? 'current' : 'todo';
    return {
      title: step.title,
      state,
      desc: step.title === '发单' ? '需求' : step.title === '确认' ? '运力' : step.title === '执行' ? '飞行' : '分账',
    };
  });
});
const activeStep = computed(() => Math.max(0, homeSteps.value.findIndex((step) => step.state === 'current')));

function goOrder() {
  uni.navigateTo({ url: '/pages-client/order/index' });
}

function goMatch() {
  orderStore.ensureOrder();
  uni.navigateTo({ url: '/pages-client/match/index' });
}

function goAuth() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function goCredit() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function goInsurance() {
  uni.navigateTo({ url: '/pages-client/insurance/index' });
}

function goTrack() {
  uni.navigateTo({ url: '/pages-client/track/index' });
}

function primaryAction() {
  if (!order.value) return goOrder();
  if (order.value.status === OrderStatus.Matching) return goMatch();
  if (order.value.status === OrderStatus.Settled) return uni.navigateTo({ url: '/pages-client/review/index' });
  return goTrack();
}

function secondaryAction() {
  if (!order.value) return goInsurance();
  return goOrder();
}

function handleQuick(key: string) {
  if (key === 'auth') goAuth();
  if (key === 'credit') goCredit();
  if (key === 'insurance') goInsurance();
}
</script>

<style lang="scss" scoped>
.mission-console {
  display: grid;
  gap: $sp-3;
}

.mission-map {
  position: relative;
  overflow: hidden;
  padding: $sp-4;
  border-radius: $r-lg;
  background:
    linear-gradient(90deg, $line 2rpx, transparent 2rpx),
    linear-gradient(0deg, $line 2rpx, transparent 2rpx),
    $bg-card;
  background-size: 56rpx 56rpx;
}

.command-surface {
  box-shadow: $shadow-command;
  border: 2rpx solid $info-line;
}

.mission-head,
.route-copy,
.command-actions,
.route-row,
.recent-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
}

.console-label,
.mission-title,
.order-title {
  display: block;
}

.console-label {
  color: $color-primary;
  font-size: $fs-cap;
  font-weight: $fw-semibold;
  line-height: 1.4;
}

.mission-title {
  margin-top: $sp-1;
  font-size: $fs-h3;
  font-weight: $fw-semibold;
  color: $ink-900;
  line-height: 1.35;
}

.order-notice {
  margin-top: $sp-3;
}

.route-lane {
  position: relative;
  height: 168rpx;
  margin-top: $sp-4;
}

.route-line {
  position: absolute;
  left: 12%;
  right: 12%;
  top: 54%;
  height: 8rpx;
  border-radius: $r-pill;
  background: $color-primary;
  transform: rotate(-10deg);
  transform-origin: left center;
}

.route-node,
.drone-dot {
  position: absolute;
  border-radius: $r-pill;
  box-shadow: $shadow-1;
}

.route-node {
  width: 32rpx;
  height: 32rpx;
}

.route-node.start {
  left: 10%;
  top: 50%;
  background: $success;
}

.route-node.end {
  right: 10%;
  top: 32%;
  background: $danger;
}

.drone-dot {
  left: 48%;
  top: 42%;
  width: 44rpx;
  height: 44rpx;
  background: $bg-card;
  border: 6rpx solid $color-primary;
}

.route-copy {
  color: $ink-700;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
}

.mission-metrics,
.risk-strip,
.budget-band {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
  margin-top: $sp-3;
}

.mission-metric,
.risk-chip {
  min-height: 92rpx;
  padding: $sp-2;
  border-radius: $r-md;
  background: $bg-sunken;
  box-sizing: border-box;
}

.metric-value,
.metric-label,
.risk-value,
.risk-label {
  display: block;
}

.metric-value,
.risk-value {
  @include tabular;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.25;
  font-weight: $fw-bold;
}

.metric-label,
.risk-label {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
}

.mission-panel,
.work-card {
  border: 2rpx solid $line;
  border-radius: $r-lg;
  background: $bg-card;
  box-shadow: $shadow-soft;
}

.mission-panel {
  padding: $sp-4;
}

.panel-title {
  display: block;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.risk-chip.success {
  background: $success-bg;
}

.risk-chip.warning {
  background: $warning-bg;
}

.risk-chip.info {
  background: $info-bg;
}

.mini-flow {
  margin-top: $sp-3;
}

.command-actions {
  margin-top: $sp-4;
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, .75fr);
  gap: $sp-2;
}

.workbench-grid {
  display: grid;
  gap: $sp-3;
}

.budget-band {
  grid-template-columns: 1fr 1fr;
}

.recent-list {
  display: grid;
  gap: $sp-3;
}

.recent-empty {
  padding: $sp-3;
  border-radius: $r-md;
  background: $bg-sunken;
}

@media screen and (min-width: 900px) {
  .mission-console,
  .workbench-grid {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, .8fr);
  }
}
</style>
