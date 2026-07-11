<template>
  <view class="mission-page">
    <view class="topbar">
      <view class="back-button" hover-class="tap-press" @click="goBack">
        <StitchIcon name="arrow_back" size="42rpx" />
      </view>
      <view class="title-block">
        <text class="eyebrow">OWNER TASK</text>
        <text class="title">任务详情</text>
      </view>
      <view :class="['status-chip', statusTone]">
        <text>{{ statusLabel }}</text>
      </view>
    </view>

    <view v-if="!order" class="content empty-content">
      <view class="empty-state">
        <StitchIcon name="assignment_late" size="58rpx" />
        <text class="empty-title">未找到任务单</text>
        <text class="empty-copy">当前任务可能已被撤回，或入口缺少订单编号。</text>
        <view class="empty-action" hover-class="tap-press" @click="goDispatch">返回调度</view>
      </view>
    </view>

    <view v-else class="content">
      <view class="mission-hero">
        <view class="hero-head">
          <view>
            <text class="hero-label">任务单</text>
            <text class="order-code">{{ orderCode }}</text>
          </view>
          <view class="hero-icon">
            <StitchIcon name="local_shipping" size="43rpx" />
          </view>
        </view>
        <view class="route-panel">
          <view class="route-node">
            <view class="node-dot origin" />
            <view class="route-copy">
              <text class="route-label">起点</text>
              <text class="route-name">{{ originText }}</text>
            </view>
          </view>
          <view class="route-divider" />
          <view class="route-node">
            <view class="node-dot dest" />
            <view class="route-copy">
              <text class="route-label">终点</text>
              <text class="route-name">{{ destText }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="metric-grid">
        <view v-for="metric in missionMetrics" :key="metric.label" class="metric-card">
          <StitchIcon :name="metric.icon" size="30rpx" />
          <text class="metric-label">{{ metric.label }}</text>
          <text class="metric-value">{{ metric.value }}</text>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <StitchIcon name="precision_manufacturing" size="34rpx" />
          <text>执行资源</text>
        </view>
        <view class="info-list">
          <view class="info-row">
            <text>设备</text>
            <text>{{ droneName }}</text>
          </view>
          <view class="info-row">
            <text>设备编号</text>
            <text>{{ droneCode }}</text>
          </view>
          <view class="info-row">
            <text>飞手</text>
            <text>{{ pilotName }}</text>
          </view>
          <view class="info-row">
            <text>运力状态</text>
            <text>{{ capacityLabel }}</text>
          </view>
          <view class="info-row">
            <text>运力位置</text>
            <text>{{ capacityPlace }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <StitchIcon name="inventory_2" size="34rpx" />
          <text>货物与保障</text>
        </view>
        <view class="info-list">
          <view class="info-row">
            <text>货物类型</text>
            <text>{{ cargoType }}</text>
          </view>
          <view class="info-row">
            <text>重量 / 体积</text>
            <text>{{ cargoSize }}</text>
          </view>
          <view class="info-row">
            <text>货值</text>
            <text>{{ cargoValue }}</text>
          </view>
          <view class="info-row">
            <text>支付方式</text>
            <text>{{ paymentMode }}</text>
          </view>
        </view>
        <view class="tag-row">
          <view v-for="tag in protectionTags" :key="tag" class="protection-tag">{{ tag }}</view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <StitchIcon name="receipt_long" size="34rpx" />
          <text>机主收益</text>
        </view>
        <view class="settlement-panel">
          <view>
            <text class="settlement-label">{{ ownerRevenueLabel }}</text>
            <text class="settlement-value">¥{{ ownerRevenue }}</text>
          </view>
          <view class="cycle-pill">{{ ownerCycle }}</view>
        </view>
        <text class="settlement-note">{{ ownerSettlementNote }}</text>
      </view>

      <view class="section timeline-section">
        <view class="section-head">
          <StitchIcon name="timeline" size="34rpx" />
          <text>任务流转</text>
        </view>
        <view class="timeline-list">
          <view v-for="event in eventRows" :key="event.key" class="timeline-row">
            <view :class="['timeline-dot', event.tone]" />
            <view class="timeline-copy">
              <view class="timeline-title-row">
                <text class="timeline-title">{{ event.title }}</text>
                <text class="timeline-time">{{ event.at }}</text>
              </view>
              <text class="timeline-note">{{ event.note }}</text>
              <text class="timeline-actor">{{ event.actor }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-actions">
      <view class="secondary-action" hover-class="tap-press" @click="goDispatch">
        <StitchIcon name="assignment" size="31rpx" />
        <text>返回调度</text>
      </view>
      <view :class="['primary-action', canOpenWallet ? '' : 'pending']" hover-class="tap-press" @click="handleWalletAction">
        <StitchIcon name="account_balance_wallet" size="31rpx" />
        <text>{{ walletActionLabel }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import StitchIcon from '@/components/StitchIcon.vue';
import { LedgerStatus, OrderStatus, Role } from '@/models';
import type { Order } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { demoBatteryPct } from '@/services/device-status';
import {
  capacityStatusLabel,
  cargoTypeLabel,
  droneDisplayName,
  orderStatusLabel,
  paymentModeLabel,
  roleLabel,
} from '@/services/display-labels';
import { SETTLEMENT_RULES } from '@/stores/config-data';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

interface MissionMetric {
  label: string;
  value: string;
  icon: string;
}

interface TimelineRow {
  key: string;
  title: string;
  at: string;
  note: string;
  actor: string;
  tone: 'active' | 'done';
}

const orderId = ref('');
const localeStore = useLocaleStore();
const userStore = useUserStore();

ensureRole(Role.Owner);

const user = computed(() => userStore.user);
const ownerRule = SETTLEMENT_RULES.find((rule) => rule.party === 'owner');

onLoad((query?: Record<string, string | undefined>) => {
  const raw = query?.orderId || query?.id || '';
  orderId.value = decodeURIComponent(raw);
});

const order = computed(() => findOrder(orderId.value));
const capacity = computed(() => (order.value?.capacityId ? repo.capacity.find(order.value.capacityId) : undefined));
const drone = computed(() => (order.value?.droneId ? repo.drones.find(order.value.droneId) : undefined));
const pilot = computed(() => (order.value?.pilotId ? repo.users.find(order.value.pilotId) : undefined));
const ownerLedger = computed(() => {
  const mission = order.value;
  if (!mission) return undefined;
  return repo.ledger.where((item) => item.userId === user.value.id && item.orderId === mission.id).reverse()[0];
});
const ownerSettlementItem = computed(() => order.value?.settlement?.items.find((item) => item.party === 'owner'));

const orderCode = computed(() => order.value?.id.toUpperCase() ?? '—');
const statusLabel = computed(() => (order.value ? orderStatusLabel(order.value.status, localeStore.locale) : '未知'));
const statusTone = computed(() => {
  const status = order.value?.status;
  if (status === OrderStatus.Settled || status === OrderStatus.Completed) return 'success';
  if (status === OrderStatus.Exception || status === OrderStatus.Cancelled) return 'danger';
  if (status === OrderStatus.InFlight || status === OrderStatus.Unloading || status === OrderStatus.Loading) return 'active';
  return 'warning';
});
const originText = computed(() => routePointText(order.value?.from.address, '起点待现场确认'));
const destText = computed(() => routePointText(order.value?.to.address, '终点待现场确认'));
const droneName = computed(() => (drone.value ? droneDisplayName(drone.value) : '待绑定设备'));
const droneCode = computed(() => drone.value?.sn ?? order.value?.droneId ?? '待绑定');
const pilotName = computed(() => pilot.value?.nickname ?? '待绑定飞手');
const capacityLabel = computed(() => (capacity.value ? capacityStatusLabel(capacity.value.status) : '待绑定运力'));
const capacityPlace = computed(() => {
  if (!capacity.value) return '待绑定运力';
  return routePointText(capacity.value.location.address, '已定位，地址待反解析');
});
const cargoType = computed(() => (order.value ? cargoTypeLabel(order.value.cargo.type) : '—'));
const cargoSize = computed(() => {
  const mission = order.value;
  if (!mission) return '—';
  return `${mission.cargo.weightKg.toFixed(1)} kg / ${mission.cargo.volume || '体积未填'}`;
});
const cargoValue = computed(() => (order.value ? `¥${formatMoney(order.value.cargo.valueCent)}` : '—'));
const paymentMode = computed(() => order.value?.paymentMode ? paymentModeLabel(order.value.paymentMode) : '待确认');
const ownerRevenueCent = computed(() => {
  const mission = order.value;
  if (!mission) return 0;
  const settled = ownerSettlementItem.value?.amountCent;
  if (typeof settled === 'number') return settled;
  const total = mission.priceBreakdown?.totalCent ?? mission.settlement?.totalCent ?? mission.budgetCent;
  return Math.round(total * (ownerRule?.ratio ?? 0.3));
});
const ownerRevenue = computed(() => formatMoney(ownerRevenueCent.value));
const ownerCycle = computed(() => ownerSettlementItem.value?.cycle ?? ownerRule?.cycle ?? 'T+7');
const ownerRevenueLabel = computed(() => ownerSettlementItem.value ? '已生成机主分账' : '预计机主分账');
const canOpenWallet = computed(() => Boolean(ownerLedger.value || ownerSettlementItem.value));
const walletActionLabel = computed(() => canOpenWallet.value ? '查看钱包' : '收益待结算');
const ownerSettlementNote = computed(() => {
  if (ownerLedger.value?.status === LedgerStatus.Available) return '设备使用费已释放为可提现余额。';
  if (ownerLedger.value?.status === LedgerStatus.Paid) return '该笔收益已完成提现或支付处理。';
  if (ownerLedger.value?.status === LedgerStatus.Pending) return `${ownerLedger.value.cycle} 冻结中，释放后进入机主钱包。`;
  return `${ownerRule?.note ?? '设备使用费'}按订单成交额计算，完成结算后进入机主钱包。`;
});
const missionMetrics = computed<MissionMetric[]>(() => {
  const mission = order.value;
  if (!mission) return [];
  const totalCent = mission.priceBreakdown?.totalCent ?? mission.settlement?.totalCent ?? mission.budgetCent;
  return [
    { label: '电池', value: drone.value ? (demoBatteryPct(drone.value.id) === undefined ? '待遥测' : `${demoBatteryPct(drone.value.id)}%`) : '待绑定', icon: 'battery_charging_full' },
    { label: '载重', value: `${mission.cargo.weightKg.toFixed(1)} kg`, icon: 'scale' },
    { label: '订单金额', value: `¥${formatMoney(totalCent)}`, icon: 'payments' },
    { label: '机主收益', value: `¥${ownerRevenue.value}`, icon: 'account_balance_wallet' },
  ];
});
const protectionTags = computed(() => {
  const needs = order.value?.needs;
  if (!needs) return ['无特殊保障'];
  const tags = [
    needs.tempControl ? '温控' : '',
    needs.shockProof ? '防震' : '',
    needs.insurance ? '保险' : '',
    needs.special?.trim() || '',
  ].filter(Boolean);
  return tags.length ? tags : ['无特殊保障'];
});
const eventRows = computed<TimelineRow[]>(() => {
  const events = order.value?.events ?? [];
  return events.map((event, index) => ({
    key: `${event.at}-${index}`,
    title: orderStatusLabel(event.status, localeStore.locale),
    at: formatDateTime(event.at),
    note: event.note || '状态已更新',
    actor: event.actor ? roleLabel(event.actor) : '系统',
    tone: (index === events.length - 1 ? 'active' : 'done') as TimelineRow['tone'],
  })).reverse();
});

function findOrder(id: string): Order | undefined {
  const cleanId = id.trim();
  if (!cleanId) return undefined;
  return repo.orders.find(cleanId) ?? repo.orders.all().find((item) => item.id.toLowerCase() === cleanId.toLowerCase());
}

function routePointText(value: string | undefined, fallback: string) {
  const text = value?.trim();
  if (!text) return fallback;
  if (text === '当前位置' || text.toLowerCase() === 'current location') return fallback;
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(text)) return fallback;
  return text;
}

function formatMoney(amountCent: number) {
  return (amountCent / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }
  goDispatch();
}

function goDispatch() {
  const pages = getCurrentPages();
  const previous = pages[pages.length - 2];
  if (previous?.route === 'pages-owner/dispatch/index') {
    uni.navigateBack();
    return;
  }
  uni.redirectTo({ url: '/pages-owner/dispatch/index' });
}

function handleWalletAction() {
  if (!canOpenWallet.value) {
    uni.showToast({ title: `${ownerCycle.value} 结算后进入机主钱包`, icon: 'none' });
    return;
  }
  uni.navigateTo({ url: '/pages-owner/wallet/index' });
}
</script>

<style lang="scss" scoped>
.mission-page {
  min-height: 100vh;
  padding-bottom: 164rpx;
  box-sizing: border-box;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 70;
  height: 128rpx;
  padding: 0 28rpx;
  border-bottom: 2rpx solid #344246;
  background: #0b0e14;
  display: flex;
  align-items: center;
  gap: 22rpx;
  box-sizing: border-box;
}

.back-button,
.hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.back-button {
  width: 64rpx;
  height: 64rpx;
  border: 2rpx solid #344246;
  border-radius: 32rpx;
  color: #d9faff;
  background: rgba(18, 24, 35, 0.82);
}

.title-block {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.eyebrow,
.hero-label,
.metric-label,
.route-label,
.settlement-label,
.timeline-actor {
  color: #8e9aa7;
  font-size: 22rpx;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.title {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 900;
}

.status-chip {
  min-width: 118rpx;
  height: 54rpx;
  padding: 0 18rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(0, 240, 255, 0.36);
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.status-chip.warning {
  border-color: rgba(251, 191, 36, 0.42);
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.status-chip.success {
  border-color: rgba(55, 245, 173, 0.38);
  color: #37f5ad;
  background: rgba(55, 245, 173, 0.1);
}

.status-chip.danger {
  border-color: rgba(248, 113, 113, 0.44);
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

.content {
  padding: 156rpx 28rpx 30rpx;
  box-sizing: border-box;
}

.empty-content {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  width: 100%;
  min-height: 390rpx;
  padding: 46rpx 32rpx;
  border: 2rpx solid #344246;
  border-radius: 8rpx;
  background: #121722;
  color: #9fb0ba;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  text-align: center;
  box-sizing: border-box;
}

.empty-title {
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 900;
}

.empty-copy {
  max-width: 520rpx;
  color: #9fb0ba;
  font-size: 26rpx;
  line-height: 1.5;
}

.empty-action {
  margin-top: 14rpx;
  height: 76rpx;
  padding: 0 42rpx;
  border-radius: 8rpx;
  background: #00f0ff;
  color: #061016;
  font-size: 27rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mission-hero,
.section,
.metric-card {
  border: 2rpx solid #344246;
  border-radius: 8rpx;
  background: #121722;
  box-sizing: border-box;
}

.mission-hero {
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.hero-head,
.route-node,
.section-head,
.info-row,
.settlement-panel,
.timeline-title-row,
.bottom-actions,
.secondary-action,
.primary-action {
  display: flex;
  align-items: center;
}

.hero-head {
  justify-content: space-between;
  gap: 20rpx;
}

.order-code {
  display: block;
  margin-top: 8rpx;
  color: #ffffff;
  font-size: 39rpx;
  font-weight: 900;
  line-height: 1.1;
  word-break: break-all;
}

.hero-icon {
  width: 74rpx;
  height: 74rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(0, 240, 255, 0.42);
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.08);
}

.route-panel {
  padding: 26rpx;
  border-radius: 8rpx;
  background: #0b0f17;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.route-node {
  gap: 18rpx;
  min-width: 0;
}

.node-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #00f0ff;
  box-shadow: 0 0 18rpx rgba(0, 240, 255, 0.64);
}

.node-dot.dest {
  background: #37f5ad;
  box-shadow: 0 0 18rpx rgba(55, 245, 173, 0.58);
}

.route-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.route-name {
  color: #f2fbff;
  font-size: 29rpx;
  font-weight: 850;
  line-height: 1.35;
  word-break: break-word;
}

.route-divider {
  width: 2rpx;
  height: 34rpx;
  margin-left: 8rpx;
  background: #344246;
}

.metric-grid {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.metric-card {
  min-height: 162rpx;
  padding: 22rpx;
  color: #00f0ff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8rpx;
}

.metric-value {
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 900;
  line-height: 1.2;
  word-break: break-word;
}

.section {
  margin-top: 24rpx;
  padding: 28rpx;
}

.section-head {
  gap: 14rpx;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 900;
}

.section-head .stitch-icon {
  color: #00f0ff;
}

.info-list {
  margin-top: 22rpx;
  border-top: 2rpx solid #242e3b;
}

.info-row {
  min-height: 76rpx;
  gap: 20rpx;
  justify-content: space-between;
  border-bottom: 2rpx solid #242e3b;
}

.info-row text:first-child {
  flex-shrink: 0;
  color: #8e9aa7;
  font-size: 25rpx;
  font-weight: 800;
}

.info-row text:last-child {
  min-width: 0;
  color: #eef8fb;
  font-size: 27rpx;
  font-weight: 800;
  line-height: 1.35;
  text-align: right;
  word-break: break-word;
}

.tag-row {
  margin-top: 22rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.protection-tag,
.cycle-pill {
  min-height: 46rpx;
  padding: 0 18rpx;
  border-radius: 8rpx;
  background: rgba(0, 240, 255, 0.12);
  color: #00f0ff;
  font-size: 23rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
}

.settlement-panel {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 8rpx;
  background: #0b0f17;
  justify-content: space-between;
  gap: 18rpx;
}

.settlement-value {
  display: block;
  margin-top: 8rpx;
  color: #37f5ad;
  font-size: 42rpx;
  font-weight: 950;
  line-height: 1;
}

.settlement-note {
  display: block;
  margin-top: 18rpx;
  color: #9fb0ba;
  font-size: 25rpx;
  line-height: 1.5;
}

.timeline-section {
  margin-bottom: 14rpx;
}

.timeline-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.timeline-row {
  display: grid;
  grid-template-columns: 22rpx minmax(0, 1fr);
  gap: 18rpx;
}

.timeline-dot {
  width: 18rpx;
  height: 18rpx;
  margin-top: 9rpx;
  border-radius: 50%;
  background: #344246;
}

.timeline-dot.active {
  background: #00f0ff;
  box-shadow: 0 0 18rpx rgba(0, 240, 255, 0.64);
}

.timeline-dot.done {
  background: #37f5ad;
}

.timeline-copy {
  min-width: 0;
  padding-bottom: 20rpx;
  border-bottom: 2rpx solid #242e3b;
}

.timeline-title-row {
  gap: 16rpx;
  justify-content: space-between;
}

.timeline-title {
  color: #ffffff;
  font-size: 27rpx;
  font-weight: 900;
}

.timeline-time {
  flex-shrink: 0;
  color: #7b8792;
  font-size: 22rpx;
  font-weight: 800;
}

.timeline-note {
  display: block;
  margin-top: 8rpx;
  color: #b9c7cd;
  font-size: 25rpx;
  line-height: 1.45;
  word-break: break-word;
}

.timeline-actor {
  display: block;
  margin-top: 8rpx;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 72;
  height: 132rpx;
  padding: 18rpx 28rpx calc(18rpx + env(safe-area-inset-bottom));
  gap: 18rpx;
  background: rgba(11, 14, 20, 0.96);
  border-top: 2rpx solid #344246;
  box-sizing: border-box;
}

.secondary-action,
.primary-action {
  height: 78rpx;
  border-radius: 8rpx;
  justify-content: center;
  gap: 12rpx;
  font-size: 27rpx;
  font-weight: 900;
}

.secondary-action {
  width: 236rpx;
  border: 2rpx solid #344246;
  color: #d9faff;
  background: #121722;
}

.primary-action {
  flex: 1;
  color: #061016;
  background: #00f0ff;
  box-shadow: 0 0 26rpx rgba(0, 240, 255, 0.22);
}

.primary-action.pending {
  color: #fbbf24;
  border: 2rpx solid rgba(251, 191, 36, 0.48);
  background: rgba(251, 191, 36, 0.12);
  box-shadow: none;
}

.tap-press {
  opacity: 0.72;
  transform: scale(0.99);
}
</style>
