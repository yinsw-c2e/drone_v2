<template>
  <view class="launch-page">
    <view class="hero-gradient" />
    <view class="radar-field">
      <view class="radar-ring ring-1" />
      <view class="radar-ring ring-2" />
      <view class="radar-ring ring-3" />
    </view>

    <view class="launch-main">
      <view class="top-row">
        <view class="brand-wrap">
          <view class="brand-mark">
            <StitchIcon name="flight_takeoff" size="49rpx" fill />
          </view>
          <view class="brand-copy">
            <text class="brand-title">低空指挥中心</text>
            <text class="brand-sub">LOW-ALTITUDE COMMAND CENTER</text>
          </view>
        </view>
        <view class="env-pill">
          <view class="env-dot" />
          <text>演示环境</text>
        </view>
      </view>

      <view class="hero-section">
        <text class="hero-title">选择身份进入系统</text>
        <text class="hero-desc">同一笔订单，贯通业主 · 飞手 · 机主 · 管理后台四端协同</text>
        <view class="stat-row">
          <view v-for="item in stats" :key="item.label" class="stat-item">
            <text class="stat-value">{{ item.value }}</text>
            <text class="stat-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <view class="roles">
        <view
          v-for="item in roles"
          :key="item.key"
          :class="['role-card', item.key]"
          hover-class="role-card--press"
          @click="login(item.role)"
        >
          <view :class="['role-accent', item.key]" />
          <view :class="['role-icon', item.key]">
            <StitchIcon :name="item.icon" :size="item.iconSize" />
          </view>
          <view class="role-main">
            <view class="role-title-row">
              <view class="role-title-wrap">
                <text class="role-title">{{ item.title }}</text>
                <text :class="['role-en', item.key]">{{ item.en }}</text>
              </view>
              <text class="role-phone">{{ item.phone }}</text>
            </view>
            <text class="role-desc">{{ item.desc }}</text>
          </view>
          <view class="role-go">
            <StitchIcon name="chevron_right" size="35rpx" />
          </view>
        </view>
      </view>

      <view class="login-foot">
        <StitchIcon name="lock" size="26rpx" />
        <text>实名、人脸、短信与 CAAC 资质核验将在生产环境接入</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import StitchIcon from '@/components/StitchIcon.vue';
import { Role } from '@/models';
import { roleHome } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';

interface RoleItem {
  role: Role;
  key: 'client' | 'pilot' | 'owner' | 'admin';
  icon: string;
  iconSize: string;
  title: string;
  en: string;
  phone: string;
  desc: string;
}

const userStore = useUserStore();

const stats = [
  { value: '实时', label: '智能撮合' },
  { value: '全链路', label: '飞行可溯' },
  { value: '5 方', label: '分账透明' },
];

const roles: RoleItem[] = [
  { role: Role.Client, key: 'client', icon: 'home', iconSize: '50rpx', title: '业主端', en: 'CLIENT', phone: '13800000001', desc: '发单 · 智能比价 · 全程追踪 · ...' },
  { role: Role.Pilot, key: 'pilot', icon: 'person', iconSize: '50rpx', title: '飞手端', en: 'PILOT', phone: '13800000002', desc: '接单 · 起飞安检 · 飞行监控 · ...' },
  { role: Role.Owner, key: 'owner', icon: 'hexagon', iconSize: '52rpx', title: '机主端', en: 'OWNER', phone: '13800000003', desc: '设备管理 · 运力投放 · T+7 分账' },
  { role: Role.Admin, key: 'admin', icon: 'speed', iconSize: '54rpx', title: '管理后台', en: 'CONSOLE', phone: '后台入口', desc: '认证审核 · 风控 · 订单 · 数据看板' },
];

function login(role: Role) {
  userStore.loginAs(role);
  uni.reLaunch({ url: roleHome(role) });
}
</script>

<style lang="scss" scoped>
.launch-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: $bg-page;
  color: $ink-900;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.hero-gradient,
.radar-field {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.hero-gradient {
  z-index: 0;
  opacity: .40;
  background: linear-gradient(160deg, $info 0%, $bg-page 60%);
}

.radar-field {
  z-index: 0;
  overflow: hidden;
}

.radar-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 9999rpx;
  border: 2rpx solid rgba(0, 242, 255, .08);
  transform: translate(-50%, -50%);
  animation: radarPulse 4s linear infinite;
}

.ring-1 {
  width: 1125rpx;
  height: 1125rpx;
}

.ring-2 {
  width: 750rpx;
  height: 750rpx;
  animation-delay: 1.3s;
}

.ring-3 {
  width: 375rpx;
  height: 375rpx;
  animation-delay: 2.6s;
}

.launch-main {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 123rpx 31rpx 61rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 77rpx;
}

.brand-wrap,
.role-card,
.role-title-row,
.role-title-wrap,
.env-pill,
.login-foot {
  display: flex;
  align-items: center;
}

.brand-wrap {
  gap: 24rpx;
  min-width: 0;
}

.brand-mark {
  width: 77rpx;
  height: 77rpx;
  border-radius: 16rpx;
  background: $info;
  color: $blue-50;
  box-shadow: 0 0 29rpx rgba(59, 130, 246, .50);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.brand-copy {
  min-width: 0;
}

.brand-title,
.brand-sub {
  display: block;
}

.brand-title {
  color: $blue-50;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 35rpx;
  line-height: 42rpx;
  font-weight: 700;
  white-space: nowrap;
}

.brand-sub {
  margin-top: 8rpx;
  color: $ink-700;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 27rpx;
  letter-spacing: 4rpx;
  white-space: nowrap;
}

.env-pill {
  height: 39rpx;
  padding: 0 23rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(58, 73, 75, .50);
  background: rgba(27, 31, 42, .50);
  color: $ink-900;
  font-size: 23rpx;
  line-height: 39rpx;
  gap: 11rpx;
  flex: 0 0 auto;
}

.env-dot {
  width: 15rpx;
  height: 15rpx;
  border-radius: 999rpx;
  background: $success;
  box-shadow: 0 0 15rpx rgba(16, 185, 129, .80);
}

.hero-section {
  width: 100%;
  margin-bottom: 77rpx;
}

.hero-title,
.hero-desc {
  display: block;
}

.hero-title {
  color: $blue-50;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 58rpx;
  line-height: 70rpx;
  font-weight: 800;
  letter-spacing: 0;
}

.hero-desc {
  margin-top: 23rpx;
  max-width: 558rpx;
  color: $ink-700;
  font-size: 27rpx;
  line-height: 38rpx;
}

.stat-row {
  margin-top: 69rpx;
  padding-top: 46rpx;
  border-top: 2rpx solid rgba(58, 73, 75, .30);
  display: flex;
  gap: 58rpx;
}

.stat-item {
  min-width: 82rpx;
}

.stat-value,
.stat-label {
  display: block;
}

.stat-value {
  color: $blue-50;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 35rpx;
  line-height: 43rpx;
  font-weight: 700;
}

.stat-label {
  margin-top: 10rpx;
  color: $ink-700;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 27rpx;
}

.roles {
  display: flex;
  flex-direction: column;
  gap: 31rpx;
}

.role-card {
  position: relative;
  min-height: 158rpx;
  border: 2rpx solid rgba(58, 73, 75, .50);
  border-radius: 23rpx;
  background: $bg-card;
  padding: 31rpx;
  gap: 31rpx;
  overflow: hidden;
  box-sizing: border-box;
}

.role-card.admin {
  margin-top: 15rpx;
}

.role-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
}

.role-accent.client {
  background: $info;
}

.role-accent.pilot {
  background: $success;
}

.role-accent.owner {
  background: $info;
}

.role-accent.admin {
  background: transparent;
}

.role-icon {
  width: 92rpx;
  height: 92rpx;
  border-radius: 16rpx;
  color: $blue-50;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.role-icon.client {
  background: $info;
  box-shadow: 0 0 38rpx rgba(59, 130, 246, .40);
}

.role-icon.pilot {
  background: $success;
  box-shadow: 0 0 38rpx rgba(16, 185, 129, .40);
}

.role-icon.owner {
  background: $info;
  box-shadow: 0 0 38rpx rgba(139, 92, 246, .40);
}

.role-icon.admin {
  background: $surface-raised;
  color: $ink-900;
}

.role-main {
  min-width: 0;
  flex: 1;
}

.role-title-row {
  justify-content: space-between;
  gap: 18rpx;
  margin-bottom: 8rpx;
}

.role-title-wrap {
  min-width: 0;
  gap: 14rpx;
}

.role-title {
  color: $blue-50;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 31rpx;
  line-height: 40rpx;
  font-weight: 700;
  white-space: nowrap;
}

.role-en,
.role-phone {
  font-family: "JetBrains Mono", monospace;
  white-space: nowrap;
}

.role-en {
  font-size: 19rpx;
  line-height: 27rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}

.role-en.client {
  color: $info;
}

.role-en.pilot {
  color: $success;
}

.role-en.owner {
  color: $info-ink;
}

.role-en.admin {
  color: $ink-500;
}

.role-phone {
  color: rgba(185, 202, 203, .50);
  font-size: 23rpx;
  line-height: 31rpx;
}

.role-desc {
  display: block;
  color: $ink-700;
  font-size: 23rpx;
  line-height: 32rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-go {
  width: 62rpx;
  height: 62rpx;
  border-radius: 999rpx;
  background: $surface-raised;
  color: $ink-700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.role-card--press {
  opacity: .82;
  transform: scale(.985);
}

.login-foot {
  margin-top: auto;
  padding-top: 46rpx;
  justify-content: center;
  gap: 12rpx;
  color: rgba(185, 202, 203, .60);
  font-size: 23rpx;
  line-height: 32rpx;
  text-align: center;
}

@keyframes radarPulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: .8;
  }

  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }

  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

@media (min-width: 768px) {
  .launch-page {
    width: 390px;
    min-height: 884px;
    margin: 0 auto;
    box-shadow: 0 0 0 1px rgba(58, 73, 75, .45);
  }

  .hero-gradient,
  .radar-field {
    left: 50%;
    width: 390px;
    transform: translateX(-50%);
  }

  .launch-main {
    min-height: 884px;
  }
}
</style>
