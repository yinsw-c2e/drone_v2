<template>
  <view class="wallet-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand-wrap" hover-class="tap-press" @click="goProfile">
        <view class="avatar-button">
          <view class="avatar-card">
            <StitchIcon name="person" size="36rpx" fill />
          </view>
          <view class="avatar-lines">
            <view />
            <view />
            <view />
          </view>
        </view>
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showToast(copy.signalHealthy)">
          <StitchIcon name="signal_cellular_alt" size="43rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="page-head">
        <text class="title">{{ copy.pageTitle }}</text>
        <text class="subtitle">{{ copy.subtitle }}</text>
      </view>

      <view class="withdraw-button" hover-class="tap-press" @click="openWithdraw">
        <StitchIcon name="payments" size="39rpx" />
        <text>{{ copy.withdrawFunds }}</text>
      </view>

      <view class="revenue-card">
        <view class="glow" />
        <view class="revenue-top">
          <StitchIcon name="account_balance" size="25rpx" />
          <text>{{ copy.totalRevenue }}</text>
        </view>
        <view class="revenue-main">
          <text class="revenue-value">¥ {{ formatMoney(totalRevenueCent) }}</text>
          <view class="trend"><StitchIcon name="trending_up" size="22rpx" /><text>{{ trendText }}</text></view>
        </view>
        <view class="sparkline">
          <view v-for="bar in sparkBars" :key="bar.height" :style="{ height: bar.height }" :class="['spark-bar', bar.active ? 'active' : '']">
            <view v-if="bar.active" class="spark-dot" />
          </view>
        </view>
      </view>

      <view class="metric-grid">
        <view class="metric-card" hover-class="tap-press" @click="openWithdraw">
          <text class="metric-label">{{ copy.withdrawable }}</text>
          <text class="metric-value">¥ {{ formatMoney(displayBalanceCent) }}</text>
          <view class="meter">
            <view class="meter-fill cyan" :style="{ width: withdrawableProgress }" />
          </view>
        </view>
        <view class="metric-card" hover-class="tap-press" @click="release">
          <text class="metric-label">{{ copy.pendingSettlement }}</text>
          <text class="metric-value">¥ {{ formatMoney(displayPendingCent) }}</text>
          <view class="meter">
            <view class="meter-fill amber" :style="{ width: pendingProgress }" />
          </view>
        </view>
        <view class="metric-card">
          <text class="metric-label">{{ copy.monthlyFlow }}</text>
          <text class="metric-value">¥ {{ formatMoney(monthlyFlowCent) }}</text>
          <view class="meter">
            <view class="meter-fill blue" :style="{ width: monthlyProgress }" />
          </view>
        </view>
        <view class="metric-card">
          <text class="metric-label">{{ copy.serviceFees }}</text>
          <text class="metric-value">-¥ {{ formatMoney(absServiceFeesCent) }}</text>
          <view class="meter">
            <view class="meter-fill red" :style="{ width: serviceFeeProgress }" />
          </view>
        </view>
      </view>

      <view class="ledger-card">
        <view class="ledger-head">
          <view class="ledger-title">
            <StitchIcon name="receipt_long" size="31rpx" />
            <text>{{ copy.transactionLedger }}</text>
          </view>
          <view class="ledger-actions">
            <view class="small-button" hover-class="tap-press" @click="cycleFilter">{{ filterLabel }}</view>
            <view class="small-button" hover-class="tap-press" @click="exportLedger">{{ copy.export }}</view>
          </view>
        </view>

        <view class="ledger-list">
          <view v-if="!ledgerRows.length" class="ledger-row muted">
            <view class="desc-block">
              <text class="row-title">{{ copy.noLedger }}</text>
            </view>
          </view>
          <view v-for="row in ledgerRows" :key="row.id" :class="['ledger-row', row.muted ? 'muted' : '']">
            <view class="date-block">
              <text class="row-date">{{ row.date }}</text>
              <text class="row-time">{{ row.time }}</text>
            </view>
            <view class="desc-block">
              <text class="row-title">{{ row.title }}</text>
              <text class="row-tx">{{ row.txId }}</text>
            </view>
            <view :class="['chip', row.chipClass]">
              <StitchIcon class="chip-icon" :name="row.chipIcon" size="22rpx" />
              <text>{{ row.chipLabel }}</text>
            </view>
            <text :class="['row-amount', row.amountTone]">{{ row.amountText }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" hover-class="tap-press" @click="goHome">
        <StitchIcon name="grid_view" size="39rpx" />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goHall">
        <StitchIcon name="assignment" size="40rpx" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goAssets">
        <StitchIcon name="account_balance_wallet" size="40rpx" />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item active">
        <StitchIcon name="account_balance" size="43rpx" fill />
        <text>{{ copy.wallet }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="38rpx" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>

    <view v-if="showWithdrawSheet" class="sheet-mask" @click="closeWithdraw">
      <view class="withdraw-sheet" @click.stop>
        <view class="sheet-head">
          <view>
            <text class="sheet-title">{{ copy.sheetTitle }}</text>
            <text class="sheet-desc">{{ copy.sheetDesc }}</text>
          </view>
          <view class="sheet-close" hover-class="tap-press" @click="closeWithdraw">×</view>
        </view>

        <view class="withdraw-summary">
          <view>
            <text class="summary-label">{{ copy.currentWithdrawable }}</text>
            <text class="summary-value">¥{{ formatYuan(balanceCent) }}</text>
          </view>
          <view>
            <text class="summary-label">{{ copy.pendingShort }}</text>
            <text class="summary-value muted">¥{{ formatYuan(pendingCent) }}</text>
          </view>
        </view>

        <view class="amount-field">
          <text class="field-label">{{ copy.withdrawAmount }}</text>
          <view class="amount-input">
            <text>¥</text>
            <input v-model="withdrawAmount" type="digit" placeholder="0.00" />
          </view>
        </view>

        <view class="quick-row">
          <view class="quick-btn" hover-class="tap-press" @click="setWithdrawRatio(25)">25%</view>
          <view class="quick-btn" hover-class="tap-press" @click="setWithdrawRatio(50)">50%</view>
          <view class="quick-btn" hover-class="tap-press" @click="setWithdrawRatio(100)">{{ copy.all }}</view>
        </view>

        <text v-if="withdrawMessage" class="sheet-message">{{ withdrawMessage }}</text>

        <view class="sheet-actions">
          <view class="secondary-button sheet-btn" hover-class="tap-press" @click="closeWithdraw">{{ copy.cancel }}</view>
          <view class="primary-button sheet-btn" hover-class="tap-press" @click="confirmWithdraw">{{ copy.confirmWithdraw }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { isProductionBackendRequired } from '@/api/backend';
import { LedgerStatus, LedgerType, Role } from '@/models';
import type { LedgerEntry } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { ledgerTypeLabel } from '@/services/display-labels';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';
import { releasePending, walletWithdraw } from '@/utils/wallet';

interface SparkBar {
  height: string;
  active?: boolean;
}

interface LedgerViewRow {
  id: string;
  date: string;
  time: string;
  title: string;
  txId: string;
  chipLabel: string;
  chipClass: 'withdrawal' | 'settlement' | 'fee' | 'pending';
  chipIcon: string;
  amountText: string;
  amountTone: 'neutral' | 'success' | 'danger' | 'muted';
  muted?: boolean;
}

const WALLET_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    signalHealthy: 'Network signal healthy',
    pageTitle: 'Pilot Wallet',
    subtitle: 'Financial overview and transaction telemetry.',
    withdrawFunds: 'Withdraw Funds',
    totalRevenue: 'TOTAL REVENUE (CNY)',
    withdrawable: 'WITHDRAWABLE',
    pendingSettlement: 'PENDING SETTLEMENT',
    monthlyFlow: 'MONTHLY FLOW',
    serviceFees: 'SERVICE FEES',
    transactionLedger: 'Transaction Ledger',
    filter: 'Filter',
    export: 'Export',
    exported: 'Ledger copied to clipboard',
    noLedger: 'No transactions yet',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    wallet: 'Wallet',
    profile: 'Profile',
    sheetTitle: 'Withdrawal Request',
    sheetDesc: 'Enter the withdrawal amount and confirm to generate a payout record.',
    currentWithdrawable: 'Withdrawable',
    pendingShort: 'Pending',
    withdrawAmount: 'Withdrawal Amount',
    all: 'All',
    cancel: 'Cancel',
    confirmWithdraw: 'Confirm Withdrawal',
    bankWithdrawal: 'Bank Withdrawal (ICBC)',
    missionSettlementB: 'Mission Settlement (Zone B)',
    platformFee: 'Platform Service Fee (5%)',
    missionAdvanceC: 'Mission Advance (Zone C)',
    withdrawal: 'Withdrawal',
    settlement: 'Settlement',
    fee: 'Fee',
    pending: 'Pending',
    settleInType: 'Settlement',
    withdrawType: 'Withdrawal',
    refundType: 'Refund',
    bonusType: 'Bonus',
    noPendingAmount: 'No pending settlement amount',
    pendingReleased: 'Pending settlement released',
    noWithdrawableBalance: 'No withdrawable balance',
    amountRequired: 'Enter a withdrawal amount greater than 0.',
    amountTooHigh: 'Withdrawal amount cannot exceed current withdrawable balance.',
    withdrawSuccess: 'Withdrawal successful',
    withdrawFailed: 'Withdrawal failed',
    featureTriggered: 'triggered',
    pilotIdentity: 'Current identity: Pilot',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    signalHealthy: '网络信号正常',
    pageTitle: '飞手钱包',
    subtitle: '收入概览与交易流水监控。',
    withdrawFunds: '申请提现',
    totalRevenue: '总收入 (CNY)',
    withdrawable: '可提现',
    pendingSettlement: '待结算',
    monthlyFlow: '本月流水',
    serviceFees: '服务费',
    transactionLedger: '交易流水',
    filter: '筛选',
    export: '导出',
    exported: '流水已复制到剪贴板',
    noLedger: '暂无交易流水',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    wallet: '钱包',
    profile: '我的',
    sheetTitle: '申请提现',
    sheetDesc: '输入本次提现金额，确认后生成提现流水。',
    currentWithdrawable: '当前可提',
    pendingShort: '待结算',
    withdrawAmount: '提现金额',
    all: '全部',
    cancel: '取消',
    confirmWithdraw: '确认提现',
    bankWithdrawal: '银行提现（工商银行）',
    missionSettlementB: '任务结算（B区）',
    platformFee: '平台服务费（5%）',
    missionAdvanceC: '任务预结算（C区）',
    withdrawal: '提现',
    settlement: '结算',
    fee: '费用',
    pending: '待结算',
    settleInType: '结算入账',
    withdrawType: '提现',
    refundType: '退款',
    bonusType: '奖励',
    noPendingAmount: '暂无待结算金额',
    pendingReleased: '待结算已释放',
    noWithdrawableBalance: '暂无可提现余额',
    amountRequired: '请输入大于 0 的提现金额。',
    amountTooHigh: '提现金额不能超过当前可提现余额。',
    withdrawSuccess: '提现成功',
    withdrawFailed: '提现失败',
    featureTriggered: '已触发',
    pilotIdentity: '当前为飞手身份',
    languageToast: '已切换为中文',
  },
} as const;

const userStore = useUserStore();
const productionRuntime = isProductionBackendRequired();
const localeStore = useLocaleStore();
const copy = computed(() => WALLET_COPY[localeStore.locale]);

ensureRole(Role.Pilot);

const user = computed(() => userStore.user);
const wallet = computed(() => repo.wallets.find(user.value.id));
const ledger = computed(() => repo.ledger.where((item) => item.userId === user.value.id).reverse());
const balanceCent = computed(() => wallet.value?.balanceCent ?? 0);
const pendingCent = computed(() => wallet.value?.pendingCent ?? 0);
const displayBalanceCent = computed(() => balanceCent.value);
const displayPendingCent = computed(() => pendingCent.value);
const totalRevenueCent = computed(() => {
  const positiveLedger = ledger.value.filter((item) => item.amountCent > 0).reduce((sum, item) => sum + item.amountCent, 0);
  return Math.max(positiveLedger, balanceCent.value + pendingCent.value);
});
const monthlyFlowCent = computed(() => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return ledger.value
    .filter((item) => item.createdAt.slice(0, 7) === currentMonth && item.amountCent > 0)
    .reduce((sum, item) => sum + item.amountCent, 0);
});
const serviceFeesCent = computed(() => ledger.value
  .filter((item) => item.amountCent < 0 && item.type !== LedgerType.Withdraw)
  .reduce((sum, item) => sum + item.amountCent, 0));
const absServiceFeesCent = computed(() => Math.abs(serviceFeesCent.value));
const trendText = computed(() => `+¥${formatMoney(monthlyFlowCent.value)}`);
const withdrawableProgress = computed(() => progress(displayBalanceCent.value, Math.max(totalRevenueCent.value, 1), 4));
const pendingProgress = computed(() => progress(displayPendingCent.value, Math.max(totalRevenueCent.value, 1), 4));
const monthlyProgress = computed(() => progress(monthlyFlowCent.value, Math.max(totalRevenueCent.value, 1), 4));
const serviceFeeProgress = computed(() => progress(absServiceFeesCent.value, Math.max(totalRevenueCent.value, 1), 2));
// 收入走势：最近 6 笔入账按金额归一化
const sparkBars = computed<SparkBar[]>(() => {
  const inflows = ledger.value.filter((item) => item.amountCent > 0).slice(0, 6).reverse();
  if (!inflows.length) return Array.from({ length: 6 }, () => ({ height: '12rpx' }));
  const max = Math.max(...inflows.map((item) => item.amountCent));
  return inflows.map((item, index) => ({
    height: `${Math.max(20, Math.round((item.amountCent / max) * 108))}rpx`,
    active: index === inflows.length - 1,
  }));
});
const ledgerFilter = ref<'all' | 'in' | 'out' | 'pending'>('all');
const filteredLedger = computed(() => ledger.value.filter((item) => {
  if (ledgerFilter.value === 'in') return item.amountCent > 0 && item.status !== LedgerStatus.Pending;
  if (ledgerFilter.value === 'out') return item.amountCent < 0;
  if (ledgerFilter.value === 'pending') return item.status === LedgerStatus.Pending;
  return true;
}));
const ledgerRows = computed(() => filteredLedger.value.slice(0, 8).map(toLedgerRow));
const filterLabel = computed(() => ledgerFilter.value === 'all' ? copy.value.filter : ledgerFilter.value === 'in' ? copy.value.settlement : ledgerFilter.value === 'out' ? copy.value.fee : copy.value.pending);
const showWithdrawSheet = ref(false);
const withdrawAmount = ref('');
const withdrawMessage = ref('');

function progress(value: number, max: number, min: number) {
  const pct = Math.max(min, Math.min(100, Math.round((value / max) * 100)));
  return `${pct}%`;
}

function formatYuan(amountCent: number) {
  return (amountCent / 100).toFixed(2);
}

function formatMoney(amountCent: number) {
  return (amountCent / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSigned(amountCent: number) {
  const sign = amountCent > 0 ? '+' : amountCent < 0 ? '-' : '';
  return `${sign}${formatMoney(Math.abs(amountCent))}`;
}

function ledgerTypeName(type: LedgerType) {
  if (localeStore.locale === 'zh') return ledgerTypeLabel(type);
  const map: Record<LedgerType, string> = {
    [LedgerType.SettleIn]: copy.value.settleInType,
    [LedgerType.Withdraw]: copy.value.withdrawType,
    [LedgerType.Refund]: copy.value.refundType,
    [LedgerType.Bonus]: copy.value.bonusType,
  };
  return map[type] ?? `${type}`;
}

function ledgerTitle(item: LedgerEntry) {
  if (!item.note) return ledgerTypeName(item.type);
  if (localeStore.locale === 'en' && item.note === '提现') return copy.value.withdrawal;
  return item.note;
}

function toLedgerRow(item: LedgerEntry): LedgerViewRow {
  const isWithdraw = item.type === LedgerType.Withdraw;
  const isPending = item.status === LedgerStatus.Pending;
  const date = item.createdAt.slice(0, 10);
  const time = isPending ? copy.value.pending : `${item.createdAt.slice(11, 19)} CST`;
  const chipClass = isPending ? 'pending' : isWithdraw ? 'withdrawal' : item.amountCent < 0 ? 'fee' : 'settlement';
  return {
    id: item.id,
    date,
    time,
    title: ledgerTitle(item),
    txId: item.orderId || item.id.toUpperCase(),
    chipLabel: isPending ? copy.value.pending : isWithdraw ? copy.value.withdrawal : item.amountCent < 0 ? copy.value.fee : copy.value.settlement,
    chipClass,
    chipIcon: chipClass === 'pending' ? 'schedule' : chipClass === 'settlement' ? 'done_all' : item.amountCent < 0 ? 'money_off' : 'account_balance',
    amountText: formatSigned(item.amountCent),
    amountTone: item.amountCent > 0 ? (isPending ? 'muted' : 'success') : item.amountCent < 0 && !isWithdraw ? 'danger' : 'neutral',
    muted: isPending,
  };
}

function release() {
  if (productionRuntime) {
    uni.showToast({ title: '结算释放服务尚未接入', icon: 'none' });
    return;
  }
  if (pendingCent.value <= 0) {
    uni.showToast({ title: copy.value.noPendingAmount, icon: 'none' });
    return;
  }
  releasePending(user.value.id);
  uni.showToast({ title: copy.value.pendingReleased, icon: 'success' });
}

function openWithdraw() {
  if (productionRuntime) {
    uni.showToast({ title: '提现服务尚未接入生产后端', icon: 'none' });
    return;
  }
  withdrawMessage.value = '';
  if (balanceCent.value <= 0) {
    uni.showToast({ title: copy.value.noWithdrawableBalance, icon: 'none' });
    return;
  }
  withdrawAmount.value = formatYuan(balanceCent.value);
  showWithdrawSheet.value = true;
}

function closeWithdraw() {
  showWithdrawSheet.value = false;
}

function setWithdrawRatio(ratio: number) {
  withdrawMessage.value = '';
  const amount = Math.floor((balanceCent.value * ratio) / 100);
  withdrawAmount.value = formatYuan(amount);
}

function inputAmountCent() {
  const amount = Number(withdrawAmount.value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function confirmWithdraw() {
  const amountCent = inputAmountCent();
  if (amountCent <= 0) {
    withdrawMessage.value = copy.value.amountRequired;
    return;
  }
  if (amountCent > balanceCent.value) {
    withdrawMessage.value = copy.value.amountTooHigh;
    return;
  }
  try {
    walletWithdraw(user.value.id, amountCent);
    showWithdrawSheet.value = false;
    uni.showToast({ title: copy.value.withdrawSuccess, icon: 'success' });
  } catch (e) {
    withdrawMessage.value = e instanceof Error ? e.message : copy.value.withdrawFailed;
  }
}

function showToast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function cycleFilter() {
  const order: Array<typeof ledgerFilter.value> = ['all', 'in', 'out', 'pending'];
  ledgerFilter.value = order[(order.indexOf(ledgerFilter.value) + 1) % order.length];
}

function exportLedger() {
  const lines = filteredLedger.value.map((item) => `${item.createdAt.slice(0, 16)} ${ledgerTitle(item)} ${formatSigned(item.amountCent)}`);
  const summary = [`${copy.value.transactionLedger} (${lines.length})`, ...lines].join('\n');
  uni.setClipboardData({
    data: summary,
    success: () => showToast(copy.value.exported),
    fail: () => showToast(summary.slice(0, 60)),
  });
}

function toggleLocale() {
  localeStore.toggleLocale();
  uni.showToast({ title: copy.value.languageToast, icon: 'none' });
}

function goHome() {
  uni.reLaunch({ url: '/pages-pilot/home/index' });
}

function goHall() {
  uni.navigateTo({ url: '/pages-pilot/hall/index' });
}

function goAssets() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/index' });
}
</script>

<style lang="scss" scoped>
.wallet-page {
  min-height: 100vh;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 198rpx;
  box-sizing: border-box;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 60;
  height: 122rpx;
  padding: 0 31rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap,
.avatar-button,
.signal-button,
.top-actions,
.withdraw-button,
.revenue-top,
.revenue-main,
.sparkline,
.ledger-head,
.ledger-title,
.ledger-actions,
.bottom-nav,
.nav-item,
.sheet-head {
  display: flex;
  align-items: center;
}

.brand-wrap {
  gap: 22rpx;
  min-width: 0;
  flex: 1;
}

.avatar-button {
  position: relative;
  width: 78rpx;
  height: 78rpx;
  border-radius: 22rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  color: #dfe2f0;
  justify-content: center;
  overflow: hidden;
  box-shadow: inset 0 0 0 2rpx rgba(225, 253, 255, .06);
}

.avatar-card {
  width: 45rpx;
  height: 45rpx;
  border-radius: 6rpx;
  border: 2rpx solid #849495;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-card :deep(.stitch-icon) {
  color: #dfe2f0;
}

.avatar-lines {
  position: absolute;
  left: 13rpx;
  right: 13rpx;
  bottom: 10rpx;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 5rpx;
}

.avatar-lines view {
  height: 3rpx;
  background: rgba(132, 148, 149, .75);
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 45rpx;
  line-height: 58rpx;
  font-weight: 800;
  letter-spacing: -1rpx;
  @include ellipsis(1);
}

.top-actions {
  justify-content: flex-end;
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

.signal-button {
  width: 54rpx;
  height: 54rpx;
  justify-content: center;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .title,
.zh-copy .revenue-value,
.zh-copy .ledger-title text,
.zh-copy .sheet-title,
.zh-copy .summary-value,
.zh-copy .amount-input,
.zh-copy .amount-input input,
.zh-copy .language-switch {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .revenue-top,
.zh-copy .metric-label,
.zh-copy .metric-value,
.zh-copy .trend,
.zh-copy .small-button,
.zh-copy .row-date,
.zh-copy .row-time,
.zh-copy .row-tx,
.zh-copy .chip,
.zh-copy .row-amount,
.zh-copy .nav-item {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .brand {
  font-size: 46rpx;
}

.zh-copy .subtitle {
  white-space: normal;
}

.content {
  padding: 154rpx 31rpx 0;
}

.page-head {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.title {
  color: #f0f3ff;
  font-size: 45rpx;
  line-height: 57rpx;
  font-weight: 700;
}

.subtitle {
  color: #dfe2f0;
  font-size: 26rpx;
  line-height: 38rpx;
  font-weight: 400;
  white-space: nowrap;
}

.withdraw-button {
  width: 410rpx;
  height: 78rpx;
  margin-top: 31rpx;
  border-radius: 7rpx;
  background: #00f2ff;
  color: #002022;
  justify-content: center;
  gap: 17rpx;
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 700;
  box-sizing: border-box;
}

.revenue-card {
  position: relative;
  min-height: 411rpx;
  margin-top: 46rpx;
  padding: 52rpx 48rpx 45rpx;
  border-radius: 12rpx;
  border: 2rpx solid #3a494b;
  background: linear-gradient(112deg, #141822 0%, #111a24 58%, #123942 100%);
  box-sizing: border-box;
  overflow: hidden;
}

.glow {
  position: absolute;
  right: -65rpx;
  top: -95rpx;
  width: 270rpx;
  height: 270rpx;
  border-radius: 50%;
  background: rgba(0, 242, 255, .13);
  filter: blur(55rpx);
}

.revenue-top {
  position: relative;
  z-index: 1;
  gap: 14rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 30rpx;
  font-weight: 700;
  letter-spacing: .22em;
}

.revenue-main {
  position: relative;
  z-index: 1;
  margin-top: 28rpx;
  gap: 16rpx;
}

.revenue-value {
  color: #f0f3ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 69rpx;
  line-height: 86rpx;
  font-weight: 800;
  letter-spacing: -2rpx;
  text-shadow: 0 5rpx 0 rgba(0, 0, 0, .42);
  white-space: nowrap;
}

.trend {
  margin-top: 12rpx;
  padding: 3rpx 10rpx;
  border-radius: 3rpx;
  background: rgba(16, 185, 129, .12);
  color: #10b981;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 28rpx;
  font-weight: 700;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 2rpx;
}

.sparkline {
  position: absolute;
  left: 48rpx;
  right: 48rpx;
  bottom: 45rpx;
  height: 112rpx;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14rpx;
  opacity: .72;
}

.spark-bar {
  position: relative;
  flex: 1;
  min-width: 0;
  border-radius: 2rpx 2rpx 0 0;
  background: rgba(0, 242, 255, .24);
}

.spark-bar.active {
  background: rgba(0, 242, 255, .72);
  box-shadow: 0 0 13rpx rgba(0, 242, 255, .35);
}

.spark-dot {
  position: absolute;
  left: 50%;
  top: -9rpx;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #00f2ff;
  box-shadow: 0 0 16rpx #00f2ff;
  transform: translateX(-50%);
}

.metric-grid {
  margin-top: 31rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 31rpx 32rpx;
}

.metric-card {
  min-height: 222rpx;
  padding: 34rpx 31rpx 25rpx;
  border-radius: 11rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
}

.metric-label {
  display: block;
  min-height: 52rpx;
  color: #f0f3ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 31rpx;
  font-weight: 700;
  letter-spacing: .24em;
}

.metric-value {
  display: block;
  margin-top: 20rpx;
  color: #f0f3ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 700;
  letter-spacing: .1em;
  white-space: nowrap;
}

.meter {
  height: 6rpx;
  margin-top: 25rpx;
  border-radius: 999rpx;
  background: #313540;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: inherit;
}

.meter-fill.cyan {
  background: #00f2ff;
  box-shadow: 0 0 8rpx rgba(0, 242, 255, .8);
}

.meter-fill.amber {
  background: #f59e0b;
}

.meter-fill.blue {
  background: #3b82f6;
}

.meter-fill.red {
  background: #ef4444;
}

.ledger-card {
  margin-top: 62rpx;
  border-radius: 12rpx;
  border: 2rpx solid #3a494b;
  background: #1e2433;
  overflow: hidden;
}

.ledger-head {
  min-height: 154rpx;
  padding: 30rpx 31rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  justify-content: space-between;
  gap: 22rpx;
  box-sizing: border-box;
}

.ledger-title {
  gap: 17rpx;
  color: #00f2ff;
  min-width: 0;
}

.ledger-title text {
  color: #f0f3ff;
  font-size: 32rpx;
  line-height: 39rpx;
  font-weight: 900;
  max-width: 210rpx;
}

.ledger-actions {
  gap: 15rpx;
  flex: 0 0 auto;
}

.small-button {
  min-width: 139rpx;
  height: 45rpx;
  padding: 0 18rpx;
  border-radius: 3rpx;
  background: #313540;
  color: #dfe2f0;
  border: 2rpx solid rgba(132, 148, 149, .22);
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 45rpx;
  font-weight: 700;
  letter-spacing: .16em;
  text-align: center;
  box-sizing: border-box;
}

.ledger-list {
  background: #1e2433;
}

.ledger-row {
  min-height: 306rpx;
  padding: 28rpx 31rpx;
  border-bottom: 2rpx solid #3a494b;
  box-sizing: border-box;
}

.ledger-row:last-child {
  border-bottom: 0;
}

.ledger-row.muted {
  opacity: .72;
}

.date-block,
.desc-block {
  display: flex;
  flex-direction: column;
}

.row-date {
  color: #f0f3ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 29rpx;
  line-height: 38rpx;
  font-weight: 600;
  letter-spacing: .04em;
}

.row-time,
.row-tx {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  line-height: 31rpx;
  font-weight: 400;
  letter-spacing: .04em;
}

.row-title {
  margin-top: 23rpx;
  color: #f0f3ff;
  font-size: 26rpx;
  line-height: 36rpx;
  font-weight: 500;
}

.chip {
  width: fit-content;
  height: 45rpx;
  margin-top: 22rpx;
  padding: 0 16rpx;
  border-radius: 22rpx;
  border: 2rpx solid #849495;
  background: #0b0e14;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 41rpx;
  font-weight: 700;
  letter-spacing: .17em;
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-sizing: border-box;
}

.chip.settlement {
  border-color: rgba(0, 242, 255, .48);
  background: rgba(0, 242, 255, .12);
  color: #00f2ff;
}

.chip.pending {
  border-color: rgba(245, 158, 11, .48);
  background: rgba(245, 158, 11, .12);
  color: #f59e0b;
}

.chip.fee {
  color: #f0f3ff;
}

.chip-icon {
  font-size: 18rpx;
  line-height: 1;
}

.row-amount {
  display: block;
  margin-top: 18rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 29rpx;
  line-height: 38rpx;
  font-weight: 700;
}

.row-amount.neutral {
  color: #f0f3ff;
}

.row-amount.success {
  color: #00f2ff;
}

.row-amount.danger {
  color: #ef4444;
}

.row-amount.muted {
  color: #dfe2f0;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  height: 162rpx;
  padding: 11rpx 19rpx 22rpx;
  border-top: 2rpx solid #3a494b;
  border-top-left-radius: 12rpx;
  border-top-right-radius: 12rpx;
  background: #0f131d;
  justify-content: space-around;
  box-sizing: border-box;
  box-shadow: 0 -8rpx 22rpx rgba(0, 0, 0, .28);
}

.nav-item {
  min-width: 92rpx;
  height: 112rpx;
  color: #dfe2f0;
  flex-direction: column;
  justify-content: center;
  gap: 4rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 27rpx;
  font-weight: 900;
  letter-spacing: .16em;
}

.nav-item :deep(.stitch-icon) {
  color: currentColor;
}

.nav-item.active {
  min-width: 116rpx;
  height: 91rpx;
  border-radius: 32rpx;
  background: rgba(5, 102, 217, .32);
  color: #00f2ff;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, .62);
  display: flex;
  align-items: flex-end;
}

.withdraw-sheet {
  width: 100%;
  padding: 31rpx 31rpx calc(31rpx + env(safe-area-inset-bottom));
  border-top-left-radius: 18rpx;
  border-top-right-radius: 18rpx;
  border-top: 2rpx solid #3a494b;
  background: #141822;
  box-shadow: 0 -18rpx 50rpx rgba(0, 0, 0, .42);
  box-sizing: border-box;
}

.sheet-head {
  justify-content: space-between;
  gap: 24rpx;
}

.sheet-title,
.sheet-desc,
.summary-label,
.summary-value,
.field-label,
.sheet-message {
  display: block;
}

.sheet-title {
  color: #f0f3ff;
  font-size: 35rpx;
  line-height: 45rpx;
  font-weight: 900;
}

.sheet-desc {
  margin-top: 8rpx;
  color: #b9cacb;
  font-size: 24rpx;
  line-height: 35rpx;
}

.sheet-close {
  width: 62rpx;
  height: 62rpx;
  border-radius: 50%;
  background: #313540;
  color: #dfe2f0;
  font-size: 45rpx;
  line-height: 58rpx;
  text-align: center;
}

.withdraw-summary {
  margin-top: 31rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.withdraw-summary > view {
  padding: 24rpx;
  border-radius: 8rpx;
  background: #0b0e14;
  border: 2rpx solid #3a494b;
}

.summary-label {
  color: #b9cacb;
  font-size: 22rpx;
  line-height: 31rpx;
}

.summary-value {
  margin-top: 6rpx;
  color: #f0f3ff;
  font-size: 36rpx;
  line-height: 46rpx;
  font-weight: 900;
}

.summary-value.muted {
  color: #f59e0b;
}

.amount-field {
  margin-top: 31rpx;
}

.field-label {
  color: #dfe2f0;
  font-size: 25rpx;
  line-height: 36rpx;
  font-weight: 700;
}

.amount-input {
  margin-top: 14rpx;
  min-height: 98rpx;
  padding: 0 24rpx;
  border-radius: 8rpx;
  background: #0b0e14;
  border: 2rpx solid #00f2ff;
  color: #f0f3ff;
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 38rpx;
  font-weight: 900;
}

.amount-input input {
  flex: 1;
  min-width: 0;
  color: #f0f3ff;
  font-size: 38rpx;
  font-weight: 900;
}

.quick-row {
  margin-top: 24rpx;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16rpx;
}

.quick-btn {
  min-height: 76rpx;
  border-radius: 8rpx;
  background: #1e2433;
  border: 2rpx solid #3a494b;
  color: #dfe2f0;
  font-size: 25rpx;
  font-weight: 800;
  line-height: 76rpx;
  text-align: center;
}

.sheet-message {
  margin-top: 24rpx;
  padding: 16rpx 20rpx;
  border-radius: 6rpx;
  background: rgba(239, 68, 68, .13);
  color: #ffb4ab;
  font-size: 24rpx;
  line-height: 35rpx;
}

.sheet-actions {
  margin-top: 31rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.sheet-btn {
  min-height: 88rpx;
}
</style>
