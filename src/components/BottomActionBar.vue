<template>
  <view class="bar">
    <wd-button v-if="secondary" class="secondary" type="info" size="large" plain block @click="$emit('secondary')">{{ secondary }}</wd-button>
    <wd-button class="primary" :type="danger ? 'error' : 'primary'" size="large" block :disabled="disabled" :loading="loading" @click="$emit('primary')">{{ primary }}</wd-button>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ primary: string; secondary?: string; disabled?: boolean; loading?: boolean; danger?: boolean }>(), {
  secondary: '',
  disabled: false,
  loading: false,
  danger: false,
});
defineEmits<{ (e: 'primary'): void; (e: 'secondary'): void }>();
</script>

<style lang="scss" scoped>
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-bottombar;
  display: flex;
  gap: $sp-2;
  padding: $sp-3 $page-x calc($sp-3 + env(safe-area-inset-bottom));
  background: $surface-raised;
  border-top: 2rpx solid $line;
  box-shadow: $shadow-3;
}

.primary {
  flex: 1;
  min-width: 0;
}

.secondary {
  width: 208rpx;
  flex: 0 0 208rpx;
}

.bar :deep(.wd-button) {
  min-height: 96rpx;
  border-radius: $r-md;
  font-weight: $fw-semibold;
  white-space: nowrap;
}
</style>
