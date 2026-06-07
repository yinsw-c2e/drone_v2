<template>
  <view class="page match-page">
    <view class="between">
      <view>
        <text class="title">为你匹配到 {{ candidates.length }} 个方案</text>
        <text class="desc">过滤顺序：距离、载重、适航、保险、预约、预算。</text>
      </view>
      <StatusTag v-if="order" :status="order.status" />
    </view>

    <view class="segmented section">
      <button v-for="item in strategies" :key="item.value" :class="['seg', orderStore.strategy === item.value ? 'active' : '']" @click="orderStore.strategy = item.value">{{ item.label }}</button>
    </view>

    <view class="section">
      <MatchCandidateCard
        v-for="candidate in candidates"
        :key="candidate.capacityId"
        :candidate="candidate"
        :pilot-name="pilotName(candidate.pilotId)"
        :selected="selectedId === candidate.capacityId"
        @select="select"
      />
      <EmptyState v-if="!candidates.length" title="当前无可用运力" desc="可调高预算或等待机主投放运力" action="返回发单" @action="goOrder" />
    </view>

    <view v-if="selected" class="card section breakdown">
      <text class="section-title">费用明细</text>
      <view class="line"><text>基础</text><MoneyText :fen="selected.priceBreakdown.baseCent" /></view>
      <view class="line"><text>里程</text><MoneyText :fen="selected.priceBreakdown.mileageCent" /></view>
      <view class="line"><text>时长</text><MoneyText :fen="selected.priceBreakdown.durationCent" /></view>
      <view class="line"><text>保险</text><MoneyText :fen="selected.priceBreakdown.insuranceCent" /></view>
    </view>

    <BottomActionBar primary="确认下单" secondary="发单" :disabled="!selected" :loading="orderStore.loading" @secondary="goOrder" @primary="confirm" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import EmptyState from '@/components/EmptyState.vue';
import MatchCandidateCard from '@/components/MatchCandidateCard.vue';
import MoneyText from '@/components/MoneyText.vue';
import StatusTag from '@/components/StatusTag.vue';
import { DispatchStrategy } from '@/models';
import type { MatchCandidate } from '@/models';
import { useOrderStore } from '@/stores/order';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const order = computed(() => orderStore.ensureOrder());
const candidates = computed(() => orderStore.candidates);
const selectedId = computed(() => orderStore.selectedCapacityId || candidates.value[0]?.capacityId || '');
const selected = computed(() => candidates.value.find((c) => c.capacityId === selectedId.value));
const strategies = [
  { label: '最近', value: DispatchStrategy.Nearest },
  { label: '利润', value: DispatchStrategy.MaxProfit },
  { label: '全局', value: DispatchStrategy.GlobalOptimal },
  { label: '接力', value: DispatchStrategy.Chain },
];

function pilotName(id: string) {
  return repo.users.find(id)?.nickname ?? id;
}

function select(candidate: MatchCandidate) {
  orderStore.chooseCandidate(candidate);
}

async function confirm() {
  if (selected.value) orderStore.chooseCandidate(selected.value);
  await orderStore.confirmSelected();
  uni.navigateTo({ url: '/pages-client/track/index' });
}

function goOrder() {
  uni.navigateTo({ url: '/pages-client/order/index' });
}
</script>

<style lang="scss" scoped>
.match-page {
  padding-bottom: calc($sp-10 + 160rpx);
}

.title {
  display: block;
  font-size: $fs-h2;
  line-height: 1.3;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  color: $ink-500;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $sp-2;
}

.seg {
  min-height: 88rpx;
  border-radius: $r-sm;
  background: $bg-card;
  color: $ink-700;
  font-size: $fs-sm;
  box-shadow: $shadow-1;
}

.seg.active {
  color: $on-primary;
  background: $color-primary;
}

.breakdown {
  margin-bottom: $sp-4;
}

.line {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: $ink-700;
  font-size: $fs-sm;
}
</style>
