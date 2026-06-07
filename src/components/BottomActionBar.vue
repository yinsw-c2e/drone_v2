<template>
  <view class="bar">
    <button v-if="secondary" class="secondary-button secondary" @click="$emit('secondary')">{{ secondary }}</button>
    <button :class="[danger ? 'danger-button' : 'primary-button', 'primary']" :disabled="disabled" @click="$emit('primary')">
      {{ loading ? '处理中' : primary }}
    </button>
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
  gap: $sp-3;
  padding: $sp-3 $page-x calc($sp-3 + env(safe-area-inset-bottom));
  background: $bg-card;
  border-top: 2rpx solid $line;
  box-shadow: $shadow-2;
}

.primary {
  flex: 1;
}

.secondary {
  width: 220rpx;
}

button[disabled] {
  color: $ink-400;
  background: $bg-sunken;
}
</style>
