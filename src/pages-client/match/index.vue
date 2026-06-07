<template>
  <view class="page match-page">
    <PageHeader :title="pageTitle" :desc="action.description" :role="Role.Client" compact>
      <template #aside>
        <StatusTag v-if="order" :status="order.status" />
      </template>
    </PageHeader>
    <NoticeBar v-if="!action.canConfirm" :tone="action.showCandidates ? 'warning' : 'info'" :message="action.description" />
    <RouteHero
      v-if="order"
      class="section"
      title="派单航线"
      :subtitle="action.showCandidates ? '系统按距离、信用、载荷、保额和预算综合排序。' : '当前订单阶段已经推进，匹配页仅提供去向引导。'"
      :from="order.from.address"
      :to="order.to.address"
      :status="heroStatus"
      :metrics="dispatchMetrics"
      compact
    />

    <ProSegmentedControl
      v-if="action.showCandidates"
      class="section"
      :model-value="orderStore.strategy"
      :options="strategies"
      @change="changeStrategy"
    />

    <view class="section">
      <view v-if="action.showCandidates && selected" class="match-summary">
        <view>
          <text class="summary-label">当前推荐</text>
          <text class="summary-title">{{ droneLabel(selected.droneId) }}</text>
        </view>
        <view class="summary-price">
          <MoneyText :fen="selected.quoteCent" bold />
          <text>含保险试算</text>
        </view>
      </view>
      <MatchCandidateCard
        v-for="candidate in visibleCandidates"
        :key="candidate.capacityId"
        :candidate="candidate"
        :pilot-name="pilotName(candidate.pilotId)"
        :drone-label="droneLabel(candidate.droneId)"
        :drone-meta="droneMeta(candidate.droneId)"
        :selected="selectedId === candidate.capacityId"
        @select="select"
      />
      <EmptyState
        v-if="action.showCandidates && !visibleCandidates.length"
        title="当前无可用运力"
        desc="当前没有在线合规运力，请等待机主投放或返回调整预算/时间"
        action="返回修改订单"
        @action="goOrder"
      />
      <EmptyState
        v-if="!action.showCandidates"
        title="不能重复确认方案"
        :desc="action.description"
        :action="action.primaryLabel"
        @action="runPrimaryAction"
      />
      <text v-if="message" class="message">{{ message }}</text>
    </view>

    <wd-card v-if="action.showCandidates && selected" class="section breakdown" title="费用明细">
      <view class="between">
        <MoneyText :fen="selected.quoteCent" bold />
      </view>
      <view class="line"><text>基础</text><MoneyText :fen="selected.priceBreakdown.baseCent" /></view>
      <view class="line"><text>里程</text><MoneyText :fen="selected.priceBreakdown.mileageCent" /></view>
      <view class="line"><text>时长</text><MoneyText :fen="selected.priceBreakdown.durationCent" /></view>
      <view class="line"><text>保险</text><MoneyText :fen="selected.priceBreakdown.insuranceCent" /></view>
    </wd-card>

    <BottomActionBar :primary="action.primaryLabel" :secondary="action.secondaryLabel" :loading="orderStore.loading" @secondary="runSecondaryAction" @primary="confirm" />
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
import ProSegmentedControl from '@/components/ProSegmentedControl.vue';
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
const order = computed(() => orderStore.activeOrder ?? orderStore.ensureOrder());
const candidates = computed(() => orderStore.candidates);
const selectedId = computed(() => orderStore.selectedCapacityId || candidates.value[0]?.capacityId || '');
const rawSelected = computed(() => candidates.value.find((c) => c.capacityId === selectedId.value));
const action = computed(() => matchConfirmAction(order.value?.status, candidates.value.length, Boolean(rawSelected.value)));
const visibleCandidates = computed(() => action.value.showCandidates ? candidates.value : []);
const selected = computed(() => action.value.showCandidates ? rawSelected.value : undefined);
const pageTitle = computed(() => action.value.showCandidates ? `为你匹配到 ${candidates.value.length} 个方案` : '订单已离开匹配阶段');
const heroStatus = computed(() => {
  if (!action.value.showCandidates) return '阶段已推进';
  return candidates.value.length ? '候选已生成' : '等待运力';
});
const dispatchMetrics = computed(() => [
  action.value.showCandidates
    ? { label: '预计接单', value: selected.value ? `约${selected.value.etaMin}分` : '--', hint: selected.value ? '推荐方案' : '待匹配', tone: selected.value ? 'info' as const : 'neutral' as const }
    : { label: '当前阶段', value: order.value ? statusCopy(order.value.status) : '--', hint: '已推进', tone: 'info' as const },
  action.value.showCandidates
    ? { label: '接近距离', value: selected.value ? `${selected.value.distanceKm}km` : '--', hint: '飞手到起点', tone: 'neutral' as const }
    : { label: '推荐动作', value: action.value.primaryLabel, hint: '下一步', tone: 'neutral' as const },
  action.value.showCandidates
    ? { label: '合规状态', value: selected.value ? '合规' : '待确认', hint: selected.value ? '保额/载荷通过' : '无候选', tone: selected.value ? 'success' as const : 'warning' as const }
    : { label: '确认方案', value: '已关闭', hint: '防重复', tone: 'warning' as const },
]);
const strategies = [
  { label: '最近', hint: '最快', value: DispatchStrategy.Nearest },
  { label: '利润', hint: '收益', value: DispatchStrategy.MaxProfit },
  { label: '全局', hint: '均衡', value: DispatchStrategy.GlobalOptimal },
  { label: '接力', hint: '多段', value: DispatchStrategy.Chain },
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

function changeStrategy(value: string) {
  orderStore.strategy = value as DispatchStrategy;
}

async function confirm() {
  if (!action.value.canConfirm) {
    runPrimaryAction();
    return;
  }
  try {
    message.value = '';
    if (selected.value) orderStore.chooseCandidate(selected.value);
    await orderStore.confirmSelected();
    uni.navigateTo({ url: '/pages-client/track/index' });
  } catch (e) {
    message.value = matchErrorMessage(e);
  }
}

function goOrder() {
  uni.navigateTo({ url: '/pages-client/order/index' });
}

function goTrack() {
  uni.navigateTo({ url: '/pages-client/track/index' });
}

function goReview() {
  uni.navigateTo({ url: '/pages-client/review/index' });
}

function runPrimaryAction() {
  if (action.value.primaryTarget === 'track') {
    goTrack();
    return;
  }
  if (action.value.primaryTarget === 'review') {
    goReview();
    return;
  }
  if (action.value.primaryTarget === 'order') {
    goOrder();
    return;
  }
  message.value = action.value.description;
}

function runSecondaryAction() {
  if (action.value.secondaryTarget === 'track') {
    goTrack();
    return;
  }
  if (action.value.secondaryTarget === 'review') {
    goReview();
    return;
  }
  if (action.value.secondaryTarget === 'order') {
    goOrder();
  }
}

function statusCopy(status: string) {
  const map: Record<string, string> = {
    created: '待发单',
    matching: '匹配中',
    confirmed: '已接单',
    airspace: '空域审批',
    preparing: '飞行准备',
    loading: '装货中',
    inflight: '运输中',
    unloading: '卸货中',
    completed: '已完成',
    settled: '已结算',
    cancelled: '已取消',
    exception: '异常处理',
  };
  return map[status] ?? '已推进';
}

function matchErrorMessage(e: unknown) {
  const raw = e instanceof Error ? e.message : '';
  if (/非法流转|confirmed|当前订单已进入/.test(raw)) return action.value.description || '当前订单已进入执行阶段，不能重复确认方案；请查看追踪或重新发单。';
  return raw || '确认下单失败，请重新选择方案或返回修改订单。';
}
</script>

<style lang="scss" scoped>
.match-page {
  padding-bottom: calc($sp-10 + 160rpx);
}

.breakdown {
  margin-bottom: $sp-4;
}

.match-summary {
  margin-bottom: $sp-3;
  padding: $sp-3;
  border-radius: $r-lg;
  background: $surface-command;
  border: 2rpx solid $info-line;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
  box-shadow: $shadow-soft;
}

.summary-label,
.summary-title,
.summary-price text {
  display: block;
}

.summary-label {
  color: $info-ink;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.summary-title {
  @include ellipsis(1);
  max-width: 390rpx;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.3;
  font-weight: $fw-bold;
}

.summary-price {
  flex: 0 0 auto;
  text-align: right;
}

.summary-price text {
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
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
