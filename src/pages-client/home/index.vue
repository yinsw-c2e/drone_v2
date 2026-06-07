<template>
  <view class="page">
    <view class="top">
      <view>
        <text class="hello">业主指挥台</text>
        <text class="desc">{{ user.nickname }} · 真实订单流转</text>
      </view>
      <RoleBadge :role="Role.Client" />
    </view>

    <view class="metrics">
      <MetricCard label="信用分" :value="credit?.total ?? 0" :hint="credit ? credit.level + ' 级' : '待计算'" delta="实时" />
      <MetricCard label="在线运力" :value="availableCount" hint="5km 合规池" delta="可用" delta-tone="up" />
    </view>

    <button class="publish-card" @click="goOrder">
      <view>
        <text class="publish-title">发起吊运</text>
        <text class="publish-desc">货物、地点、保险、预算一次提交，进入智能匹配。</text>
      </view>
      <text class="publish-action">发单</text>
    </button>

    <view class="section">
      <view class="between">
        <text class="section-title">进行中订单</text>
        <button class="link" @click="goMatch">匹配</button>
      </view>
      <view v-if="order" class="card order-card">
        <view class="between">
          <text class="order-title">{{ order.cargo.remark || '吊运任务' }}</text>
          <StatusTag :status="order.status" />
        </view>
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
import EmptyState from '@/components/EmptyState.vue';
import MetricCard from '@/components/MetricCard.vue';
import MoneyText from '@/components/MoneyText.vue';
import RoleBadge from '@/components/RoleBadge.vue';
import StatusTag from '@/components/StatusTag.vue';
import StepFlow from '@/components/StepFlow.vue';
import { Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const orderStore = useOrderStore();
const user = computed(() => userStore.user);
const order = computed(() => orderStore.activeOrder);
const credit = computed(() => repo.credits.find(user.value.id));
const availableCount = computed(() => repo.capacity.where((c) => c.status === 'online').length);
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
</script>

<style lang="scss" scoped>
.top,
.metrics {
  display: grid;
  gap: $sp-3;
}

.top {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.metrics {
  grid-template-columns: 1fr 1fr;
  margin-top: $sp-4;
}

.hello {
  display: block;
  font-size: $fs-h1;
  line-height: 1.25;
  font-weight: $fw-bold;
  color: $ink-900;
}

.desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.publish-card {
  margin-top: $sp-4;
  width: 100%;
  padding: $sp-4;
  border-radius: $r-lg;
  background: $color-primary-weak;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.publish-title {
  display: block;
  font-size: $fs-h2;
  line-height: 1.3;
  color: $ink-900;
  font-weight: $fw-bold;
}

.publish-desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  line-height: 1.45;
  color: $ink-500;
}

.publish-action {
  min-width: 112rpx;
  min-height: 88rpx;
  border-radius: $r-md;
  color: $on-primary;
  background: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-body;
  font-weight: $fw-semibold;
}

.link {
  color: $color-primary;
  font-size: $fs-sm;
}

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
</style>
