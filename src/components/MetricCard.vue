<template>
  <view class="metric-card">
    <view class="between">
      <text class="label">{{ label }}</text>
      <text :class="['delta', deltaTone]">{{ delta }}</text>
    </view>
    <text class="value">{{ value }}</text>
    <text class="hint">{{ hint }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string | number; hint?: string; delta?: string; deltaTone?: 'up' | 'down' | 'flat' }>(), {
  hint: '',
  delta: '实时',
  deltaTone: 'flat',
});
</script>

<style lang="scss" scoped>
.metric-card {
  @include card;
}

.label {
  font-size: $fs-sm;
  color: $ink-500;
  line-height: 1.45;
}

.value {
  @include tabular;
  display: block;
  margin-top: $sp-2;
  font-size: $fs-metric;
  line-height: 1.15;
  font-weight: $fw-semibold;
  color: $ink-900;
}

.hint {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-cap;
  color: $ink-500;
}

.delta {
  font-size: $fs-cap;
  line-height: 1.4;
}

.delta.up {
  color: $success-ink;
}

.delta.down {
  color: $danger-ink;
}

.delta.flat {
  color: $ink-500;
}
</style>
