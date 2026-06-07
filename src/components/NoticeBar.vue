<template>
  <view :class="['notice-bar', tone]">
    <view class="dot" />
    <view class="copy">
      <text v-if="title" class="title">{{ title }}</text>
      <text class="message">{{ message }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message: string; title?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>(), {
  title: '',
  tone: 'info',
});
</script>

<style lang="scss" scoped>
.notice-bar {
  display: flex;
  align-items: flex-start;
  gap: $sp-2;
  padding: $sp-3;
  border-radius: $r-md;
  border: 2rpx solid $info-line;
  background: $info-bg;
  color: $info-ink;
}

.dot {
  flex: 0 0 auto;
  width: 12rpx;
  height: 12rpx;
  margin-top: 12rpx;
  border-radius: 50%;
  background: $info;
}

.copy {
  min-width: 0;
}

.title,
.message {
  display: block;
  font-size: $fs-sm;
  line-height: 1.45;
}

.title {
  margin-bottom: $sp-1;
  font-weight: $fw-semibold;
}

.success {
  border-color: $success-line;
  background: $success-bg;
  color: $success-ink;
}

.success .dot {
  background: $success;
}

.warning {
  border-color: $warning-line;
  background: $warning-bg;
  color: $warning-ink;
}

.warning .dot {
  background: $warning;
}

.danger {
  border-color: $danger-line;
  background: $danger-bg;
  color: $danger-ink;
}

.danger .dot {
  background: $danger;
}
</style>
