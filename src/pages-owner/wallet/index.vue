<template>
  <view class="wallet-page">
    <view class="topbar">
      <view class="brand-wrap" hover-class="tap-press" @click="goProfile">
        <view class="avatar-button">
          <StitchIcon name="person" size="38rpx" fill />
        </view>
        <text class="brand">机主钱包</text>
      </view>
      <view class="signal-button" hover-class="tap-press" @click="showFeedback('Signal link stable')">
        <StitchIcon name="signal_cellular_alt" size="44rpx" />
      </view>
    </view>

    <view class="content">
      <view class="balance-card">
        <view class="dot-grid" />
        <view class="balance-head">
          <text>可提现余额 (CNY)</text>
          <StitchIcon name="account_balance_wallet" size="29rpx" fill />
        </view>
        <text class="balance-value">¥{{ formatMoney(displayBalanceCent) }}</text>

        <view class="action-row">
          <view class="withdraw-btn" hover-class="tap-press" @click="openWithdraw">
            <StitchIcon name="payments" size="31rpx" fill />
            <text>立即提现</text>
          </view>
          <view class="bill-btn" hover-class="tap-press" @click="openBill">
            <StitchIcon name="receipt_long" size="31rpx" />
            <text>账单明细</text>
          </view>
        </view>
      </view>

      <view class="pending-card">
        <view class="pending-head">
          <view class="pending-label">
            <view class="warning-dot" />
            <text>待结算金额</text>
          </view>
          <StitchIcon name="schedule" size="29rpx" />
        </view>
        <text class="pending-value">¥{{ formatMoney(displayPendingCent) }}</text>

        <view class="rule-panel">
          <text class="rule-title">释放周期策略</text>
          <view class="rule-row">
            <view class="rule-badge"><text>T+7</text></view>
            <text class="rule-copy">设备使用费将在订单完成7个工作日后自动释放至可提现余额。</text>
          </view>
          <view v-if="pendingCent > 0" class="release-actions">
            <view class="release-btn" hover-class="tap-press" @click="release">
              <StitchIcon name="event_available" size="29rpx" />
              <text>模拟到期释放</text>
            </view>
          </view>
        </view>
      </view>

      <view class="ledger-section">
        <view class="ledger-head">
          <view class="ledger-title">
            <StitchIcon name="monitoring" size="37rpx" />
            <text>资金流水记录</text>
          </view>
          <view class="filter-btn" hover-class="tap-press" @click="cycleLedgerFilter">
            <text>{{ ledgerFilterLabel }}</text>
            <StitchIcon name="filter_list" size="31rpx" />
          </view>
        </view>

        <view class="ledger-list">
          <view
            v-for="row in ledgerRows"
            :key="row.id"
            :class="['ledger-row', row.orderId ? 'linkable' : '']"
            hover-class="tap-press"
            @click="openLedgerRow(row)"
          >
            <view :class="['row-icon', row.tone]">
              <StitchIcon :name="row.icon" size="33rpx" />
            </view>
            <view class="row-main">
              <text class="row-title">{{ row.title }}</text>
              <text v-if="row.orderCode" class="row-order">订单 {{ row.orderCode }}</text>
              <text class="row-time">{{ row.time }}</text>
            </view>
            <view class="row-meta">
              <text :class="['row-amount', row.tone]">{{ row.amount }}</text>
              <text :class="['row-status', row.statusTone]">{{ row.status }}</text>
              <StitchIcon v-if="row.orderId" class="row-link-icon" name="chevron_right" size="27rpx" />
            </view>
          </view>
        </view>

        <view v-if="!ledgerRows.length" class="load-more">
          <text>暂无流水记录</text>
        </view>
        <view v-else class="load-more" hover-class="tap-press" @click="loadMore">
          <text>{{ ledgerLimit < filteredLedger.length ? '加载更多记录' : '已显示全部记录' }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" hover-class="tap-press" @click="goHome">
        <StitchIcon name="grid_view" size="39rpx" />
        <text>首页</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goTasks">
        <StitchIcon name="assignment" size="40rpx" />
        <text>任务</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goAssets">
        <StitchIcon name="account_balance_wallet" size="41rpx" fill />
        <text>资产</text>
      </view>
      <view class="nav-item active" hover-class="tap-press" @click="showFeedback('当前：钱包')">
        <StitchIcon name="account_balance" size="42rpx" fill />
        <text>钱包</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="39rpx" fill />
        <text>我的</text>
      </view>
    </view>

    <view v-if="showWithdrawSheet" class="sheet-mask" @click="closeWithdraw">
      <view class="withdraw-sheet" @click.stop>
        <view class="sheet-head">
          <view>
            <text class="sheet-title">申请提现</text>
            <text class="sheet-desc">确认后将当前可提现余额生成提现流水。</text>
          </view>
          <view class="sheet-close" hover-class="tap-press" @click="closeWithdraw">×</view>
        </view>

        <view class="withdraw-summary">
          <text>当前可提</text>
          <text>¥{{ formatMoney(balanceCent) }}</text>
        </view>

        <view class="sheet-actions">
          <view class="sheet-secondary" hover-class="tap-press" @click="closeWithdraw">取消</view>
          <view class="sheet-primary" hover-class="tap-press" @click="confirmWithdraw">确认提现</view>
        </view>
      </view>
    </view>

    <view v-if="showReleaseSheet" class="sheet-mask" @click="closeRelease">
      <view class="withdraw-sheet" @click.stop>
        <view class="sheet-head">
          <view>
            <text class="sheet-title">模拟 T+7 到期</text>
            <text class="sheet-desc">演示环境将把待结算金额释放至可提现余额。</text>
          </view>
          <view class="sheet-close" hover-class="tap-press" @click="closeRelease">×</view>
        </view>

        <view class="withdraw-summary">
          <text>待释放金额</text>
          <text>¥{{ formatMoney(pendingCent) }}</text>
        </view>

        <view class="sheet-actions">
          <view class="sheet-secondary" hover-class="tap-press" @click="closeRelease">取消</view>
          <view class="sheet-primary" hover-class="tap-press" @click="confirmRelease">确认释放</view>
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
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';
import { releasePending, walletWithdraw } from '@/utils/wallet';

interface LedgerViewRow {
  id: string;
  title: string;
  time: string;
  amount: string;
  status: string;
  orderId: string;
  orderCode: string;
  icon: string;
  tone: 'success' | 'warning' | 'neutral';
  statusTone: 'success' | 'muted';
}

const showWithdrawSheet = ref(false);
const showReleaseSheet = ref(false);
const ledgerLimit = ref(6);
const ledgerFilter = ref<'all' | 'in' | 'out' | 'pending'>('all');
const userStore = useUserStore();
const productionRuntime = isProductionBackendRequired();

ensureRole(Role.Owner);

const user = computed(() => userStore.user);
const wallet = computed(() => repo.wallets.find(user.value.id));
const ledger = computed(() => repo.ledger.where((item) => item.userId === user.value.id).reverse());
const balanceCent = computed(() => wallet.value?.balanceCent ?? 0);
const pendingCent = computed(() => wallet.value?.pendingCent ?? 0);
const displayBalanceCent = computed(() => balanceCent.value);
const displayPendingCent = computed(() => pendingCent.value);
const filteredLedger = computed(() => ledger.value.filter((item) => {
  if (ledgerFilter.value === 'in') return item.amountCent > 0 && item.status !== LedgerStatus.Pending;
  if (ledgerFilter.value === 'out') return item.amountCent < 0;
  if (ledgerFilter.value === 'pending') return item.status === LedgerStatus.Pending;
  return true;
}));
const ledgerRows = computed(() => filteredLedger.value.slice(0, ledgerLimit.value).map(toLedgerViewRow));
const ledgerFilterLabel = computed(() => ({ all: '筛选', in: '只看入账', out: '只看支出', pending: '只看待结算' })[ledgerFilter.value]);

function formatMoney(amountCent: number) {
  return (amountCent / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSigned(amountCent: number) {
  const sign = amountCent > 0 ? '+ ' : amountCent < 0 ? '- ' : '';
  return `${sign}¥${formatMoney(Math.abs(amountCent))}`;
}

function toLedgerViewRow(item: LedgerEntry): LedgerViewRow {
  const isPending = item.status === LedgerStatus.Pending;
  const isWithdraw = item.type === LedgerType.Withdraw;
  const tone: LedgerViewRow['tone'] = isPending ? 'warning' : isWithdraw ? 'neutral' : 'success';
  const statusTone: LedgerViewRow['statusTone'] = item.status === LedgerStatus.Paid ? 'success' : 'muted';
  return {
    id: item.id,
    title: item.note || ledgerTypeLabel(item.type),
    time: formatDateTime(item.createdAt),
    amount: formatSigned(item.amountCent),
    status: isPending ? `${item.cycle} 冻结中` : item.status === LedgerStatus.Paid ? '提现成功' : '已到账',
    orderId: item.orderId ?? '',
    orderCode: item.orderId?.toUpperCase() ?? '',
    icon: isPending ? 'hourglass_empty' : item.amountCent < 0 ? 'arrow_upward' : 'arrow_downward',
    tone,
    statusTone,
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function showFeedback(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function openLedgerRow(row: LedgerViewRow) {
  if (!row.orderId) {
    showFeedback(`${row.title}：${row.status}`);
    return;
  }
  uni.navigateTo({ url: `/pages-owner/mission/index?orderId=${encodeURIComponent(row.orderId)}` });
}

function openWithdraw() {
  if (productionRuntime) {
    showFeedback('提现服务尚未接入生产后端');
    return;
  }
  if (balanceCent.value <= 0) {
    showFeedback('暂无可提现余额');
    return;
  }
  showWithdrawSheet.value = true;
}

function closeWithdraw() {
  showWithdrawSheet.value = false;
}

function confirmWithdraw() {
  try {
    walletWithdraw(user.value.id, balanceCent.value);
    closeWithdraw();
    uni.showToast({ title: '提现成功', icon: 'success' });
  } catch (e) {
    showFeedback(e instanceof Error ? e.message : '提现失败');
  }
}

function openBill() {
  ledgerFilter.value = 'all';
  ledgerLimit.value = ledger.value.length || 6;
  showFeedback(`共 ${ledger.value.length} 条账单记录`);
}

function cycleLedgerFilter() {
  const order: Array<typeof ledgerFilter.value> = ['all', 'in', 'out', 'pending'];
  ledgerFilter.value = order[(order.indexOf(ledgerFilter.value) + 1) % order.length];
  ledgerLimit.value = 6;
}

function loadMore() {
  if (ledgerLimit.value < filteredLedger.value.length) {
    ledgerLimit.value += 6;
    return;
  }
  showFeedback('已显示全部记录');
}

function release() {
  if (productionRuntime) {
    showFeedback('结算释放由服务端任务执行，当前尚未接入');
    return;
  }
  if (pendingCent.value <= 0) {
    showFeedback('暂无待结算金额');
    return;
  }
  showReleaseSheet.value = true;
}

function closeRelease() {
  showReleaseSheet.value = false;
}

function confirmRelease() {
  if (productionRuntime) {
    showFeedback('生产环境禁止本地释放结算');
    return;
  }
  releasePending(user.value.id);
  closeRelease();
  uni.showToast({ title: '待结算已释放', icon: 'success' });
}

function goHome() {
  uni.reLaunch({ url: '/pages-owner/home/index' });
}

function goTasks() {
  uni.navigateTo({ url: '/pages-owner/dispatch/index' });
}

function goAssets() {
  uni.navigateTo({ url: '/pages-owner/devices/index' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/index' });
}
</script>

<style lang="scss" scoped>
.wallet-page {
  min-height: 100vh;
  padding-bottom: 176rpx;
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
  z-index: 50;
  height: 123rpx;
  padding: 0 31rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap,
.signal-button,
.pending-label,
.ledger-title,
.filter-btn,
.nav-item,
.sheet-head,
.withdraw-summary,
.sheet-actions {
  display: flex;
  align-items: center;
}

.brand-wrap {
  gap: 31rpx;
}

.avatar-button {
  width: 62rpx;
  height: 62rpx;
  border-radius: 23rpx;
  border: 2rpx solid #3a494b;
  background: #313540;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 48rpx;
  line-height: 62rpx;
  font-weight: 800;
  color: #00f2ff;
  letter-spacing: 0;
}

.signal-button {
  width: 62rpx;
  height: 62rpx;
  justify-content: center;
  color: #e1fdff;
}

.content {
  padding: 154rpx 31rpx 0;
  box-sizing: border-box;
}

.balance-card,
.pending-card,
.ledger-row {
  border: 2rpx solid rgba(132, 148, 149, .42);
  background: rgba(30, 36, 51, .6);
}

.balance-card {
  position: relative;
  min-height: 415rpx;
  padding: 48rpx 44rpx 31rpx;
  border-radius: 15rpx;
  overflow: hidden;
  box-shadow: 0 0 23rpx rgba(0, 242, 255, .15);
  box-sizing: border-box;
}

.dot-grid {
  position: absolute;
  inset: 0;
  opacity: .24;
  background-image: radial-gradient(#00f2ff 2rpx, transparent 2rpx);
  background-position: 7rpx 5rpx;
  background-size: 84rpx 84rpx;
  pointer-events: none;
}

.balance-head,
.action-row,
.ledger-row,
.row-meta,
.bottom-nav {
  display: flex;
}

.balance-head {
  position: relative;
  z-index: 1;
  align-items: center;
  justify-content: space-between;
  color: #b9cacb;
}

.balance-head text,
.rule-title,
.filter-btn,
.row-time,
.row-status,
.nav-item text {
  font-family: "JetBrains Mono", monospace;
  letter-spacing: .1em;
  font-weight: 700;
}

.balance-head text {
  font-size: 21rpx;
  line-height: 31rpx;
}

.balance-head .stitch-icon {
  color: #00f2ff;
}

.balance-value {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 40rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 92rpx;
  line-height: 92rpx;
  font-weight: 800;
  color: #00f2ff;
  letter-spacing: 0;
}

.action-row {
  position: relative;
  z-index: 1;
  gap: 35rpx;
  margin-top: 42rpx;
}

.withdraw-btn,
.bill-btn {
  height: 92rpx;
  border-radius: 8rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 33rpx;
  line-height: 39rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 23rpx;
}

.withdraw-btn {
  flex: 1;
  color: #002022;
  background: #00f2ff;
}

.bill-btn {
  width: 300rpx;
  border: 3rpx solid #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, .04);
  box-sizing: border-box;
}

.pending-card {
  margin-top: 39rpx;
  min-height: 381rpx;
  padding: 48rpx 44rpx 44rpx;
  border-radius: 15rpx;
  box-sizing: border-box;
}

.pending-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pending-label {
  gap: 19rpx;
  color: #b9cacb;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 27rpx;
  line-height: 36rpx;
  font-weight: 800;
}

.warning-dot {
  width: 15rpx;
  height: 15rpx;
  border-radius: 999rpx;
  background: #b17b11;
}

.pending-head .stitch-icon {
  color: #f59e0b;
}

.pending-value {
  display: block;
  margin-top: 27rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 56rpx;
  line-height: 62rpx;
  font-weight: 800;
  color: #f59e0b;
  letter-spacing: 0;
}

.rule-panel {
  margin-top: 25rpx;
  padding-top: 32rpx;
  border-top: 2rpx solid #3a494b;
}

.rule-title {
  display: block;
  color: #b9cacb;
  font-size: 21rpx;
  line-height: 31rpx;
}

.rule-row {
  display: flex;
  align-items: center;
  gap: 27rpx;
  margin-top: 29rpx;
}

.rule-badge {
  width: 92rpx;
  height: 73rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #313540;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rule-badge text {
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 31rpx;
  line-height: 38rpx;
  font-weight: 800;
}

.rule-copy {
  flex: 1;
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 34rpx;
  font-weight: 700;
}

.release-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 29rpx;
}

.release-btn {
  height: 73rpx;
  padding: 0 25rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(245, 158, 11, .75);
  background: rgba(245, 158, 11, .12);
  color: #f8c66a;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 27rpx;
  line-height: 34rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15rpx;
  box-sizing: border-box;
}

.ledger-section {
  margin-top: 49rpx;
}

.ledger-head {
  padding-bottom: 25rpx;
  border-bottom: 2rpx solid #3a494b;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ledger-title {
  gap: 26rpx;
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 42rpx;
  line-height: 52rpx;
  font-weight: 800;
}

.ledger-title .stitch-icon {
  visibility: hidden;
}

.filter-btn {
  color: #00f2ff;
}

.filter-btn {
  gap: 10rpx;
  font-size: 21rpx;
  line-height: 31rpx;
}

.ledger-list {
  display: flex;
  flex-direction: column;
  gap: 23rpx;
  margin-top: 31rpx;
}

.ledger-row {
  min-height: 154rpx;
  padding: 25rpx 31rpx;
  border-radius: 8rpx;
  align-items: center;
  justify-content: space-between;
  gap: 17rpx;
  background: #1e2433;
  box-sizing: border-box;
}

.ledger-row.linkable {
  border-color: rgba(0, 242, 255, .34);
}

.row-icon {
  width: 73rpx;
  height: 73rpx;
  border-radius: 23rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.row-icon.success {
  border: 2rpx solid rgba(16, 185, 129, .45);
  color: #10b981;
  background: rgba(16, 185, 129, .1);
}

.row-icon.warning {
  border: 2rpx solid rgba(245, 158, 11, .45);
  color: #f59e0b;
  background: rgba(245, 158, 11, .1);
}

.row-icon.neutral {
  border: 2rpx solid rgba(132, 148, 149, .42);
  color: #dfe2f0;
  background: #313540;
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-title,
.row-order,
.row-time,
.row-amount,
.row-status {
  display: block;
}

.row-title {
  color: #dfe2f0;
  font-size: 28rpx;
  line-height: 37rpx;
  font-weight: 800;
}

.row-time {
  margin-top: 17rpx;
  color: #b9cacb;
  font-size: 21rpx;
  line-height: 31rpx;
}

.row-order {
  margin-top: 9rpx;
  color: #00f2ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 20rpx;
  line-height: 28rpx;
  font-weight: 800;
  letter-spacing: 0;
  @include ellipsis(1);
}

.row-meta {
  width: 174rpx;
  min-height: 91rpx;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  flex-shrink: 0;
}

.row-amount {
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 31rpx;
  line-height: 38rpx;
  font-weight: 800;
  text-align: right;
  white-space: nowrap;
  letter-spacing: 0;
}

.row-amount.success {
  color: #10b981;
}

.row-amount.warning {
  color: #f59e0b;
}

.row-amount.neutral {
  color: #dfe2f0;
}

.row-status {
  margin-top: 17rpx;
  font-size: 21rpx;
  line-height: 31rpx;
  text-align: right;
  white-space: nowrap;
}

.row-status.success {
  color: #10b981;
}

.row-status.muted {
  color: #b9cacb;
}

.row-link-icon {
  margin-top: 8rpx;
  color: #00f2ff;
}

.load-more {
  height: 81rpx;
  margin-top: 42rpx;
  border: 3rpx dashed #3a494b;
  border-radius: 8rpx;
  color: #00f2ff;
  font-size: 25rpx;
  line-height: 34rpx;
  font-weight: 800;
  letter-spacing: .1em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  height: 138rpx;
  padding: 13rpx 15rpx 31rpx;
  border: 2rpx solid #3a494b;
  border-bottom: 0;
  border-radius: 15rpx 15rpx 0 0;
  background: #0f131d;
  justify-content: space-around;
  box-sizing: border-box;
}

.nav-item {
  width: 123rpx;
  height: 92rpx;
  border-radius: 46rpx;
  color: #b9cacb;
  flex-direction: column;
  justify-content: center;
  gap: 6rpx;
}

.nav-item.active {
  color: #00f2ff;
  background: rgba(5, 102, 217, .38);
}

.nav-item text {
  font-size: 21rpx;
  line-height: 25rpx;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, .55);
  display: flex;
  align-items: flex-end;
}

.withdraw-sheet {
  width: 100%;
  padding: 36rpx 31rpx calc(42rpx + env(safe-area-inset-bottom));
  border-radius: 24rpx 24rpx 0 0;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
}

.sheet-head {
  justify-content: space-between;
}

.sheet-title,
.sheet-desc {
  display: block;
}

.sheet-title {
  color: #dfe2f0;
  font-size: 34rpx;
  line-height: 42rpx;
  font-weight: 800;
}

.sheet-desc {
  margin-top: 8rpx;
  color: #b9cacb;
  font-size: 25rpx;
  line-height: 34rpx;
}

.sheet-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 999rpx;
  color: #dfe2f0;
  background: #1e2433;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
  line-height: 50rpx;
}

.withdraw-summary {
  justify-content: space-between;
  margin-top: 31rpx;
  padding: 25rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  color: #dfe2f0;
  font-size: 29rpx;
  font-weight: 700;
}

.sheet-actions {
  gap: 19rpx;
  margin-top: 31rpx;
}

.sheet-primary,
.sheet-secondary {
  flex: 1;
  height: 84rpx;
  border-radius: 8rpx;
  font-size: 29rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sheet-primary {
  background: #00f2ff;
  color: #002022;
}

.sheet-secondary {
  border: 2rpx solid #3b82f6;
  color: #3b82f6;
}

.tap-press {
  opacity: .78;
  transform: scale(.985);
}
</style>
