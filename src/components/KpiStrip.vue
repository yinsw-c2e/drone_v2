<template>
  <view class="kpi-strip">
    <view v-for="item in items" :key="item.label" :class="['kpi-item', item.tone ?? 'info']">
      <view class="kpi-top">
        <text class="label">{{ item.label }}</text>
        <text class="dot" />
      </view>
      <text class="value">{{ item.value }}</text>
      <text v-if="item.hint" class="hint">{{ item.hint }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ items: Array<{ label: string; value: string | number; hint?: string; tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }> }>();
</script>

<style lang="scss" scoped>
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
}

.kpi-item {
  min-height: 116rpx;
  padding: $sp-2;
  border-radius: $r-md;
  background: $surface-raised;
  border: 2rpx solid $line;
  box-sizing: border-box;
  box-shadow: $shadow-soft;
}

.kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-1;
}

.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: $r-pill;
  background: $info;
}

.value {
  @include tabular;
  display: block;
  margin-top: $sp-1;
  color: $ink-900;
  font-size: $fs-h2;
  line-height: 1.2;
  font-weight: $fw-bold;
}

.label,
.hint {
  display: block;
  font-size: $fs-cap;
  line-height: 1.4;
}

.label {
  color: $ink-700;
  font-weight: $fw-semibold;
  @include ellipsis(1);
}

.hint {
  color: $ink-500;
}

.kpi-item.info {
  background: $info-bg;
  border-color: $info-line;
}

.kpi-item.info .dot {
  background: $info;
}

.kpi-item.success {
  background: $success-bg;
  border-color: $success-line;
}

.kpi-item.success .dot {
  background: $success;
}

.kpi-item.warning {
  background: $warning-bg;
  border-color: $warning-line;
}

.kpi-item.warning .dot {
  background: $warning;
}

.kpi-item.danger {
  background: $danger-bg;
  border-color: $danger-line;
}

.kpi-item.danger .dot {
  background: $danger;
}

.kpi-item.neutral {
  background: $surface-panel;
}

.kpi-item.neutral .dot {
  background: $ink-400;
}
</style>
