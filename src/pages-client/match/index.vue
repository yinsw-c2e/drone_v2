<template>
  <view class="page match-page">
    <PageHeader :title="`为你匹配到 ${candidates.length} 个方案`" :desc="action.description" :role="Role.Client" compact>
      <template #aside>
        <StatusTag v-if="order" :status="order.status" />
      </template>
    </PageHeader>
    <NoticeBar v-if="!candidates.length" tone="warning" message="当前没有在线合规运力，请等待机主投放或返回调整预算/时间。" />
    <RouteHero
      v-if="order"
      class="section"
      title="派单航线"
      subtitle="系统按距离、信用、载荷、保额和预算综合排序。"
      :from="order.from.address"
      :to="order.to.address"
      :status="candidates.length ? '候选已生成' : '等待运力'"
      :eta="selected ? `约${selected.etaMin}分` : '--'"
      :distance="selected ? `${selected.distanceKm}km` : '5km'"
      :battery="selected ? '合规' : '--'"
      compact
    />

    <view class="segmented section">
      <button v-for="item in strategies" :key="item.value" :class="['seg', orderStore.strategy === item.value ? 'active' : '']" @click="orderStore.strategy = item.value">{{ item.label }}</button>
    </view>

    <view class="section">
      <MatchCandidateCard
        v-for="candidate in candidates"
        :key="candidate.capacityId"
        :candidate="candidate"
        :pilot-name="pilotName(candidate.pilotId)"
        :drone-label="droneLabel(candidate.droneId)"
        :drone-meta="droneMeta(candidate.droneId)"
        :selected="selectedId === candidate.capacityId"
        @select="select"
      />
      <EmptyState v-if="!candidates.length" title="当前无可用运力" desc="当前没有在线合规运力，请等待机主投放或返回调整预算/时间" action="返回修改订单" @action="goOrder" />
      <text v-if="message" class="message">{{ message }}</text>
    </view>

    <view v-if="selected" class="card section breakdown">
      <view class="between">
        <text class="section-title">费用明细</text>
        <MoneyText :fen="selected.quoteCent" bold />
      </view>
      <view class="line"><text>基础</text><MoneyText :fen="selected.priceBreakdown.baseCent" /></view>
      <view class="line"><text>里程</text><MoneyText :fen="selected.priceBreakdown.mileageCent" /></view>
      <view class="line"><text>时长</text><MoneyText :fen="selected.priceBreakdown.durationCent" /></view>
      <view class="line"><text>保险</text><MoneyText :fen="selected.priceBreakdown.insuranceCent" /></view>
    </view>

    <BottomActionBar :primary="action.primaryLabel" :secondary="action.secondaryLabel" :loading="orderStore.loading" @secondary="goOrder" @primary="confirm" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import EmptyState from '@/components/EmptyState.vue';
import MatchCandidateCard from '@/components/MatchCandidateCard.vue';
import MoneyText from '@/components/MoneyText.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteHero from '@/components/RouteHero.vue';
import StatusTag from '@/components/StatusTag.vue';
import { DispatchStrategy, Role } from '@/models';
import type { MatchCandidate } from '@/models';
import { matchConfirmAction } from '@/services/action-plans';
import { droneDisplayName } from '@/services/display-labels';
import { useOrderStore } from '@/stores/order';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const message = ref('');
const order = computed(() => orderStore.ensureOrder());
const candidates = computed(() => orderStore.candidates);
const selectedId = computed(() => orderStore.selectedCapacityId || candidates.value[0]?.capacityId || '');
const selected = computed(() => candidates.value.find((c) => c.capacityId === selectedId.value));
const action = computed(() => matchConfirmAction(candidates.value.length, Boolean(selected.value)));
const strategies = [
  { label: '最近', value: DispatchStrategy.Nearest },
  { label: '利润', value: DispatchStrategy.MaxProfit },
  { label: '全局', value: DispatchStrategy.GlobalOptimal },
  { label: '接力', value: DispatchStrategy.Chain },
];

function pilotName(id: string) {
  return repo.users.find(id)?.nickname ?? id;
}

function droneLabel(id: string) {
  const drone = repo.drones.find(id);
  return drone ? droneDisplayName(drone) : '合规运力';
}

function droneMeta(id: string) {
  const drone = repo.drones.find(id);
  if (!drone) return '';
  return `载荷${drone.maxPayloadKg}kg · 三者险${Math.round(drone.insured.thirdPartyAmount / 10000)}万`;
}

function select(candidate: MatchCandidate) {
  message.value = '';
  orderStore.chooseCandidate(candidate);
}

async function confirm() {
  if (!action.value.canConfirm) {
    message.value = action.value.description;
    return;
  }
  try {
    message.value = '';
    if (selected.value) orderStore.chooseCandidate(selected.value);
    await orderStore.confirmSelected();
    uni.navigateTo({ url: '/pages-client/track/index' });
  } catch (e) {
    message.value = e instanceof Error ? e.message : '确认下单失败，请重新选择方案或返回修改订单。';
  }
}

function goOrder() {
  uni.navigateTo({ url: '/pages-client/order/index' });
}
</script>

<style lang="scss" scoped>
.match-page {
  padding-bottom: calc($sp-10 + 160rpx);
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

.message {
  display: block;
  margin-top: $sp-3;
  padding: $sp-2;
  border-radius: $r-sm;
  background: $warning-bg;
  color: $warning-ink;
  font-size: $fs-sm;
  line-height: 1.45;
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
