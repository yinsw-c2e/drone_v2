<template>
  <view :class="['notice', tone]">
    <wd-icon class="notice-icon" :name="icon" size="30rpx" />
    <text class="notice-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ message: string; title?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>(), {
  title: '',
  tone: 'info',
});

const text = computed(() => props.title ? `${props.title}：${props.message}` : props.message);
const icon = computed(() => props.tone === 'success' ? 'check-outline' : props.tone === 'danger' ? 'error-fill' : props.tone === 'warning' ? 'warning' : 'info-circle');
</script>

<style lang="scss" scoped>
.notice {
  display: flex;
  align-items: flex-start;
  gap: $sp-2;
  padding: $sp-3;
  border-radius: $r-lg;
  border: 2rpx solid transparent;
  font-size: $fs-sm;
  line-height: 1.5;
  box-shadow: $shadow-card;
}

.notice-icon {
  flex: 0 0 auto;
  margin-top: 2rpx;
}

.notice :deep(.wd-icon) { color: currentColor; }

.notice-text {
  flex: 1;
  min-width: 0;
}

.notice.info {
  background: $info-bg;
  border-color: $info-line;
  color: $info-ink;
}

.notice.success {
  background: $success-bg;
  border-color: $success-line;
  color: $success-ink;
}

.notice.warning {
  background: $warning-bg;
  border-color: $warning-line;
  color: $warning-ink;
}

.notice.danger {
  background: $danger-bg;
  border-color: $danger-line;
  color: $danger-ink;
}
</style>
