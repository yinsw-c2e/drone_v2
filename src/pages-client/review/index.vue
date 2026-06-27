<template>
  <view class="review-page">
    <view class="topbar">
      <view class="back-button" hover-class="tap-press" @click="back">
        <StitchIcon name="chevron_left" size="42rpx" />
      </view>
      <text class="topbar-title">评价结算</text>
      <view class="topbar-spacer" />
    </view>

    <view class="content">
      <view class="intro-block">
        <view class="intro-head">
          <text class="intro-title">确认分账与服务评价</text>
          <text class="role-chip">业主</text>
        </view>
        <text class="intro-desc">确认分账结果后提交服务评价，信用分会实时重算。</text>
      </view>

      <view class="settlement-card">
        <view class="corner-glow" />
        <view class="card-body">
          <view class="card-title-row">
            <view class="card-icon cyan">
              <StitchIcon name="account_balance_wallet" size="30rpx" />
            </view>
            <text class="card-title">结算分账</text>
          </view>
          <text class="card-desc">平台、飞手、机主、保险与税费来自 SETTLEMENT 计算。</text>

          <view :class="['settled-chip', settled ? '' : 'pending']">
            <StitchIcon :name="settled ? 'check_circle' : 'schedule'" size="28rpx" />
            <text>{{ settled ? '已结算' : '待结算（预估分账）' }}</text>
          </view>

          <view class="settlement-list">
            <view v-for="item in settlementRows" :key="item.party" class="settlement-row">
              <view class="row-name">
                <text>{{ partyLabel(item.party) }}</text>
                <text class="dot">·</text>
                <text>{{ item.cycle }}</text>
              </view>
              <view class="row-money">
                <text class="currency">¥</text>
                <text>{{ formatYuan(item.amountCent) }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="card-tip">
          <StitchIcon :name="settled ? 'check_circle' : 'info'" size="32rpx" />
          <text>{{ settlementTip }}</text>
        </view>
      </view>

      <view class="rating-card">
        <view class="card-title-row">
          <view class="star-title">
            <StitchIcon name="star_rate" size="38rpx" />
          </view>
          <text class="card-title">评价飞手</text>
        </view>
        <text class="card-desc">评价会影响飞手信用分和后续匹配排序。</text>

        <view class="stars">
          <view v-for="n in 5" :key="n" :class="['star-button', star >= n ? 'active' : '']" hover-class="tap-press" @click="setStar(n)">
            <StitchIcon name="star" size="60rpx" fill />
          </view>
        </view>

        <view class="comment-box">
          <textarea v-model="text" class="textarea" maxlength="100" placeholder="请输入评价内容... (选填)" />
          <text class="counter">{{ commentLength }}/100</text>
        </view>

        <text v-if="message" class="message">{{ message }}</text>
      </view>
    </view>

    <view class="bottom-action">
      <view :class="['submit-button', submitted || !canSubmitAction ? 'disabled' : '']" hover-class="tap-press" @click="review">
        <text>{{ submitLabel }}</text>
        <StitchIcon name="send" size="34rpx" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import StitchIcon from '@/components/StitchIcon.vue';
import { OrderStatus, Role } from '@/models';
import { reviewSettlementAction } from '@/services/action-plans';
import { ordersNewestFirst } from '@/services/app-flow';
import { SETTLEMENT_RULES } from '@/stores/config-data';
import { useOrderStore } from '@/stores/order';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const routeOrderId = ref('');

onLoad((query: Record<string, string | undefined> = {}) => {
  const id = query.orderId;
  if (id && repo.orders.find(id)) {
    routeOrderId.value = id;
    orderStore.activeOrderId = id;
  }
});

const order = computed(() => {
  const routeOrder = routeOrderId.value ? repo.orders.find(routeOrderId.value) : undefined;
  if (routeOrder) return routeOrder;
  const active = orderStore.activeOrder;
  if (active?.settlement || active?.status === OrderStatus.Completed || active?.status === OrderStatus.Settled) return active;
  return ordersNewestFirst(repo.orders.all()).find((item) => item.settlement || item.status === OrderStatus.Completed || item.status === OrderStatus.Settled) ?? active;
});
const settled = computed(() => Boolean(order.value?.settlement));
const canReview = computed(() => Boolean(order.value?.pilotId && order.value?.settlement));
const canGenerateSettlement = computed(() => Boolean(order.value?.pilotId && order.value?.status === OrderStatus.Completed && !order.value?.settlement));
const existingReview = computed(() => {
  const current = order.value;
  if (!current?.pilotId) return undefined;
  return repo.reviews.where((review) => review.orderId === current.id && review.byRole === Role.Client && review.targetUserId === current.pilotId)[0];
});
const canSubmitAction = computed(() => (canReview.value || canGenerateSettlement.value) && !submitted.value);
const settlementRows = computed(() => {
  const rows = order.value?.settlement?.items;
  if (rows?.length) return rows;
  // 未结算时按分账规则给出预估，避免展示凭空捏造的金额
  const totalCent = order.value?.priceBreakdown?.totalCent ?? order.value?.budgetCent ?? 0;
  return SETTLEMENT_RULES.map((rule) => ({ party: rule.party, cycle: rule.cycle, amountCent: Math.round(totalCent * rule.ratio) }));
});
const settlementTip = computed(() => reviewSettlementAction(order.value).description);
const star = ref<1 | 2 | 3 | 4 | 5>(5);
const text = ref('准时响应，吊运稳定');
const message = ref('');
const submitted = ref(false);
const commentLength = computed(() => Array.from(text.value.replace(/[，,。.\s]/g, '')).length);
const submitLabel = computed(() => {
  if (submitted.value) return '已提交评价';
  if (!order.value) return '暂无可评价订单';
  if (canGenerateSettlement.value) return '生成结算分账';
  if (!canReview.value) return '待结算后评价';
  return '提交评价';
});

watchEffect(() => {
  const review = existingReview.value;
  if (!review) return;
  submitted.value = true;
  star.value = review.star;
  if (review.text) text.value = review.text;
  message.value = '评价已提交，飞手信用分已重算';
});

function back() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages-client/track/index' }) });
}

async function review() {
  if (submitted.value || !canSubmitAction.value) return;
  try {
    const current = order.value;
    if (!current) {
      uni.showToast({ title: '暂无可评价订单', icon: 'none' });
      return;
    }
    orderStore.activeOrderId = current.id;
    if (!current.pilotId) {
      uni.showToast({ title: '订单尚未确认运力，不能评价', icon: 'none' });
      return;
    }
    if (canGenerateSettlement.value) {
      const next = await orderStore.advance();
      if (next.settlement) {
        message.value = '结算分账已生成，可继续提交评价';
        uni.showToast({ title: '结算已生成', icon: 'success' });
        return;
      }
    }
    if (!current.settlement) {
      uni.showToast({ title: '订单尚未结算，不能评价', icon: 'none' });
      return;
    }
    await orderStore.reviewWithBackend(star.value, text.value);
    submitted.value = true;
    uni.showToast({ title: '评价已提交，信用分已更新', icon: 'success' });
    message.value = '评价已提交，飞手信用分已重算';
    leaveAfterReview();
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '提交失败，请稍后重试', icon: 'none' });
  }
}

function leaveAfterReview() {
  setTimeout(() => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    if (pages.length > 1) {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages-client/home/index' }) });
      return;
    }
    uni.reLaunch({ url: '/pages-client/home/index' });
  }, 900);
}

function setStar(value: number) {
  star.value = Math.min(5, Math.max(1, value)) as 1 | 2 | 3 | 4 | 5;
}

function partyLabel(party: string) {
  const map: Record<string, string> = { platform: '平台', pilot: '飞手', owner: '机主', insurance: '保险', tax: '税费' };
  return map[party] ?? party;
}

function formatYuan(amountCent: number) {
  return (amountCent / 100).toFixed(2);
}
</script>

<style lang="scss" scoped>
.review-page {
  min-height: 100vh;
  color: #dfe2f0;
  background:
    linear-gradient(to right, rgba(58, 73, 75, .12) 2rpx, transparent 2rpx),
    linear-gradient(to bottom, rgba(58, 73, 75, .12) 2rpx, transparent 2rpx),
    #0b0e14;
  background-size: 33rpx 33rpx;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 202rpx;
  box-sizing: border-box;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 50;
  height: 122rpx;
  padding: 0 32rpx;
  border-bottom: 2rpx solid #3a494b;
  background: rgba(11, 14, 20, .94);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.back-button,
.topbar-spacer {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-button {
  color: #dfe2f0;
}

.topbar-title {
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 35rpx;
  line-height: 44rpx;
  font-weight: 800;
}

.content {
  padding: 166rpx 32rpx 0;
}

.intro-block {
  position: relative;
  padding-left: 40rpx;
  margin-bottom: 60rpx;
}

.intro-block::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 7rpx;
  height: 117rpx;
  background: #00f2ff;
}

.intro-head {
  min-height: 50rpx;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.intro-title {
  flex: 1;
  color: #f4f6ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 42rpx;
  line-height: 53rpx;
  font-weight: 800;
}

.role-chip {
  flex: 0 0 auto;
  margin-top: 8rpx;
  padding: 8rpx 18rpx;
  color: #d8e2ff;
  font-size: 22rpx;
  line-height: 31rpx;
  font-weight: 800;
  border: 2rpx solid rgba(5, 102, 217, .72);
  border-radius: 3rpx;
  background: rgba(5, 102, 217, .2);
}

.intro-desc {
  display: block;
  margin-top: 18rpx;
  color: #d6dbeb;
  font-size: 26rpx;
  line-height: 39rpx;
  font-weight: 600;
}

.settlement-card,
.rating-card {
  position: relative;
  overflow: hidden;
  border-radius: 12rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
}

.settlement-card {
  margin-bottom: 48rpx;
}

.corner-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(225deg, rgba(0, 242, 255, .08), transparent 68%);
}

.card-body {
  position: relative;
  z-index: 1;
  padding: 44rpx 40rpx 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.card-icon,
.star-title {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon {
  width: 32rpx;
  height: 32rpx;
  color: #00f2ff;
}

.star-title {
  width: 40rpx;
  color: #f59e0b;
  filter: drop-shadow(0 0 8rpx rgba(245, 158, 11, .38));
}

.card-title {
  color: #f3f6ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 35rpx;
  line-height: 45rpx;
  font-weight: 800;
}

.card-desc {
  display: block;
  margin-top: 12rpx;
  color: #d4dae8;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 23rpx;
  line-height: 36rpx;
  font-weight: 800;
}

.settled-chip {
  width: max-content;
  margin-top: 38rpx;
  padding: 12rpx 22rpx;
  border: 2rpx solid rgba(16, 185, 129, .34);
  border-radius: 3rpx;
  background: rgba(16, 185, 129, .1);
  box-shadow: 0 0 12rpx rgba(16, 185, 129, .16);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 800;
}

.settled-chip.pending {
  border-color: rgba(245, 158, 11, .34);
  background: rgba(245, 158, 11, .1);
  box-shadow: 0 0 12rpx rgba(245, 158, 11, .16);
  color: #f59e0b;
}

.settlement-list {
  margin-top: 28rpx;
}

.settlement-row {
  min-height: 94rpx;
  border-bottom: 2rpx dashed rgba(58, 73, 75, .62);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.settlement-row:last-child {
  border-bottom: 0;
}

.row-name {
  color: #f0f3ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 26rpx;
  line-height: 39rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.dot {
  color: #b9cacb;
}

.row-money {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 29rpx;
  line-height: 39rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 9rpx;
}

.currency {
  color: #526165;
  font-weight: 600;
}

.card-tip {
  min-height: 101rpx;
  padding: 0 40rpx;
  border-top: 2rpx solid rgba(16, 185, 129, .13);
  background: rgba(16, 185, 129, .06);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 14rpx;
  font-size: 27rpx;
  line-height: 39rpx;
  font-weight: 800;
}

.rating-card {
  padding: 46rpx 40rpx 40rpx;
}

.stars {
  margin-top: 38rpx;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 22rpx;
}

.star-button {
  aspect-ratio: 1 / 1;
  min-width: 0;
  border-radius: 7rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  color: #8a949d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-button.active {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, .22);
  filter: drop-shadow(0 0 9rpx rgba(245, 158, 11, .36));
}

.comment-box {
  position: relative;
  margin-top: 48rpx;
  border-radius: 7rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
}

.textarea {
  width: 100%;
  height: 215rpx;
  padding: 34rpx 34rpx 56rpx;
  color: #f0f3ff;
  background: transparent;
  border: 0;
  font-size: 28rpx;
  line-height: 42rpx;
  font-weight: 700;
  box-sizing: border-box;
}

.counter {
  position: absolute;
  right: 28rpx;
  bottom: 22rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 26rpx;
  line-height: 35rpx;
  font-weight: 800;
}

.message {
  display: block;
  margin-top: 22rpx;
  color: #10b981;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 700;
}

.bottom-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 32rpx 32rpx 30rpx;
  border-top: 2rpx solid #3a494b;
  background: rgba(20, 24, 34, .94);
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, .48);
  box-sizing: border-box;
}

.submit-button {
  height: 108rpx;
  border-radius: 8rpx;
  background: #00f2ff;
  box-shadow: 0 0 22rpx rgba(0, 242, 255, .42);
  color: #002022;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 32rpx;
  line-height: 42rpx;
  font-weight: 900;
}

.submit-button.disabled {
  opacity: .72;
}
</style>
