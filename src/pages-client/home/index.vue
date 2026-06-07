<template>
  <view class="page">
    <PageHeader title="业主指挥台" :desc="`${user.nickname} · 发单、匹配、追踪、结算一屏掌控`" :role="Role.Client" />

    <view class="metric-grid">
      <MetricCard label="信用分" :value="credit?.total ?? 0" :hint="credit ? credit.level + ' 级' : '待计算'" delta="实时" />
      <MetricCard label="在线运力" :value="availableCount" hint="5km 合规池" delta="可用" delta-tone="up" />
    </view>

    <ActionCard eyebrow="PRIMARY ACTION" title="发起吊运" desc="货物、地点、保险、预算一次提交，进入智能匹配。" cta="发单" @action="goOrder" />

    <view class="quick-actions section">
      <button class="secondary-button" @click="goAuth">认证</button>
      <button class="secondary-button" @click="goCredit">信用</button>
      <button class="secondary-button" @click="goInsurance">保险</button>
    </view>

    <view class="section">
      <SectionHeader title="进行中订单" desc="展示当前状态、下一步和预算，避免只看标签猜流程。" action="匹配" @action="goMatch" />
      <view v-if="order" class="card order-card">
        <view class="between">
          <text class="order-title">{{ order.cargo.remark || '吊运任务' }}</text>
          <StatusTag :status="order.status" />
        </view>
        <NoticeBar class="order-notice" :message="nextCopy" />
        <StepFlow :steps="steps" />
        <view class="between summary">
          <text class="muted">预算</text>
          <MoneyText :fen="order.budgetCent" size="body" bold />
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
import StepFlow from '@/components/StepFlow.vue';
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
const nextCopy = computed(() => {
  if (!order.value) return '';
  const map: Partial<Record<string, string>> = {
    matching: '等待选择匹配方案，确认后飞手和机主端会同步进入任务。',
    confirmed: '下一步提交空域申请，审批通过后进入起飞前准备。',
    airspace: '等待 Mock 空域审批结果，危险品会触发驳回演示。',
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
const steps = computed(() => {
  const events = order.value?.events ?? [];
  return ['发单', '匹配', '确认', '飞行', '结算'].map((title, index) => ({
    title,
    time: events[index]?.at?.slice(11, 16),
    state: events[index] ? 'done' as const : index === events.length ? 'current' as const : 'todo' as const,
  }));
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
  padding-top: $sp-3;
  border-top: 2rpx solid $line;
}

.order-notice {
  margin: $sp-3 0;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-2;
}
</style>
