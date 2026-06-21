<template>
  <view class="empty">
    <view class="empty-mark">
      <view class="mark-grid" />
      <view class="mark-route" />
      <view class="mark-node start" />
      <view class="mark-node end" />
    </view>
    <text class="title">{{ title }}</text>
    <text class="desc">{{ desc }}</text>
    <button v-if="action" class="primary-button action" @click="$emit('action')">{{ action }}</button>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; desc?: string; action?: string }>(), {
  desc: '',
  action: '',
});
defineEmits<{ (e: 'action'): void }>();
</script>

<style lang="scss" scoped>
.empty {
  padding: $sp-10 $sp-4;
  position: relative;
  overflow: hidden;
  border-radius: $r-lg;
  border: 2rpx solid $cockpit-line-strong;
  background: $bg-card;
  box-shadow: $shadow-command;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sp-2;
}

.empty::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: .72;
  @include cockpit-map;
}

.empty::after {
  content: '';
  position: absolute;
  left: $sp-6;
  right: $sp-6;
  top: $sp-4;
  height: 2rpx;
  border-radius: $r-pill;
  background: $grad-cta;
  opacity: .72;
}

.empty-mark {
  width: 176rpx;
  height: 116rpx;
  position: relative;
  z-index: 1;
  overflow: hidden;
  border-radius: $r-md;
  background: $bg-sunken;
  border: 2rpx solid $info-line;
  box-shadow: inset 0 0 36rpx $color-primary-weak;
}

.mark-grid {
  position: absolute;
  inset: 0;
  opacity: .55;
  @include command-map;
}

.mark-route {
  position: absolute;
  left: 28rpx;
  right: 28rpx;
  top: 58rpx;
  height: 6rpx;
  border-radius: $r-pill;
  background: $grad-cta;
  transform: rotate(-14deg);
  transform-origin: left center;
  box-shadow: $shadow-glow-primary;
}

.mark-node {
  position: absolute;
  width: 24rpx;
  height: 24rpx;
  border-radius: 50%;
  border: 4rpx solid $cockpit-900;
}

.mark-node.start {
  left: 24rpx;
  top: 58rpx;
  background: $success;
}

.mark-node.end {
  right: 24rpx;
  top: 34rpx;
  background: $danger;
}

.title {
  position: relative;
  z-index: 1;
  font-size: $fs-body;
  line-height: 1.5;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.desc {
  position: relative;
  z-index: 1;
  font-size: $fs-sm;
  line-height: 1.45;
  color: $ink-500;
  text-align: center;
}

.action {
  position: relative;
  z-index: 1;
  margin-top: $sp-3;
  min-width: 220rpx;
}
</style>
