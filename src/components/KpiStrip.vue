<template>
  <view class="kpi-strip">
    <view v-for="item in items" :key="item.label" :class="['kpi-item', item.tone ?? 'info']">
      <text class="value">{{ item.value }}</text>
      <text class="label">{{ item.label }}</text>
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
  min-height: 104rpx;
  padding: $sp-2;
  border-radius: $r-md;
  background: $bg-card;
  border: 2rpx solid $line;
  box-sizing: border-box;
}

.value {
  @include tabular;
  display: block;
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
  margin-top: $sp-1;
  color: $ink-700;
  font-weight: $fw-semibold;
}

.hint {
  color: $ink-500;
}

.kpi-item.info {
  background: $info-bg;
  border-color: $info-line;
}

.kpi-item.success {
  background: $success-bg;
  border-color: $success-line;
}

.kpi-item.warning {
  background: $warning-bg;
  border-color: $warning-line;
}

.kpi-item.danger {
  background: $danger-bg;
  border-color: $danger-line;
}

.kpi-item.neutral {
  background: $bg-sunken;
}
</style>
