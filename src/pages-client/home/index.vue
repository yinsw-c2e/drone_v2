<template>
  <view class="skylink-home" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand">
        <view class="avatar"><StitchIcon name="person" size="38rpx" /></view>
        <text class="brand-name">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-btn" hover-class="tap-press" @click="toast(copy.signalReady)">
          <StitchIcon name="signal_cellular_alt" size="38rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="metric-grid">
        <view class="metric-card success">
          <view class="metric-label"><StitchIcon name="shield" size="22rpx" /> <text>{{ copy.creditScore }}</text></view>
          <text class="metric-value">{{ creditScore }}</text>
        </view>
        <view class="metric-card cyan">
          <view class="metric-label"><StitchIcon name="flight_takeoff" size="22rpx" /> <text>{{ copy.onlineCapacity }}</text></view>
          <view class="metric-inline"><text>{{ onlineCapacityText }}</text><text class="unit">{{ copy.unitDrone }}</text></view>
        </view>
        <view class="metric-card amber">
          <view class="metric-label"><StitchIcon name="account_balance_wallet" size="22rpx" /> <text>{{ copy.availableBudget }}</text></view>
          <text class="metric-value">¥{{ budgetText }}</text>
        </view>
      </view>

      <view class="scan-card">
        <view class="radar">
          <view class="radar-ring r1" />
          <view class="radar-ring r2" />
          <view class="radar-ring r3" />
          <view class="radar-sweep" />
          <view class="radar-dot" />
        </view>

        <view class="scan-head">
          <view>
            <view class="section-kicker active"><view class="pulse-dot" /><text>{{ scanTitle }}</text></view>
            <text class="track-id">{{ activeOrderCode }}</text>
          </view>
          <view class="warn-pill">{{ activeStatusText }}</view>
        </view>

        <view class="timeline">
          <view class="timeline-row">
            <view class="node muted" />
            <view>
              <text class="label-small">{{ copy.originLabel }}</text>
              <text class="route-title">{{ originName }}</text>
            </view>
          </view>
          <view class="timeline-row">
            <view class="node live" />
            <view>
              <text class="label-small cyan-text">{{ copy.destLabel }}</text>
              <text class="route-title">{{ destName }}</text>
            </view>
          </view>
        </view>

        <view class="telemetry-row">
          <view>
            <text class="label-small">{{ etaLabelText }}</text>
            <text class="data-value">{{ etaText }} <text v-if="etaUnit" class="data-unit">{{ etaUnit }}</text></text>
          </view>
          <view>
            <text class="label-small">{{ budgetLabelText }}</text>
            <text class="data-value amber-text">¥{{ orderBudgetText }}</text>
          </view>
        </view>

        <view class="primary-cta" hover-class="tap-press" @click="primaryCta">
          <view class="cta-copy">
            <StitchIcon name="verified" size="38rpx" />
            <text>{{ ctaText }}</text>
          </view>
          <StitchIcon name="arrow_forward" size="40rpx" />
        </view>
      </view>

      <view class="list-section">
        <view class="section-title">{{ copy.commonRoutes }}</view>
        <view class="route-list">
          <view
            v-for="route in commonRoutes"
            :key="route.id"
            class="route-item"
            hover-class="item-press"
            @click="goOrder(route.id)"
          >
            <view class="route-left">
              <view class="route-icon"><StitchIcon name="route" size="34rpx" /></view>
              <view>
                <view class="route-name"><text>{{ route.label.from }}</text><StitchIcon name="arrow_forward" size="22rpx" /><text>{{ route.label.to }}</text></view>
                <text class="route-meta">{{ route.label.meta }}</text>
              </view>
            </view>
            <view class="route-price"><text>¥{{ route.price }}</text><text>{{ copy.basePrice }}</text></view>
          </view>
        </view>
      </view>

      <view class="list-section recent-section">
        <view class="section-title">{{ copy.recentOrders }}</view>
        <view class="recent-box">
          <view
            v-for="row in recentOrders"
            :key="row.id"
            class="order-row"
            hover-class="item-press"
            @click="openTrack(row.id)"
          >
            <view :class="['order-left', row.done ? '' : 'pending']">
              <StitchIcon :name="row.done ? 'check_circle' : 'schedule'" size="30rpx" />
              <view>
                <text class="order-code">{{ row.code }}</text>
                <text class="order-meta">{{ row.meta }}</text>
              </view>
            </view>
            <text class="order-price">¥{{ row.amount }}</text>
          </view>
          <view v-if="!recentOrders.length" class="order-row">
            <view class="order-left pending">
              <StitchIcon name="info" size="30rpx" />
              <view>
                <text class="order-meta">{{ copy.noOrders }}</text>
              </view>
            </view>
          </view>
          <view v-if="hasMoreHistory" class="history-link" hover-class="item-press" @click="toggleHistory">
            <text>{{ historyExpanded ? copy.collapseHistory : copy.viewHistory }}</text>
            <StitchIcon name="chevron_right" size="24rpx" />
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item active" @click="toast(copy.currentHome)">
        <StitchIcon name="grid_view" size="38rpx" fill />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item" @click="goOrder()">
        <StitchIcon name="assignment" size="38rpx" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item" @click="goInsurance">
        <StitchIcon name="shield" size="38rpx" />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item" @click="goAuth">
        <StitchIcon name="person" size="38rpx" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { CapacityStatus, OrderStatus, Role } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { ensureDemoCredit, ordersNewestFirst } from '@/services/app-flow';
import { commonRoutePresets } from '@/services/common-routes';
import { orderStatusLabel } from '@/services/display-labels';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { computeCredit } from '@/utils/credit';
import { distanceKm } from '@/utils/geo';
import { etaMinutes } from '@/utils/price';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const orderStore = useOrderStore();
const localeStore = useLocaleStore();
ensureRole(Role.Client);
ensureDemoCredit();
const HOME_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    signalReady: 'Link signal normal',
    creditScore: 'Credit',
    onlineCapacity: 'Online Capacity',
    unitDrone: 'unit',
    availableBudget: 'Budget',
    currentScan: 'Active Lift Scan',
    completedScan: 'Latest Completed Lift',
    airspacePending: 'Airspace Pending',
    originLabel: 'ORIGIN',
    destLabel: 'DEST',
    originName: 'Qianhai Logistics Hub A',
    destName: 'Baoan Airport Cargo C',
    etaLabel: 'ETA',
    completedTimeLabel: 'Completed',
    minUnit: 'MIN',
    budgetLabel: 'Est. Budget',
    finalAmountLabel: 'Final Amount',
    nextStep: 'Next: Confirm Route Plan',
    reviewCta: 'View Settlement Review',
    completeCta: 'Generate Settlement Review',
    commonRoutes: 'Common Routes & Budget',
    basePrice: 'Reference',
    recentOrders: 'Recent Orders',
    noOrders: 'No orders yet. Launch your first lift.',
    startOrder: 'Launch First Order',
    trackCta: 'View Live Tracking',
    viewHistory: 'View all history',
    collapseHistory: 'Collapse history',
    currentHome: 'Current: Home',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    profile: 'Profile',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    signalReady: '链路信号正常',
    creditScore: '信用分',
    onlineCapacity: '在线运力',
    unitDrone: '台',
    availableBudget: '可用预算',
    currentScan: '当前吊运扫描',
    completedScan: '最近完成订单',
    airspacePending: '空域待确认',
    originLabel: '起吊点 ORIGIN',
    destLabel: '降落点 DEST',
    originName: '前海深港物流枢纽 A区',
    destName: '宝安国际机场 货运C站',
    etaLabel: '预计到达 (ETA)',
    completedTimeLabel: '完成时间',
    minUnit: 'MIN',
    budgetLabel: '预估预算',
    finalAmountLabel: '成交金额',
    nextStep: '下一步：确认航线方案',
    reviewCta: '查看结算评价',
    completeCta: '生成结算评价',
    commonRoutes: '常用航线与预算',
    basePrice: '参考价',
    recentOrders: '最近订单',
    noOrders: '还没有订单，先去发起首单吧。',
    startOrder: '发起首单',
    trackCta: '查看实时追踪',
    viewHistory: '查看全部历史记录',
    collapseHistory: '收起历史记录',
    currentHome: '当前：首页',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    profile: '我的',
    languageToast: '已切换为中文',
  },
} as const;
const copy = computed(() => HOME_COPY[localeStore.locale]);

const user = computed(() => userStore.user);
const credit = computed(() => repo.credits.find(user.value.id) ?? computeCredit(user.value.id, Role.Client));
const creditScore = computed(() => credit.value?.total ?? '—');
const onlineCapacityText = computed(() => String(repo.capacity.where((c) => c.status === CapacityStatus.Online).length).padStart(2, '0'));
const wallet = computed(() => repo.wallets.find(user.value.id));
const budgetText = computed(() => Math.round((wallet.value?.balanceCent ?? 0) / 100).toLocaleString('en-US'));
const commonRoutes = computed(() => commonRoutePresets().map((route) => ({
  id: route.id,
  label: route.labels[localeStore.locale],
  price: Math.round(route.referencePriceCent / 100).toLocaleString('en-US'),
})));

const activeOrder = computed(() => orderStore.activeOrder);
const activeOrderCode = computed(() => activeOrder.value ? activeOrder.value.id.toUpperCase() : '—');
const activeStatusText = computed(() => activeOrder.value ? orderStatusLabel(activeOrder.value.status, localeStore.locale) : orderStatusLabel(OrderStatus.Created, localeStore.locale));
const originName = computed(() => activeOrder.value?.from.address || copy.value.originName);
const destName = computed(() => activeOrder.value?.to.address || copy.value.destName);
const isTerminalOrder = computed(() => {
  const status = activeOrder.value?.status;
  return status === OrderStatus.Completed || status === OrderStatus.Settled;
});
const scanTitle = computed(() => isTerminalOrder.value ? copy.value.completedScan : copy.value.currentScan);
const etaLabelText = computed(() => isTerminalOrder.value ? copy.value.completedTimeLabel : copy.value.etaLabel);
const etaUnit = computed(() => isTerminalOrder.value ? '' : copy.value.minUnit);
const etaText = computed(() => {
  const order = activeOrder.value;
  if (!order) return '--:--';
  if (isTerminalOrder.value) return formatEventTime(latestEventTime(order));
  const km = order.distanceKm ?? distanceKm(order.from, order.to);
  return `${String(etaMinutes(km)).padStart(2, '0')}:00`;
});
const budgetLabelText = computed(() => isTerminalOrder.value ? copy.value.finalAmountLabel : copy.value.budgetLabel);
const orderBudgetText = computed(() => {
  const order = activeOrder.value;
  if (!order) return '0';
  return Math.round((order.priceBreakdown?.totalCent ?? order.budgetCent) / 100).toLocaleString('en-US');
});
const ctaText = computed(() => {
  const order = activeOrder.value;
  if (!order) return copy.value.startOrder;
  if (order.status === OrderStatus.Created || order.status === OrderStatus.Matching) return copy.value.nextStep;
  if (order.status === OrderStatus.Completed) return copy.value.completeCta;
  if (order.status === OrderStatus.Settled) return copy.value.reviewCta;
  return copy.value.trackCta;
});

const historyExpanded = ref(false);
const RECENT_ORDER_LIMIT = 2;
const clientOrders = computed(() => ordersNewestFirst(repo.orders.where((o) => o.clientId === user.value.id)));
const hasMoreHistory = computed(() => clientOrders.value.length > RECENT_ORDER_LIMIT);
const visibleClientOrders = computed(() => historyExpanded.value ? clientOrders.value : clientOrders.value.slice(0, RECENT_ORDER_LIMIT));
const recentOrders = computed(() => visibleClientOrders.value.map((order) => ({
  id: order.id,
  code: order.id.toUpperCase(),
  done: order.status === OrderStatus.Completed || order.status === OrderStatus.Settled,
  meta: `${orderStatusLabel(order.status, localeStore.locale)} ｜ ${formatTime(order.createdAt)}`,
  amount: Math.round((order.priceBreakdown?.totalCent ?? order.budgetCent) / 100).toLocaleString('en-US'),
})));

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function latestEventTime(order: NonNullable<typeof activeOrder.value>) {
  for (let index = order.events.length - 1; index >= 0; index -= 1) {
    const event = order.events[index];
    if (event.status === order.status) return event.at;
  }
  return order.events[order.events.length - 1]?.at ?? order.createdAt;
}

function goOrder(presetId?: string) {
  const query = presetId ? `?preset=${encodeURIComponent(presetId)}` : '';
  uni.navigateTo({ url: `/pages-client/order/index${query}` });
}

function goMatch() {
  if (!activeOrder.value) {
    goOrder();
    return;
  }
  uni.navigateTo({ url: '/pages-client/match/index' });
}

function goTrack() {
  if (!activeOrder.value) {
    goOrder();
    return;
  }
  uni.navigateTo({ url: `/pages-client/track/index?orderId=${encodeURIComponent(activeOrder.value.id)}` });
}

function primaryCta() {
  const order = activeOrder.value;
  if (!order) return goOrder();
  if (order.status === OrderStatus.Created || order.status === OrderStatus.Matching) return goMatch();
  if (order.status === OrderStatus.Completed || order.status === OrderStatus.Settled) {
    uni.navigateTo({ url: `/pages-client/review/index?orderId=${encodeURIComponent(order.id)}` });
    return;
  }
  return goTrack();
}

function openTrack(orderId: string) {
  orderStore.activeOrderId = orderId;
  uni.navigateTo({ url: `/pages-client/track/index?orderId=${encodeURIComponent(orderId)}` });
}

function toggleHistory() {
  if (!hasMoreHistory.value) return;
  historyExpanded.value = !historyExpanded.value;
}

function goInsurance() {
  uni.navigateTo({ url: '/pages-client/insurance/index' });
}

function goAuth() {
  uni.navigateTo({ url: '/pages/profile/index' });
}

function toast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  toast(copy.value.languageToast);
}
</script>

<style lang="scss" scoped>
.skylink-home {
  min-height: 100vh;
  color: #dfe2f0;
  background-color: #0b0e14;
  background-image:
    linear-gradient(0deg, rgba(132, 148, 149, .05) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(132, 148, 149, .05) 1rpx, transparent 1rpx);
  background-size: 38rpx 38rpx;
  padding-bottom: 190rpx;
  box-sizing: border-box;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 123rpx;
  padding: 0 31rpx;
  background: #0b0e14;
  border-bottom: 2rpx solid #3a494b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand,
.top-actions,
.route-left,
.order-left,
.cta-copy,
.route-name {
  display: flex;
  align-items: center;
}

.brand {
  gap: 23rpx;
  min-width: 0;
  flex: 1;
}

.avatar {
  width: 61rpx;
  height: 61rpx;
  border-radius: 50%;
  background: #313540;
  border: 2rpx solid #3a494b;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e1fdff;
}

.brand-name {
  color: #00f2ff;
  font-size: 46rpx;
  line-height: 61rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
  letter-spacing: 0;
  @include ellipsis(1);
}

.top-actions {
  gap: 12rpx;
  flex: 0 0 auto;
}

.language-switch {
  min-width: 56rpx;
  height: 44rpx;
  padding: 0 14rpx;
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

.signal-btn {
  width: 77rpx;
  height: 77rpx;
  border-radius: 8rpx;
  color: #e1fdff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand-name,
.zh-copy .language-switch,
.zh-copy .metric-value,
.zh-copy .metric-inline,
.zh-copy .track-id,
.zh-copy .label-small,
.zh-copy .route-meta,
.zh-copy .order-meta,
.zh-copy .data-value,
.zh-copy .route-price,
.zh-copy .nav-item {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.tap-press,
.item-press {
  opacity: .82;
  transform: scale(.98);
}

.content {
  padding: 169rpx 31rpx 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 23rpx;
}

.metric-card {
  min-height: 131rpx;
  padding: 20rpx 23rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #0f131d;
  box-sizing: border-box;
  overflow: hidden;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 5rpx;
  color: #b9cacb;
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
}

.metric-value,
.metric-inline {
  display: flex;
  align-items: baseline;
  margin-top: 2rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 35rpx;
  line-height: 46rpx;
  font-weight: 700;
  letter-spacing: 0;
}

.metric-card.success .metric-value { color: #10b981; }
.metric-card.cyan .metric-inline { color: #00f2ff; }
.metric-card.amber .metric-value { color: #ffe173; }

.unit {
  margin-left: 6rpx;
  color: #b9cacb;
  font-size: 18rpx;
  line-height: 31rpx;
}

.scan-card {
  position: relative;
  overflow: hidden;
  margin-top: 46rpx;
  padding: 38rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #1e2433;
  box-shadow: 0 16rpx 62rpx rgba(0, 0, 0, .5);
}

.radar {
  position: absolute;
  top: -23rpx;
  right: -92rpx;
  width: 369rpx;
  height: 369rpx;
  opacity: .32;
  pointer-events: none;
}

.radar-ring,
.radar-sweep {
  position: absolute;
  border-radius: 50%;
}

.radar-ring {
  border: 2rpx solid rgba(0, 242, 255, .28);
}

.r1 { inset: 0; }
.r2 { inset: 62rpx; border-color: rgba(0, 242, 255, .20); }
.r3 { inset: 123rpx; border-color: rgba(0, 242, 255, .10); }

.radar-sweep {
  inset: 0;
  background: conic-gradient(from 0deg, transparent 70%, rgba(0, 242, 255, .42) 100%);
}

.radar-dot {
  position: absolute;
  left: 123rpx;
  top: 92rpx;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: #00f2ff;
  box-shadow: 0 0 15rpx #00f2ff;
}

.scan-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 23rpx;
  margin-bottom: 46rpx;
}

.section-kicker {
  display: flex;
  align-items: center;
  gap: 15rpx;
  color: #00f2ff;
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
}

.pulse-dot {
  width: 15rpx;
  height: 15rpx;
  border-radius: 50%;
  background: #00f2ff;
  box-shadow: 0 0 8rpx #00f2ff;
}

.track-id,
.label-small,
.route-meta,
.order-meta {
  display: block;
  color: #b9cacb;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
}

.track-id {
  margin-top: 2rpx;
}

.warn-pill {
  padding: 8rpx 15rpx;
  border-radius: 4rpx;
  border: 2rpx solid rgba(245, 158, 11, .30);
  color: #f59e0b;
  background: rgba(245, 158, 11, .10);
  box-shadow: 0 0 15rpx rgba(245, 158, 11, .20);
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
  white-space: nowrap;
}

.timeline {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 31rpx;
  margin-left: 15rpx;
  margin-bottom: 46rpx;
  padding-left: 15rpx;
  border-left: 2rpx dashed #3a494b;
}

.timeline-row {
  position: relative;
  display: block;
  min-width: 0;
}

.node {
  position: absolute;
  left: -25rpx;
  top: 8rpx;
  width: 15rpx;
  height: 15rpx;
  border-radius: 50%;
}

.node.muted { background: #849495; }
.node.live {
  background: #00f2ff;
  box-shadow: 0 0 8rpx #00f2ff;
}

.cyan-text { color: #00f2ff; }
.amber-text { color: #ffe173; }

.route-title {
  display: block;
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 38rpx;
}

.telemetry-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 31rpx;
  margin-bottom: 38rpx;
  padding: 23rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(58, 73, 75, .50);
  background: #1b1f2a;
}

.data-value {
  display: block;
  margin-top: 8rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 35rpx;
  line-height: 46rpx;
  font-weight: 700;
}

.data-unit {
  color: #b9cacb;
  font-family: Inter, "PingFang SC", sans-serif;
  font-size: 27rpx;
  font-weight: 400;
}

.primary-cta {
  position: relative;
  z-index: 1;
  min-height: 92rpx;
  padding: 0 31rpx;
  border-radius: 8rpx;
  background: #00f2ff;
  color: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 23rpx;
  box-sizing: border-box;
}

.cta-copy {
  min-width: 0;
  gap: 15rpx;
  font-size: 27rpx;
  line-height: 38rpx;
  font-weight: 700;
}

.list-section {
  margin-top: 61rpx;
}

.section-title {
  margin-bottom: 31rpx;
  padding-bottom: 15rpx;
  border-bottom: 2rpx solid #3a494b;
  color: #b9cacb;
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
}

.route-list {
  display: grid;
  gap: 23rpx;
}

.route-item {
  min-height: 108rpx;
  padding: 23rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #0f131d;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 23rpx;
  box-sizing: border-box;
}

.route-left {
  min-width: 0;
  gap: 23rpx;
}

.route-icon {
  width: 77rpx;
  height: 77rpx;
  border-radius: 4rpx;
  border: 2rpx solid #3a494b;
  background: #262a34;
  color: #b9cacb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 77rpx;
}

.route-name {
  gap: 15rpx;
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 38rpx;
  font-weight: 500;
}

.route-name :deep(.stitch-icon) {
  color: #849495;
}

.route-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #b9cacb;
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
  white-space: nowrap;
}

.route-price text:first-child {
  color: #ffe173;
  font-size: 27rpx;
  line-height: 38rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

.recent-section {
  margin-bottom: 46rpx;
}

.recent-box {
  overflow: hidden;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #0f131d;
}

.order-row {
  min-height: 92rpx;
  padding: 23rpx;
  border-bottom: 2rpx solid #3a494b;
  background: rgba(23, 27, 38, .50);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 23rpx;
  box-sizing: border-box;
}

.order-left {
  min-width: 0;
  gap: 23rpx;
  color: #10b981;
}

.order-left.pending {
  color: #f59e0b;
}

.order-code {
  display: block;
  color: #dfe2f0;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 25rpx;
  line-height: 35rpx;
  font-weight: 700;
}

.order-price {
  color: #dfe2f0;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 27rpx;
  line-height: 38rpx;
  font-weight: 500;
  white-space: nowrap;
}

.history-link {
  min-height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  color: #00f2ff;
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  min-height: 92rpx;
  padding: 15rpx 15rpx calc(31rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid #3a494b;
  border-top-left-radius: 15rpx;
  border-top-right-radius: 15rpx;
  background: #0f131d;
  box-shadow: 0 -8rpx 24rpx rgba(0, 0, 0, .30);
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-sizing: border-box;
}

.nav-item {
  min-width: 108rpx;
  padding: 8rpx 15rpx;
  border-radius: 999rpx;
  color: #b9cacb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.nav-item.active {
  color: #00f2ff;
  background: rgba(5, 102, 217, .20);
  transform: scale(.9);
}

.nav-item text {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 18rpx;
  line-height: 31rpx;
  font-weight: 700;
}
</style>
