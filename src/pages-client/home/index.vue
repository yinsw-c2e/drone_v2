<template>
  <view class="page">
    <PageHeader title="今日吊运态势" :desc="`${user.nickname} · 发单、匹配、追踪、结算一屏掌控`" :role="Role.Client" />

    <view class="metric-grid">
      <MetricCard label="信用分" :value="credit?.total ?? 0" :hint="credit ? credit.level + ' 级' : '待计算'" delta="实时" />
      <MetricCard label="在线运力" :value="availableCount" hint="5km 合规池" delta="可用" delta-tone="up" />
    </view>

    <ActionCard eyebrow="核心动作" title="发起吊运" desc="货物、地点、保险、预算一次提交，进入智能匹配。" cta="发单" @action="goOrder" />

    <view class="quick-actions section">
      <button class="secondary-button" @click="goAuth">认证</button>
      <button class="secondary-button" @click="goCredit">信用</button>
      <button class="secondary-button" @click="goInsurance">保险</button>
    </view>

    <view class="section">
      <SectionHeader title="进行中订单" desc="快速查看当前阶段、责任方、费用和风险。" action="匹配" @action="goMatch" />
      <view v-if="order" class="card order-card">
        <view class="between">
          <text class="order-title">{{ order.cargo.remark || '吊运任务' }}</text>
          <StatusTag :status="order.status" />
        </view>
        <NoticeBar class="order-notice" :message="nextCopy" />
        <view class="ops-grid">
          <view>
            <text class="ops-label">预算</text>
            <MoneyText :fen="order.budgetCent" size="body" bold />
          </view>
          <view>
            <text class="ops-label">责任方</text>
            <text class="ops-value">{{ orderPilot }}</text>
          </view>
          <view>
            <text class="ops-label">预计到达</text>
            <text class="ops-value">{{ etaText }}</text>
          </view>
          <view>
            <text class="ops-label">空域</text>
            <text class="ops-value">{{ airspaceCopy }}</text>
          </view>
        </view>
        <view class="mini-flow">
          <view v-for="step in homeSteps" :key="step.title" :class="['mini-step', step.state]">
            <view class="mini-dot" />
            <text>{{ step.title }}</text>
          </view>
        </view>
        <view class="between summary">
          <text class="muted">{{ order.from.address }} → {{ order.to.address }}</text>
          <button class="link" @click="goTrack">追踪</button>
        </view>
      </view>
      <EmptyState v-else title="暂无订单" desc="发起一笔订单即可查看匹配与追踪" action="去发单" @action="goOrder" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ActionCard from '@/components/ActionCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import MetricCard from '@/components/MetricCard.vue';
import MoneyText from '@/components/MoneyText.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const orderStore = useOrderStore();
const user = computed(() => userStore.user.currentRole === Role.Client ? userStore.user : userStore.loginAs(Role.Client));
const order = computed(() => orderStore.activeOrder);
const credit = computed(() => repo.credits.find(user.value.id));
const availableCount = computed(() => repo.capacity.where((c) => c.status === 'online').length);
const orderPilot = computed(() => order.value?.pilotId ? repo.users.find(order.value.pilotId)?.nickname ?? '已指派飞手' : '待匹配');
const etaText = computed(() => {
  if (!order.value) return '--';
  const candidate = order.value.status === 'matching' && !order.value.capacityId ? orderStore.candidates[0] : undefined;
  if (candidate) return `约${candidate.etaMin}分钟`;
  if (order.value.status === 'settled' || order.value.status === 'completed') return '已送达';
  if (order.value.status === 'inflight') return '飞行中';
  return '待确认';
});
const airspaceCopy = computed(() => {
  if (!order.value) return '--';
  const item = repo.airspace.where((entry) => entry.orderId === order.value!.id)[0];
  if (item?.status === 'approved') return '已批准';
  if (item?.status === 'rejected') return '需复核';
  if (order.value.status === 'confirmed') return '待申请';
  if (order.value.status === 'matching') return '待确认';
  return '处理中';
});
const nextCopy = computed(() => {
  if (!order.value) return '';
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
    return {
      title: step.title,
      state: current > last ? 'done' : current >= first ? 'current' : 'todo',
    };
  });
});

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
</script>

<style lang="scss" scoped>
.order-card {
  margin-top: $sp-3;
}

.order-title {
  font-size: $fs-h3;
  font-weight: $fw-semibold;
  color: $ink-900;
}

.summary {
  margin-top: $sp-3;
  padding-top: $sp-3;
  border-top: 2rpx solid $line;
  gap: $sp-3;
}

.order-notice {
  margin: $sp-3 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-2;
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-2;
  margin: $sp-3 0;
}

.ops-grid > view {
  padding: $sp-3;
  border-radius: $r-md;
  background: $bg-sunken;
}

.ops-label,
.ops-value {
  display: block;
}

.ops-label {
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
}

.ops-value {
  margin-top: $sp-1;
  color: $ink-900;
  font-size: $fs-sm;
  line-height: 1.45;
  font-weight: $fw-semibold;
}

.mini-flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: $sp-2;
  margin-top: $sp-3;
}

.mini-step {
  display: flex;
  align-items: center;
  gap: $sp-1;
  min-height: 56rpx;
  color: $ink-500;
  font-size: $fs-cap;
}

.mini-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: $line;
}

.mini-step.done,
.mini-step.current {
  color: $color-primary;
  font-weight: $fw-semibold;
}

.mini-step.done .mini-dot,
.mini-step.current .mini-dot {
  background: $color-primary;
}
</style>
