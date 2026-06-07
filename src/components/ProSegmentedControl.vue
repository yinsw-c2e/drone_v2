<template>
  <view class="pro-segmented" role="tablist">
    <button
      v-for="item in options"
      :key="item.value"
      :class="['segment-item', { active: item.value === modelValue }]"
      role="tab"
      :aria-selected="item.value === modelValue"
      @click="$emit('change', item.value)"
    >
      <text class="segment-label">{{ item.label }}</text>
      <text v-if="item.hint" class="segment-hint">{{ item.hint }}</text>
    </button>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  options: Array<{ label: string; value: string; hint?: string }>;
}>();

defineEmits<{ (e: 'change', value: string): void }>();
</script>

<style lang="scss" scoped>
.pro-segmented {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: $sp-1;
  padding: $sp-1;
  border-radius: $r-md;
  background: $surface-panel;
  border: 2rpx solid $line;
  box-shadow: $shadow-soft;
}

.segment-item {
  min-width: 0;
  min-height: 88rpx;
  padding: 0 $sp-2;
  border-radius: $r-sm;
  border: 0;
  background: transparent;
  color: $ink-700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $sp-1;
  box-sizing: border-box;
}

.segment-item::after {
  border: 0;
}

.segment-item.active {
  background: $color-primary;
  color: $on-primary;
  box-shadow: $shadow-command;
}

.segment-item:active {
  background: $color-primary-weak;
}

.segment-item.active:active {
  background: $color-primary-press;
}

.segment-label,
.segment-hint {
  max-width: 100%;
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.segment-label {
  font-size: $fs-sm;
  line-height: 1.2;
  font-weight: $fw-semibold;
}

.segment-hint {
  font-size: $fs-cap;
  line-height: 1.2;
  opacity: .78;
}
</style>
