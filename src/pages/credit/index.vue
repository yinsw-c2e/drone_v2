<template>
  <view class="credit-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="avatar-button" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="44rpx" fill />
      </view>
      <text class="brand">{{ copy.brand }}</text>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showSignal">
          <StitchIcon name="signal_cellular_alt" size="47rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="radar-panel">
        <view class="radar-grid" />
        <view class="radar-backdrop">
          <image class="radar-image" src="/static/stitch/credit-radar-bg.jpg" mode="aspectFill" />
        </view>
        <text class="trust-label">{{ copy.trustLabel }}</text>
        <view class="score-box" hover-class="tap-press" @click="showScoreDetail">
          <view class="score-dash" />
          <text class="score-label">{{ copy.scoreLabel }}</text>
          <text class="score">{{ displayScore }}</text>
          <text class="score-tag">{{ scoreState }}</text>
        </view>
      </view>

      <view class="dimension-list">
        <view
          v-for="item in dimensionCards"
          :key="item.key"
          class="dimension-card"
          hover-class="tap-press"
          @click="showDimension(item)"
        >
          <view class="dimension-head">
            <view class="dimension-title">
              <StitchIcon :name="item.icon" size="34rpx" />
              <text>{{ item.label }}</text>
            </view>
            <text class="dimension-value">{{ item.percent }}%</text>
          </view>
          <view class="dimension-bar">
            <view class="dimension-fill" :style="{ width: `${item.percent}%` }" />
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" hover-class="tap-press" @click="goHome">
        <StitchIcon name="grid_view" size="41rpx" />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goTasks">
        <StitchIcon name="assignment" size="42rpx" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item active">
        <StitchIcon name="account_balance_wallet" size="43rpx" fill />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goWallet">
        <StitchIcon name="account_balance" size="44rpx" />
        <text>{{ copy.wallet }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="41rpx" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { Role } from '@/models';
import { ensureDemoCredit, roleHome } from '@/services/app-flow';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

interface DimensionCard {
  key: string;
  label: string;
  icon: string;
  percent: number;
}

ensureDemoCredit();

const userStore = useUserStore();
const localeStore = useLocaleStore();
const user = computed(() => userStore.user);
const role = computed(() => user.value.currentRole);
const credit = computed(() => repo.credits.find(user.value.id));
const displayScore = computed(() => credit.value?.total ?? 0);

const CREDIT_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    trustLabel: 'SYSTEM TRUST LEVEL',
    scoreLabel: 'CREDIT SCORE',
    optimal: 'OPTIMAL',
    stable: 'STABLE',
    watch: 'WATCH',
    identity: 'Identity',
    payment: 'Payment',
    attitude: 'Attitude',
    quality: 'Quality',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    wallet: 'Wallet',
    profile: 'Profile',
    signalToast: 'Link signal nominal',
    scoreToastPrefix: 'Credit score',
    walletToast: 'Wallet is available for pilot and owner roles',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    trustLabel: '系统信任等级',
    scoreLabel: '信用评分',
    optimal: '优良',
    stable: '稳定',
    watch: '关注',
    identity: '身份认证',
    payment: '支付能力',
    attitude: '合作态度',
    quality: '订单质量',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    wallet: '钱包',
    profile: '我的',
    signalToast: '链路信号正常',
    scoreToastPrefix: '信用分',
    walletToast: '钱包入口适用于飞手和机主角色',
    languageToast: '已切换为中文',
  },
} as const;

const copy = computed(() => CREDIT_COPY[localeStore.locale]);
const scoreState = computed(() => (displayScore.value >= 850 ? copy.value.optimal : displayScore.value >= 700 ? copy.value.stable : copy.value.watch));

// 维度名来自 utils/credit 的真实计算结果（按角色不同），这里只做图标与英文映射
const DIMENSION_ICONS: Record<string, string> = {
  基础资质: 'verified_user',
  身份认证: 'verified_user',
  设备合规: 'verified_user',
  服务质量: 'star_rate',
  订单质量: 'star_rate',
  安全记录: 'shield',
  活跃度: 'trending_up',
  支付能力: 'payments',
  合作态度: 'handshake',
  履约能力: 'task_alt',
};

const DIMENSION_EN: Record<string, string> = {
  基础资质: 'Qualification',
  身份认证: 'Identity',
  设备合规: 'Compliance',
  服务质量: 'Service',
  订单质量: 'Quality',
  安全记录: 'Safety',
  活跃度: 'Activity',
  支付能力: 'Payment',
  合作态度: 'Attitude',
  履约能力: 'Fulfillment',
};

const dimensionCards = computed<DimensionCard[]>(() => (credit.value?.dimensions ?? []).map((dim) => ({
  key: dim.name,
  label: localeStore.isZh ? dim.name : (DIMENSION_EN[dim.name] ?? dim.name),
  icon: DIMENSION_ICONS[dim.name] ?? 'verified_user',
  percent: dim.max ? Math.round((dim.score / dim.max) * 100) : 0,
})));

function showScoreDetail() {
  uni.showToast({ title: `${copy.value.scoreToastPrefix} ${displayScore.value} · ${scoreState.value}`, icon: 'none' });
}

function showDimension(item: DimensionCard) {
  uni.showToast({ title: `${item.label}: ${item.percent}%`, icon: 'none' });
}

function showSignal() {
  uni.showToast({ title: copy.value.signalToast, icon: 'none' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  uni.showToast({ title: copy.value.languageToast, icon: 'none' });
}

function goHome() {
  uni.reLaunch({ url: roleHome(role.value) });
}

function goTasks() {
  const url = role.value === Role.Pilot
    ? '/pages-pilot/hall/index'
    : role.value === Role.Owner
      ? '/pages-owner/dispatch/index'
      : '/pages-client/order/index';
  uni.navigateTo({ url });
}

function goWallet() {
  if (role.value === Role.Pilot) {
    uni.navigateTo({ url: '/pages-pilot/wallet/index' });
    return;
  }
  if (role.value === Role.Owner) {
    uni.navigateTo({ url: '/pages-owner/wallet/index' });
    return;
  }
  uni.showToast({ title: copy.value.walletToast, icon: 'none' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/auth/index' });
}
</script>

<style lang="scss" scoped>
.credit-page {
  min-height: 100vh;
  padding-bottom: 164rpx;
  box-sizing: border-box;
  color: $ink-900;
  background: $bg-page;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 60;
  height: 136rpx;
  padding: 0 31rpx;
  background: $bg-page;
  display: grid;
  grid-template-columns: 64rpx minmax(0, 1fr) auto;
  align-items: center;
  gap: 16rpx;
  box-sizing: border-box;
}

.avatar-button {
  width: 59rpx;
  height: 59rpx;
  border-radius: 21rpx;
  background: $surface-raised;
  color: $blue-50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  min-width: 0;
  color: $color-primary;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 45rpx;
  line-height: 60rpx;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-actions {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 12rpx;
}

.language-switch {
  min-width: 86rpx;
  height: 58rpx;
  padding: 0 16rpx;
  border: 2rpx solid $line-strong;
  border-radius: 10rpx;
  background: rgba(49, 53, 64, .72);
  color: $color-primary;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 22rpx;
  line-height: 44rpx;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.signal-button {
  width: 64rpx;
  height: 64rpx;
  color: $blue-50;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .score,
.zh-copy .dimension-title {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
}

.zh-copy .brand {
  font-size: 46rpx;
}

.zh-copy .trust-label,
.zh-copy .score-label,
.zh-copy .score-tag,
.zh-copy .nav-item,
.zh-copy .language-switch {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .trust-label,
.zh-copy .score-label {
  font-size: 26rpx;
}

.content {
  padding: 167rpx 31rpx 0;
  box-sizing: border-box;
}

.radar-panel {
  position: relative;
  height: 559rpx;
  border-radius: 13rpx;
  border: 2rpx solid rgba(58, 73, 75, .75);
  background: $surface-panel;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.radar-backdrop,
.radar-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.radar-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(11, 14, 20, .18), $bg-page 92%);
}

.radar-image {
  width: 100%;
  height: 100%;
  opacity: .72;
}

.radar-grid {
  z-index: 2;
  background:
    linear-gradient(rgba(0, 242, 255, .055) 2rpx, transparent 2rpx),
    linear-gradient(90deg, rgba(0, 242, 255, .055) 2rpx, transparent 2rpx);
  background-size: 38rpx 38rpx;
}

.trust-label {
  position: relative;
  z-index: 4;
  margin-top: 50rpx;
  color: $ink-900;
  font-family: "JetBrains Mono", monospace;
  font-size: 24rpx;
  line-height: 34rpx;
  letter-spacing: 5rpx;
  font-weight: 700;
  white-space: nowrap;
}

.score-box {
  position: relative;
  z-index: 5;
  width: 369rpx;
  height: 369rpx;
  margin-top: 59rpx;
  border-radius: 26rpx;
  border: 2rpx solid $color-primary-press;
  background: rgba(11, 14, 20, .82);
  box-shadow: 0 0 38rpx rgba(0, 242, 255, .38);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.score-dash {
  position: absolute;
  inset: 17rpx;
  border-radius: 20rpx;
  border: 5rpx dashed rgba(0, 242, 255, .42);
}

.score-label,
.score-tag {
  position: relative;
  z-index: 1;
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 5rpx;
  font-weight: 700;
  white-space: nowrap;
}

.score-label {
  color: $color-primary;
  font-size: 24rpx;
  line-height: 34rpx;
}

.score {
  position: relative;
  z-index: 1;
  margin-top: 18rpx;
  color: $blue-50;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 128rpx;
  line-height: 128rpx;
  font-weight: 700;
}

.score-tag {
  margin-top: 12rpx;
  padding: 6rpx 19rpx;
  border-radius: 2rpx;
  color: $success;
  background: rgba(16, 185, 129, .25);
  font-size: 19rpx;
  line-height: 26rpx;
  letter-spacing: 2rpx;
}

.dimension-list {
  margin-top: 31rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 30rpx;
}

.dimension-card {
  min-height: 126rpx;
  padding: 31rpx 29rpx 28rpx;
  border-radius: 13rpx;
  border: 2rpx solid rgba(58, 73, 75, .82);
  background: $bg-card;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
}

.dimension-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.dimension-title {
  min-width: 0;
  color: $ink-900;
  display: flex;
  align-items: center;
  gap: 24rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 700;
}

.dimension-title .stitch-icon {
  flex: 0 0 auto;
  color: $color-primary;
}

.dimension-title text {
  min-width: 0;
  white-space: nowrap;
}

.dimension-value {
  color: $color-primary;
  font-family: "JetBrains Mono", monospace;
  font-size: 30rpx;
  line-height: 40rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
  white-space: nowrap;
}

.dimension-bar {
  height: 7rpx;
  margin-top: 29rpx;
  border-radius: 999rpx;
  background: $surface-raised;
  overflow: hidden;
}

.dimension-fill {
  height: 100%;
  border-radius: inherit;
  background: $color-primary;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  height: 137rpx;
  padding: 16rpx 20rpx calc(15rpx + env(safe-area-inset-bottom));
  background: $bg-sunken;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  box-sizing: border-box;
}

.nav-item {
  min-width: 0;
  height: 92rpx;
  border-radius: 23rpx;
  color: $ink-700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-family: "JetBrains Mono", monospace;
}

.nav-item.active {
  color: $color-primary;
  background: rgba(5, 102, 217, .45);
}

.nav-item text {
  font-size: 18rpx;
  line-height: 28rpx;
  letter-spacing: 4rpx;
  font-weight: 700;
}

.tap-press {
  opacity: .72;
  transform: scale(.985);
}

@media (min-width: 900px) {
  .content {
    max-width: 720rpx;
    margin: 0 auto;
  }
}
</style>
