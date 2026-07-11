<template>
  <view class="system-guide">
    <view class="tech-grid" />
    <view class="scan-line" />
    <view class="ambient-bg" />
    <view class="bottom-fade" />

    <view class="guide-main">
      <view class="brand-head">
        <view class="brand-mark">
          <StitchIcon name="flight_takeoff" size="62rpx" fill />
        </view>
        <text class="brand-title">SkyLink Logistics</text>
        <text class="brand-sub">Global Control Tower</text>
      </view>

      <view class="init-card">
        <view class="corner tl" />
        <view class="corner br" />
        <view class="card-copy">
          <text class="card-title">安全访问入口</text>
          <text class="card-desc">登录后加载经授权的订单、运力与遥测数据。</text>
        </view>

        <view class="telemetry-panel">
          <view class="telemetry-row">
            <text>SYS_STATUS</text>
            <view class="online-state">
              <view class="online-dot" />
              <text>AUTH_REQUIRED</text>
            </view>
          </view>
          <view class="telemetry-row">
            <text>SECURE_LINK</text>
            <text class="value normal">HTTPS</text>
          </view>
          <view class="telemetry-row">
            <text>ACTIVE_NODES</text>
            <text class="value accent">—</text>
          </view>
        </view>

        <view class="enter-button" hover-class="tap-press" @click="enterConsole">
          <text>进入控制台</text>
          <StitchIcon name="login" size="35rpx" />
        </view>

        <text class="build-text">V 2.4.1 (BUILD 884)</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import StitchIcon from '@/components/StitchIcon.vue';

function enterConsole() {
  uni.redirectTo({ url: '/pages/login/index' });
}
</script>

<style lang="scss" scoped>
.system-guide {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: $bg-page;
  color: $ink-900;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.tech-grid,
.scan-line,
.ambient-bg,
.bottom-fade {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.tech-grid {
  z-index: 0;
  background-image:
    linear-gradient(90deg, rgba(58, 73, 75, .16) 1rpx, transparent 1rpx),
    linear-gradient(0deg, rgba(58, 73, 75, .16) 1rpx, transparent 1rpx);
  background-size: 80rpx 80rpx;
}

.scan-line {
  z-index: 1;
  height: 100vh;
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 242, 255, .10) 50%, transparent 100%);
  transform: translateY(-100%);
  animation: scanMove 4s linear infinite;
}

.ambient-bg {
  z-index: 0;
  opacity: .58;
  background:
    radial-gradient(220rpx 80rpx at 38% 4%, rgba(223, 226, 240, .12), transparent 72%),
    radial-gradient(310rpx 90rpx at 25% 13%, rgba(223, 226, 240, .09), transparent 72%),
    radial-gradient(390rpx 190rpx at 50% 28%, rgba(59, 130, 246, .18), transparent 72%),
    radial-gradient(260rpx 80rpx at 76% 19%, rgba(223, 226, 240, .11), transparent 72%),
    radial-gradient(46rpx 46rpx at 21% 22%, rgba(16, 185, 129, .30), transparent 78%),
    radial-gradient(46rpx 46rpx at 42% 21%, rgba(239, 68, 68, .18), transparent 78%),
    linear-gradient(180deg, rgba(10, 14, 24, .78) 0%, rgba(10, 14, 24, .94) 52%, rgba(10, 14, 24, .96) 100%);
}

.bottom-fade {
  z-index: 1;
  background: linear-gradient(180deg, rgba(11, 14, 20, 0) 0%, rgba(11, 14, 20, .20) 58%, rgba(0, 38, 44, .78) 100%);
}

.guide-main {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding: 0 31rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.brand-head {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 77rpx;
}

.brand-mark {
  width: 124rpx;
  height: 124rpx;
  border-radius: 999rpx;
  border: 2rpx solid $line-strong;
  background: $surface-raised;
  color: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 31rpx;
  box-shadow: 0 0 29rpx rgba(0, 242, 255, .22);
}

.brand-title {
  color: $color-primary;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 35rpx;
  line-height: 46rpx;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 6rpx;
  text-align: center;
  text-shadow: 0 0 15rpx rgba(0, 242, 255, .42);
}

.brand-sub {
  margin-top: 16rpx;
  color: $ink-700;
  font-family: "JetBrains Mono", monospace;
  font-size: 21rpx;
  line-height: 30rpx;
  letter-spacing: 8rpx;
  transform: scale(.72);
  opacity: .78;
}

.init-card {
  position: relative;
  width: 100%;
  min-height: 798rpx;
  padding: 61rpx;
  border-radius: 16rpx;
  border: 2rpx solid $line-strong;
  background: rgba(53, 57, 68, .40);
  box-shadow: 0 48rpx 96rpx rgba(0, 0, 0, .35);
  box-sizing: border-box;
  overflow: hidden;
}

.corner {
  position: absolute;
  width: 31rpx;
  height: 31rpx;
}

.corner.tl {
  left: 0;
  top: 0;
  border-left: 4rpx solid rgba(0, 242, 255, .55);
  border-top: 4rpx solid rgba(0, 242, 255, .55);
}

.corner.br {
  right: 0;
  bottom: 0;
  border-right: 4rpx solid rgba(0, 242, 255, .55);
  border-bottom: 4rpx solid rgba(0, 242, 255, .55);
}

.card-copy {
  text-align: center;
  margin-bottom: 61rpx;
}

.card-title,
.card-desc {
  display: block;
}

.card-title {
  color: $ink-900;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 35rpx;
  line-height: 46rpx;
  font-weight: 600;
}

.card-desc {
  margin-top: 15rpx;
  color: $ink-700;
  font-size: 27rpx;
  line-height: 38rpx;
}

.telemetry-panel {
  border: 2rpx solid $line-strong;
  border-radius: 8rpx;
  background: $bg-sunken;
  padding: 31rpx;
  margin-bottom: 61rpx;
  display: flex;
  flex-direction: column;
  gap: 23rpx;
}

.telemetry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  color: $ink-700;
  font-family: "JetBrains Mono", monospace;
  font-size: 21rpx;
  line-height: 30rpx;
  font-weight: 700;
  letter-spacing: 1rpx;
}

.online-state {
  color: $success;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.online-dot {
  width: 15rpx;
  height: 15rpx;
  border-radius: 999rpx;
  background: $success;
  animation: dotPulse 1.8s ease-in-out infinite;
}

.value {
  font-size: 27rpx;
  line-height: 38rpx;
  letter-spacing: 1rpx;
}

.value.normal {
  color: $ink-900;
}

.value.accent {
  color: $color-primary;
}

.enter-button {
  position: relative;
  height: 108rpx;
  border-radius: 8rpx;
  background: $color-primary;
  color: $blue-900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 35rpx;
  line-height: 46rpx;
  font-weight: 700;
  overflow: hidden;
}

.build-text {
  display: block;
  margin-top: 31rpx;
  color: rgba(185, 202, 203, .50);
  font-family: "JetBrains Mono", monospace;
  font-size: 21rpx;
  line-height: 30rpx;
  font-weight: 700;
  text-align: center;
  letter-spacing: 1rpx;
}

.tap-press {
  opacity: .80;
  transform: scale(.95);
}

@keyframes scanMove {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(100vh);
  }
}

@keyframes dotPulse {
  0%,
  100% {
    opacity: .62;
  }

  50% {
    opacity: 1;
  }
}

@media (min-width: 768px) {
  .system-guide {
    width: 390px;
    min-height: 1635px;
    margin: 0 auto;
    box-shadow: 0 0 0 1px rgba(58, 73, 75, .45);
  }

  .tech-grid,
  .scan-line,
  .ambient-bg,
  .bottom-fade {
    left: 50%;
    width: 390px;
    transform: translateX(-50%);
  }

  .scan-line {
    animation-name: scanMoveDesktop;
  }

  .guide-main {
    min-height: 1635px;
  }
}

@keyframes scanMoveDesktop {
  from {
    transform: translate(-50%, -100%);
  }

  to {
    transform: translate(-50%, 1635px);
  }
}
</style>
