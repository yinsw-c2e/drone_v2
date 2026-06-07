<template>
  <view class="empty">
    <view class="illus">
      <view class="ring" />
      <view class="line" />
      <view class="dot" />
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sp-2;
}

.illus {
  width: 152rpx;
  height: 96rpx;
  position: relative;
}

.ring {
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  border: 4rpx solid $color-primary;
  background: $color-primary-weak;
}

.line {
  position: absolute;
  left: 56rpx;
  top: 44rpx;
  width: 88rpx;
  height: 4rpx;
  border-radius: $r-pill;
  background: $line;
}

.dot {
  position: absolute;
  right: 0;
  top: 34rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  background: $success;
}

.title {
  font-size: $fs-body;
  line-height: 1.5;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.desc {
  font-size: $fs-sm;
  line-height: 1.45;
  color: $ink-500;
  text-align: center;
}

.action {
  margin-top: $sp-3;
  min-width: 220rpx;
}
</style>
