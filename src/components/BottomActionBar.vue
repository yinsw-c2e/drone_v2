<template>
  <view class="bar">
    <view v-if="secondary" class="bar-btn secondary" hover-class="bar-btn--press" @click="emitSecondary" @tap="emitSecondary">{{ secondary }}</view>
    <view
      class="bar-btn primary"
      :class="{ danger, disabled: disabled || loading }"
      :hover-class="disabled || loading ? 'none' : 'bar-btn--press'"
      @click="emitPrimary"
      @tap="emitPrimary"
    >{{ loading ? '处理中...' : primary }}</view>
  </view>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ primary: string; secondary?: string; disabled?: boolean; loading?: boolean; danger?: boolean }>(), {
  secondary: '',
  disabled: false,
  loading: false,
  danger: false,
});
const emit = defineEmits<{ (e: 'primary'): void; (e: 'secondary'): void }>();
let lastPrimaryAt = 0;
let lastSecondaryAt = 0;

function emitPrimary() {
  if (props.disabled || props.loading) return;
  const now = Date.now();
  if (now - lastPrimaryAt < 300) return;
  lastPrimaryAt = now;
  emit('primary');
}

function emitSecondary() {
  const now = Date.now();
  if (now - lastSecondaryAt < 300) return;
  lastSecondaryAt = now;
  emit('secondary');
}
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
  background: rgba(11, 14, 20, .92);
  border-top: 2rpx solid $hairline;
  backdrop-filter: blur(18rpx);
  -webkit-backdrop-filter: blur(18rpx);
}

.bar-btn {
  min-height: 96rpx;
  border-radius: $r-sm;
  font-size: $fs-body;
  font-weight: $fw-bold;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  box-sizing: border-box;
  touch-action: manipulation;
}

.bar-btn.primary {
  flex: 1;
  min-width: 0;
  color: $on-primary;
  background: $grad-cta;
  box-shadow: $shadow-glow-primary;
}

.bar-btn.primary.danger {
  background: $grad-danger;
  box-shadow: none;
}

.bar-btn.primary.disabled {
  opacity: .5;
  box-shadow: none;
}

.bar-btn.secondary {
  flex: 0 0 224rpx;
  color: $ink-700;
  background: $surface-panel;
  border: 2rpx solid $line-strong;
}

.bar-btn--press {
  opacity: .9;
  transform: translateY(2rpx);
}
</style>
