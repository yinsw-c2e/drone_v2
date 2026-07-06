<template>
  <view class="match-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="top-left">
        <view class="nav-icon" hover-class="tap-press" @click="goOrder">
          <StitchIcon name="arrow_back" size="58rpx" />
        </view>
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="system-state">
        <text class="state-label">{{ copy.sysStatus }}</text>
        <view class="state-row">
          <view class="online-dot" />
          <text>{{ copy.online }}</text>
        </view>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-icon" hover-class="tap-press" @click="showToast(copy.signalReady)">
          <StitchIcon name="signal_cellular_alt" size="48rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="hero">
        <view class="hero-title">
          <view class="radar-icon">
            <StitchIcon name="radar" size="43rpx" />
          </view>
          <text>{{ copy.title }}</text>
        </view>
        <view class="hero-desc">
          <text>{{ copy.matchedPrefix }}</text>
          <text class="match-count">{{ candidates.length }}</text>
          <text>{{ copy.matchedSuffix }}</text>
        </view>
      </view>

      <view class="strategy-row">
        <view
          v-for="item in strategies"
          :key="item.value"
          :class="['strategy-pill', orderStore.strategy === item.value ? 'active' : '']"
          hover-class="pill-press"
          @click="changeStrategy(item.value)"
        >
          <text @click.stop="changeStrategy(item.value)">{{ item.label }}</text>
        </view>
      </view>

      <view class="strategy-note">
        <StitchIcon name="info" size="32rpx" />
        <view class="strategy-note-copy">
          <text class="strategy-note-title">{{ activeStrategyLabel }}</text>
          <text>{{ activeStrategyDesc }}</text>
          <text v-if="selected" class="strategy-note-meta">{{ selectedStrategyMeta }}</text>
        </view>
      </view>

      <view v-if="candidates.length > 1" class="candidate-row">
        <view
          v-for="item in candidates"
          :key="item.capacityId"
          :class="['candidate-chip', selected?.capacityId === item.capacityId ? 'active' : '']"
          hover-class="pill-press"
          @click="orderStore.chooseCandidate(item)"
        >
          <text class="chip-title">{{ candidateTitle(item) }}</text>
          <text class="chip-sub">{{ candidateSubtitle(item) }}</text>
          <text class="chip-quote">¥{{ formatYuan(item.quoteCent) }}</text>
        </view>
      </view>

      <view v-if="selected" class="solution-card" hover-class="card-press" @click="selectRecommended">
        <view class="solution-head">
          <view class="pilot-main">
            <view class="avatar-wrap">
              <image class="pilot-avatar" src="/static/stitch/match-pilot-avatar.png" mode="aspectFill" />
              <view class="pilot-online" />
            </view>
            <view class="pilot-copy">
              <text class="pilot-name">{{ pilotTitle }}</text>
              <view class="rating-row">
                <view class="stars">
                  <StitchIcon v-for="(star, index) in starIcons" :key="index" :name="star" size="30rpx" fill />
                </view>
                <text>{{ ratingText }}</text>
              </view>
            </view>
          </view>
          <view class="quote-block">
            <text>{{ copy.estimatedQuote }}</text>
            <text class="quote">¥ {{ quoteText }}</text>
          </view>
        </view>

        <view class="solution-body">
          <view class="info-panel equipment">
            <view class="panel-label">
              <StitchIcon name="flight" size="37rpx" />
              <text>{{ copy.deviceModel }}</text>
            </view>
            <text class="device-name">{{ deviceName }}</text>
            <view class="chip-row">
              <text>{{ copy.payloadRemain }}{{ payloadRemainText }}</text>
              <text>{{ copy.distanceLabel }}{{ distanceText }}</text>
            </view>
          </view>

          <view class="info-panel timeline">
            <view class="cyan-rail" />
            <view class="panel-label">
              <StitchIcon name="schedule" size="37rpx" />
              <text>{{ copy.estimatedTime }}</text>
            </view>
            <view class="time-flow">
              <view class="time-copy">
                <text>{{ copy.arriveOrigin }}</text>
                <text class="time-value">{{ arriveText }}</text>
              </view>
              <view class="flight-line">
                <view class="line-base">
                  <view class="line-active" />
                </view>
                <StitchIcon name="flight_takeoff" size="42rpx" />
              </view>
              <view class="time-copy right">
                <text>{{ copy.deliverDest }}</text>
                <text class="time-value">{{ deliverText }}</text>
              </view>
            </view>
          </view>

          <view class="compliance">
            <StitchIcon name="verified_user" size="48rpx" />
            <text>{{ copy.compliance }}</text>
          </view>

          <view class="reason">
            <StitchIcon name="lightbulb" size="48rpx" />
            <view>
              <text class="reason-label">{{ copy.reasonLabel }}</text>
              <text class="reason-copy">{{ reasonText }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="solution-card empty-card">
        <view class="reason">
          <StitchIcon name="lightbulb" size="48rpx" />
          <view>
            <text class="reason-label">{{ copy.noCandidateTitle }}</text>
            <text class="reason-copy">{{ copy.noCapacity }}</text>
          </view>
        </view>
      </view>

      <view v-if="selected" class="cost-card">
        <view class="cost-head" hover-class="item-press" @click="costOpen = !costOpen">
          <view class="cost-title">
            <StitchIcon name="receipt_long" size="58rpx" />
            <text>{{ copy.costDetail }}</text>
          </view>
          <StitchIcon :class="['chevron', costOpen ? 'open' : '']" name="expand_more" size="58rpx" />
        </view>
        <view v-if="costOpen" class="cost-detail">
          <view v-for="row in costRows" :key="row.label" class="cost-line">
            <text>{{ row.label }}</text>
            <text>{{ row.value }}</text>
          </view>
          <view class="cost-divider" />
          <view class="cost-total">
            <text>{{ copy.total }}</text>
            <text>¥ {{ quoteText }}</text>
          </view>
        </view>
      </view>

      <text v-if="message" class="message">{{ message }}</text>
    </view>

    <view class="action-bar">
      <view class="rematch-button" hover-class="tap-press" @click="retryMatch">
        <text>{{ copy.rematch }}</text>
      </view>
      <view class="confirm-button" :class="{ loading: orderStore.loading }" hover-class="tap-press" @click="confirm">
        <text>{{ orderStore.loading ? copy.confirming : primaryActionLabel }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { DispatchStrategy, OrderStatus } from '@/models';
import type { MatchCandidate } from '@/models';
import { matchConfirmAction } from '@/services/action-plans';
import { droneDisplayName } from '@/services/display-labels';
import { PRICE_CONFIG } from '@/stores/config-data';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { distanceKm } from '@/utils/geo';
import { etaMinutes } from '@/utils/price';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const localeStore = useLocaleStore();
const message = ref('');
const costOpen = ref(false);
const MATCH_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    sysStatus: 'SYS_STATUS',
    online: 'ONLINE',
    signalReady: 'Signal ready',
    title: 'Smart Match Plan',
    matchedPrefix: 'Matched ',
    matchedSuffix: ' best plan for you',
    nearest: 'Nearest',
    maxProfit: 'Max Profit',
    globalOptimal: 'Global Optimal',
    chain: 'Fastest ETA',
    currentPick: 'Current pick',
    nearestDesc: 'Prioritizes nearby capacity while still considering credit and rating.',
    maxProfitDesc: 'Sorts by highest compliant quote. Useful for capacity-side yield comparison.',
    globalOptimalDesc: 'Balances distance, credit score, rating and quote as the default recommendation.',
    chainDesc: 'Prioritizes faster pickup and a steadier delivery window for urgent missions.',
    creditSuffix: 'Credit',
    estimatedQuote: 'Estimated Quote',
    deviceModel: 'Device Model',
    payloadRemain: 'Payload left: ',
    distanceLabel: 'Distance: ',
    estimatedTime: 'Estimated Time',
    arriveOrigin: 'Arrive Pickup',
    deliverDest: 'Deliver Destination',
    compliance: 'Compliance: full insurance | approved route | dual-certified pilot',
    reasonLabel: 'Recommendation',
    noCandidateTitle: 'No plan available',
    costDetail: 'Cost Detail',
    total: 'Total',
    baseFlight: 'Base flight fee',
    mileageFee: 'Mileage fee',
    durationFee: 'Duration fee',
    weightFee: 'Payload fee',
    difficultyFactor: 'Difficulty factor',
    insuranceFee: 'Platform insurance fee',
    rematch: 'Rematch',
    confirmOrder: 'Confirm Order',
    confirming: 'Confirming',
    rematched: 'Rematched to the global optimal plan',
    arriveEtaShort: 'Pickup ETA',
    noCapacity: 'No compliant online capacity. Please rematch.',
    progressed: 'Current order has advanced. View tracking or launch a new order.',
    confirmFailed: 'Order confirmation failed. Select another plan or return to edit the order.',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    sysStatus: '系统状态',
    online: '在线',
    signalReady: '信号正常',
    title: '智能匹配方案',
    matchedPrefix: '为您匹配到 ',
    matchedSuffix: ' 个最优方案',
    nearest: '最近距离',
    maxProfit: '最高利润',
    globalOptimal: '全局最优',
    chain: '时效优先',
    currentPick: '当前首选',
    nearestDesc: '优先附近运力，同时保留信用和评分权重。',
    maxProfitDesc: '按合规报价从高到低排序，用于观察运力侧收益方案。',
    globalOptimalDesc: '综合距离、信用、评分与报价，是默认推荐口径。',
    chainDesc: '优先到场更快、送达更稳的运力，适合对时效更敏感的任务。',
    creditSuffix: '信用分',
    estimatedQuote: '预估报价',
    deviceModel: '设备型号',
    payloadRemain: '载重剩余: ',
    distanceLabel: '距离: ',
    estimatedTime: '预估时间',
    arriveOrigin: '预计到场',
    deliverDest: '预计送达',
    compliance: '合规保障：全额保险覆盖 | 航线已审批 | 驾驶员持双证',
    reasonLabel: '推荐理由',
    noCandidateTitle: '暂无可选方案',
    costDetail: '费用明细',
    total: '总计',
    baseFlight: '基础运费',
    mileageFee: '里程费',
    durationFee: '时长费',
    weightFee: '载重费',
    difficultyFactor: '难度系数',
    insuranceFee: '保费',
    rematch: '重新匹配',
    confirmOrder: '确认下单',
    confirming: '确认中',
    rematched: '已重新匹配到全局最优方案',
    arriveEtaShort: '到场ETA',
    noCapacity: '当前没有在线合规运力，请重新匹配。',
    progressed: '当前订单阶段已推进，请查看追踪或重新发单。',
    confirmFailed: '确认下单失败，请重新选择方案或返回修改订单。',
    languageToast: '已切换为中文',
  },
} as const;
const copy = computed(() => MATCH_COPY[localeStore.locale]);

orderStore.strategy = DispatchStrategy.GlobalOptimal;

const activeOrder = computed(() => orderStore.activeOrder);
const candidates = computed(() => activeOrder.value?.status === OrderStatus.Matching ? orderStore.candidates : []);
const selected = computed(() => candidates.value.find((item) => item.capacityId === orderStore.selectedCapacityId) ?? candidates.value[0]);
const action = computed(() => matchConfirmAction(activeOrder.value?.status, candidates.value.length, Boolean(selected.value)));
const primaryActionLabel = computed(() => action.value.primaryLabel || copy.value.confirmOrder);

const strategies = computed(() => [
  { label: copy.value.nearest, value: DispatchStrategy.Nearest },
  { label: copy.value.maxProfit, value: DispatchStrategy.MaxProfit },
  { label: copy.value.globalOptimal, value: DispatchStrategy.GlobalOptimal },
  { label: copy.value.chain, value: DispatchStrategy.Chain },
]);
const strategyDescriptions = computed<Record<DispatchStrategy, string>>(() => ({
  [DispatchStrategy.Nearest]: copy.value.nearestDesc,
  [DispatchStrategy.MaxProfit]: copy.value.maxProfitDesc,
  [DispatchStrategy.GlobalOptimal]: copy.value.globalOptimalDesc,
  [DispatchStrategy.Chain]: copy.value.chainDesc,
}));
const activeStrategyLabel = computed(() => strategies.value.find((item) => item.value === orderStore.strategy)?.label ?? copy.value.globalOptimal);
const activeStrategyDesc = computed(() => strategyDescriptions.value[orderStore.strategy]);

const selectedDrone = computed(() => selected.value ? repo.drones.find(selected.value.droneId) : undefined);
const selectedPilot = computed(() => selected.value ? repo.users.find(selected.value.pilotId) : undefined);
const pilotTitle = computed(() => selected.value ? `${selectedPilot.value?.nickname ?? selected.value.pilotId} (ID: ${selected.value.pilotId.toUpperCase()})` : '—');
const avgStar = computed(() => selected.value ? (repo.pilots.find(selected.value.pilotId)?.stats.avgStar ?? 4.5) : 0);
const starIcons = computed(() => {
  const full = Math.floor(avgStar.value);
  const icons = Array.from({ length: full }, () => 'star');
  if (avgStar.value - full >= 0.25) icons.push('star_half');
  return icons.slice(0, 5);
});
const ratingText = computed(() => selected.value ? `${avgStar.value.toFixed(1)} · ${copy.value.creditSuffix} ${selected.value.creditScore}` : '');
const quoteText = computed(() => selected.value ? formatMoney(selected.value.quoteCent) : '0.00');
const deviceName = computed(() => {
  const drone = selectedDrone.value;
  if (!drone) return '—';
  return `${droneDisplayName(drone)} (${drone.sn})`;
});
const payloadRemainText = computed(() => {
  const drone = selectedDrone.value;
  const order = orderStore.activeOrder;
  if (!drone) return '—';
  return `${Math.max(0, drone.maxPayloadKg - (order?.cargo.weightKg ?? 0)).toFixed(0)}kg`;
});
const distanceText = computed(() => selected.value ? `${selected.value.distanceKm.toFixed(1)}km` : '—');
const pickupEtaMin = computed(() => selected.value?.etaMin ?? 0);
const routeDistanceKm = computed(() => {
  const order = activeOrder.value;
  if (!order) return 0;
  return order.distanceKm ?? distanceKm(order.from, order.to);
});
const liftDurationMin = computed(() => Math.max(1, etaMinutes(routeDistanceKm.value) - PRICE_CONFIG.prepMin));
const deliveryEtaMin = computed(() => selected.value ? pickupEtaMin.value + liftDurationMin.value : 0);
const arriveText = computed(() => selected.value ? `${formatClock(pickupEtaMin.value)} (${pickupEtaMin.value}m)` : '—');
const deliverText = computed(() => selected.value ? `${formatClock(deliveryEtaMin.value)} (${deliveryEtaMin.value}m)` : '—');
const reasonText = computed(() => selected.value?.reasons.join('；') || '—');
const selectedStrategyMeta = computed(() => {
  if (!selected.value) return '';
  return `${copy.value.currentPick}: ${candidateTitle(selected.value)} · ${copy.value.arriveEtaShort} ${pickupEtaMin.value}m · ${selected.value.distanceKm.toFixed(1)}km · ${copy.value.creditSuffix} ${selected.value.creditScore}`;
});

const costRows = computed(() => {
  const breakdown = selected.value?.priceBreakdown;
  if (!breakdown) return [];
  const rows: Array<{ label: string; value: string }> = [
    { label: copy.value.baseFlight, value: `¥ ${formatMoney(breakdown.baseCent)}` },
    { label: copy.value.mileageFee, value: `¥ ${formatMoney(breakdown.mileageCent)}` },
    { label: copy.value.durationFee, value: `¥ ${formatMoney(breakdown.durationCent)}` },
    { label: copy.value.weightFee, value: `¥ ${formatMoney(breakdown.weightCent)}` },
    { label: copy.value.difficultyFactor, value: `× ${breakdown.difficultyFactor.toFixed(2)}` },
  ];
  if (breakdown.insuranceCent > 0) rows.push({ label: copy.value.insuranceFee, value: `¥ ${formatMoney(breakdown.insuranceCent)}` });
  return rows;
});

function formatMoney(amountCent: number) {
  return (amountCent / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatYuan(amountCent: number) {
  return Math.round(amountCent / 100).toLocaleString('en-US');
}

function formatClock(offsetMin: number) {
  const date = new Date(Date.now() + offsetMin * 60 * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function candidateName(candidate: MatchCandidate) {
  return repo.users.find(candidate.pilotId)?.nickname ?? candidate.pilotId;
}

function candidateTitle(candidate: MatchCandidate) {
  const drone = repo.drones.find(candidate.droneId);
  if (!drone) return candidateName(candidate);
  return `${droneDisplayName(drone)} ${drone.sn}`;
}

function candidateSubtitle(candidate: MatchCandidate) {
  return `${candidateName(candidate)} · ${candidate.distanceKm.toFixed(1)}km`;
}

function changeStrategy(value: DispatchStrategy) {
  orderStore.strategy = value;
  if (candidates.value[0]) {
    orderStore.chooseCandidate(candidates.value[0]);
  }
  message.value = `${activeStrategyLabel.value}: ${activeStrategyDesc.value}`;
}

function selectRecommended() {
  if (selected.value) {
    orderStore.chooseCandidate(selected.value);
  }
}

function retryMatch() {
  if (activeOrder.value?.status !== OrderStatus.Matching) {
    message.value = action.value.description;
    return;
  }
  orderStore.strategy = DispatchStrategy.GlobalOptimal;
  if (candidates.value[0]) {
    orderStore.chooseCandidate(candidates.value[0]);
    message.value = copy.value.rematched;
    return;
  }
  message.value = action.value.description || copy.value.noCapacity;
}

function ensureConfirmableCandidate(): MatchCandidate | undefined {
  if (activeOrder.value?.status !== OrderStatus.Matching || !selected.value) {
    message.value = action.value.description;
    return undefined;
  }
  const candidate = selected.value ?? candidates.value[0];
  if (candidate) {
    orderStore.chooseCandidate(candidate);
  }
  return candidate;
}

async function confirm() {
  if (orderStore.loading) return;
  try {
    message.value = '';
    if (action.value.primaryTarget === 'order') {
      goOrder();
      return;
    }
    if (action.value.primaryTarget === 'track') {
      uni.navigateTo({ url: '/pages-client/track/index' });
      return;
    }
    if (action.value.primaryTarget === 'review') {
      uni.navigateTo({ url: '/pages-client/review/index' });
      return;
    }
    const candidate = ensureConfirmableCandidate();
    if (!candidate) {
      message.value = action.value.description || copy.value.noCapacity;
      return;
    }
    await orderStore.confirmSelected();
    uni.navigateTo({ url: '/pages-client/track/index' });
  } catch (e) {
    message.value = matchErrorMessage(e);
  }
}

function goOrder() {
  uni.navigateTo({ url: '/pages-client/order/index' });
}

function matchErrorMessage(e: unknown) {
  const raw = e instanceof Error ? e.message : '';
  if (/非法流转|confirmed|当前订单已进入/.test(raw)) return copy.value.progressed;
  return raw || copy.value.confirmFailed;
}

function showToast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  showToast(copy.value.languageToast);
}
</script>

<style lang="scss" scoped>
.match-page {
  min-height: 100vh;
  color: #dfe2f0;
  background-color: #0b0e14;
  background-image:
    linear-gradient(0deg, rgba(58, 73, 75, .18) 2rpx, transparent 2rpx),
    linear-gradient(90deg, rgba(58, 73, 75, .18) 2rpx, transparent 2rpx);
  background-size: 80rpx 80rpx;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 184rpx;
  box-sizing: border-box;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 126rpx;
  padding: 0 32rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: 18rpx;
  box-sizing: border-box;
}

.top-left,
.state-row,
.top-actions,
.hero-title,
.strategy-row,
.solution-head,
.pilot-main,
.rating-row,
.quote-block,
.panel-label,
.chip-row,
.time-flow,
.compliance,
.reason,
.cost-head,
.cost-title,
.action-bar,
.rematch-button,
.confirm-button {
  display: flex;
  align-items: center;
}

.top-left {
  min-width: 0;
  gap: 38rpx;
}

.nav-icon,
.signal-icon {
  width: 64rpx;
  height: 64rpx;
  color: #b9cacb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 64rpx;
}

.top-actions {
  justify-content: flex-end;
  gap: 10rpx;
  min-width: 0;
}

.language-switch {
  min-width: 56rpx;
  height: 52rpx;
  padding: 0 12rpx;
  border: 2rpx solid #3a494b;
  border-radius: 8rpx;
  background: rgba(49, 53, 64, .72);
  color: #00f2ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 18rpx;
  line-height: 40rpx;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.brand {
  max-width: 190rpx;
  color: #00f2ff;
  font-size: 45rpx;
  line-height: 56rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
  @include ellipsis(1);
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .language-switch,
.zh-copy .system-state,
.zh-copy .hero-title,
.zh-copy .strategy-pill text,
.zh-copy .rating-row,
.zh-copy .device-name,
.zh-copy .chip-row text,
.zh-copy .time-value,
.zh-copy .quote,
.zh-copy .action-bar {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .state-label,
.zh-copy .state-row {
  letter-spacing: 0;
}

.system-state {
  text-align: right;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.state-label {
  display: block;
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 34rpx;
  letter-spacing: 4rpx;
}

.state-row {
  justify-content: flex-end;
  gap: 14rpx;
  color: #10b981;
  font-size: 34rpx;
  line-height: 42rpx;
  letter-spacing: 4rpx;
}

.online-dot {
  width: 17rpx;
  height: 17rpx;
  border-radius: 50%;
  background: #10b981;
}

.content {
  padding: 162rpx 32rpx 0;
}

.hero {
  min-height: 112rpx;
}

.hero-title {
  gap: 18rpx;
  color: #e1fdff;
  font-size: 34rpx;
  line-height: 40rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
}

.radar-icon {
  width: 45rpx;
  height: 45rpx;
  border-radius: 50%;
  color: #00f2ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-desc {
  display: block;
  margin-top: 19rpx;
  color: #b9cacb;
  font-size: 29rpx;
  line-height: 42rpx;
}

.hero-desc .match-count {
  color: #00f2ff;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.strategy-row {
  gap: 16rpx;
  margin-top: 20rpx;
  overflow-x: auto;
  padding-bottom: 10rpx;
}

.strategy-pill {
  min-width: 164rpx;
  height: 68rpx;
  padding: 0 28rpx;
  border-radius: 34rpx;
  border: 2rpx solid #3a494b;
  background: #313540;
  color: #b9cacb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-sizing: border-box;
}

.strategy-pill text {
  font-size: 25rpx;
  line-height: 34rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.strategy-pill.active {
  border-color: #00f2ff;
  background: rgba(0, 242, 255, .10);
  color: #00f2ff;
}

.strategy-note {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-top: 18rpx;
  padding: 18rpx 20rpx;
  border: 2rpx solid rgba(58, 73, 75, .78);
  background: rgba(20, 24, 34, .82);
  color: #b9cacb;
  box-sizing: border-box;
}

.strategy-note :deep(.stitch-icon) {
  flex: 0 0 auto;
  color: #00f2ff;
}

.strategy-note-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  font-size: 22rpx;
  line-height: 32rpx;
}

.strategy-note-title {
  color: #e1fdff;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 700;
}

.strategy-note-meta {
  color: #ffe173;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.candidate-row {
  display: flex;
  gap: 20rpx;
  margin-top: 36rpx;
  overflow-x: auto;
}

.candidate-chip {
  width: 300rpx;
  min-width: 300rpx;
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  border: 2rpx solid #3a494b;
  background: #1b1f2a;
  color: #b9cacb;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex: 0 0 auto;
  box-sizing: border-box;
  font-size: 23rpx;
}

.candidate-chip .chip-title,
.candidate-chip .chip-sub,
.candidate-chip .chip-quote {
  display: block;
  max-width: 100%;
  @include ellipsis(1);
}

.candidate-chip .chip-title {
  color: #e1fdff;
  font-weight: 800;
}

.candidate-chip .chip-sub {
  color: #849495;
  font-size: 21rpx;
  line-height: 30rpx;
}

.candidate-chip .chip-quote {
  color: #ffe173;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.candidate-chip.active {
  border-color: #00f2ff;
  background: rgba(0, 242, 255, .10);
  color: #00f2ff;
}

.solution-card {
  overflow: hidden;
  margin-top: 56rpx;
  border-radius: 16rpx;
  border: 2rpx solid rgba(58, 73, 75, .92);
  background: #141822;
}

.solution-card.empty-card {
  padding: 32rpx;
}

.solution-head {
  min-height: 156rpx;
  padding: 26rpx 32rpx;
  border-bottom: 2rpx solid rgba(58, 73, 75, .75);
  background: #1b1f2a;
  justify-content: space-between;
  gap: 20rpx;
  box-sizing: border-box;
}

.pilot-main {
  min-width: 0;
  gap: 24rpx;
}

.avatar-wrap {
  position: relative;
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  border: 2rpx solid #849495;
  overflow: hidden;
  flex: 0 0 78rpx;
  background: #0b0e14;
}

.pilot-avatar {
  width: 100%;
  height: 100%;
}

.pilot-online {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  border: 4rpx solid #1b1f2a;
  background: #10b981;
}

.pilot-copy {
  min-width: 0;
}

.pilot-name {
  display: block;
  color: #e1fdff;
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: 700;
  @include ellipsis(1);
}

.rating-row {
  gap: 12rpx;
  color: #b9cacb;
  font-size: 18rpx;
  line-height: 28rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.stars {
  display: flex;
  align-items: center;
  color: #fed83a;
}

.quote-block {
  align-items: flex-end;
  flex-direction: column;
  flex: 0 0 auto;
}

.quote-block > text:first-child {
  color: #b9cacb;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 700;
}

.quote {
  color: #10b981;
  font-size: 40rpx;
  line-height: 52rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.solution-body {
  padding: 34rpx 34rpx 4rpx;
}

.info-panel {
  position: relative;
  overflow: hidden;
  border-radius: 8rpx;
  border: 2rpx solid rgba(58, 73, 75, .65);
  background: rgba(11, 14, 20, .72);
  box-sizing: border-box;
}

.equipment {
  min-height: 174rpx;
  padding: 22rpx 24rpx;
}

.panel-label {
  gap: 16rpx;
  color: #b9cacb;
  font-size: 26rpx;
  line-height: 34rpx;
  font-weight: 700;
}

.device-name {
  display: block;
  margin-top: 14rpx;
  color: #e1fdff;
  font-size: 30rpx;
  line-height: 42rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  @include ellipsis(1);
}

.chip-row {
  gap: 16rpx;
  margin-top: 19rpx;
}

.chip-row text {
  height: 39rpx;
  padding: 0 16rpx;
  border-radius: 4rpx;
  background: #313540;
  color: #b9cacb;
  display: flex;
  align-items: center;
  font-size: 24rpx;
  line-height: 32rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.timeline {
  min-height: 164rpx;
  margin-top: 34rpx;
  padding: 22rpx 24rpx 20rpx;
}

.cyan-rail {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  background: #00f2ff;
}

.time-flow {
  margin-top: 17rpx;
  justify-content: space-between;
  gap: 14rpx;
}

.time-copy {
  flex: 0 0 204rpx;
}

.time-copy > text:first-child {
  display: block;
  color: #b9cacb;
  font-size: 25rpx;
  line-height: 35rpx;
}

.time-value {
  display: block;
  margin-top: 4rpx;
  color: #e1fdff;
  font-size: 27rpx;
  line-height: 36rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.time-copy.right {
  text-align: right;
}

.flight-line {
  position: relative;
  flex: 1;
  min-width: 92rpx;
  height: 44rpx;
  color: #00f2ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.line-base {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 4rpx;
  background: #3a494b;
  transform: translateY(-50%);
}

.line-active {
  width: 38%;
  height: 100%;
  background: #00f2ff;
}

.flight-line :deep(.wd-icon),
.flight-line :deep(.stitch-icon) {
  position: relative;
  z-index: 1;
  transform: rotate(-25deg);
}

.compliance {
  min-height: 112rpx;
  margin-top: 34rpx;
  padding: 16rpx 23rpx;
  gap: 22rpx;
  border-radius: 4rpx;
  border: 2rpx solid rgba(58, 73, 75, .55);
  background: #262a34;
  box-sizing: border-box;
}

.compliance :deep(.wd-icon),
.compliance :deep(.stitch-icon) {
  color: #3b82f6;
  flex: 0 0 auto;
}

.compliance text {
  color: #dfe2f0;
  font-size: 28rpx;
  line-height: 42rpx;
}

.reason {
  align-items: flex-start;
  gap: 22rpx;
  margin-top: 26rpx;
}

.reason :deep(.wd-icon),
.reason :deep(.stitch-icon) {
  color: #f59e0b;
  margin-top: 4rpx;
  flex: 0 0 auto;
}

.reason-label {
  display: block;
  color: #b9cacb;
  font-size: 23rpx;
  line-height: 32rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.reason-copy {
  display: block;
  margin-top: 6rpx;
  color: #e1fdff;
  font-size: 27rpx;
  line-height: 40rpx;
}

.cost-card {
  overflow: hidden;
  margin-top: 38rpx;
  border-radius: 16rpx;
  border: 2rpx solid rgba(58, 73, 75, .92);
  background: #141822;
}

.cost-head {
  min-height: 112rpx;
  padding: 0 36rpx;
  justify-content: space-between;
}

.cost-title {
  gap: 22rpx;
  color: #e1fdff;
  font-size: 34rpx;
  line-height: 40rpx;
  font-weight: 700;
}

.cost-title :deep(.wd-icon),
.cost-title :deep(.stitch-icon),
.chevron {
  color: #b9cacb;
}

.chevron {
  transition: transform .2s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.cost-detail {
  padding: 26rpx 34rpx 30rpx;
  border-top: 2rpx solid #3a494b;
  background: #171b26;
}

.cost-line,
.cost-total {
  min-height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.cost-line text {
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 38rpx;
}

.cost-line text:last-child,
.cost-total text:last-child {
  color: #e1fdff;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

.cost-divider {
  height: 2rpx;
  margin: 12rpx 0;
  background: #3a494b;
}

.cost-total text {
  color: #e1fdff;
  font-size: 30rpx;
  line-height: 42rpx;
  font-weight: 700;
}

.cost-total text:last-child {
  color: #10b981;
}

.message {
  display: block;
  margin-top: 22rpx;
  padding: 18rpx 22rpx;
  border-radius: 8rpx;
  background: rgba(245, 158, 11, .12);
  border: 2rpx solid rgba(245, 158, 11, .35);
  color: #fff6e4;
  font-size: 24rpx;
  line-height: 34rpx;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 45;
  min-height: 136rpx;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  gap: 32rpx;
  border-top: 2rpx solid #3a494b;
  background: rgba(15, 19, 29, .94);
  box-sizing: border-box;
}

.rematch-button,
.confirm-button {
  height: 100rpx;
  justify-content: center;
  box-sizing: border-box;
}

.rematch-button {
  width: 250rpx;
  border: 2rpx solid #3b82f6;
  color: #3b82f6;
  background: rgba(11, 14, 20, .80);
}

.confirm-button {
  flex: 1;
  color: #0b0e14;
  background: #00f2ff;
  box-shadow: 0 0 30rpx rgba(0, 242, 255, .30);
}

.confirm-button.loading {
  opacity: .72;
}

.rematch-button text,
.confirm-button text {
  font-size: 34rpx;
  line-height: 40rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
}

.tap-press,
.pill-press,
.item-press,
.card-press {
  opacity: .86;
  transform: scale(.985);
}
</style>
