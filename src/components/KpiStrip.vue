<template>
  <view class="kpi-strip">
    <view
      v-for="item in items"
      :key="item.label"
      :class="['kpi-item', item.tone ?? 'info', { interactive: Boolean(item.key) }]"
      :hover-class="item.key ? 'kpi-item--press' : 'none'"
      @click="select(item)"
    >
      <text class="label">{{ item.label }}</text>
      <text class="value">{{ item.value }}</text>
      <text v-if="item.hint" class="hint">{{ item.hint }}</text>
      <text v-if="item.key" class="kpi-arrow">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
type KpiItem = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  key?: string;
};

defineProps<{ items: KpiItem[] }>();
const emit = defineEmits<{ select: [key: string] }>();

function select(item: KpiItem) {
  if (item.key) emit('select', item.key);
}
</script>

<style lang="scss" scoped>
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
}

.kpi-item {
  position: relative;
  overflow: hidden;
  min-height: 138rpx;
  padding: $sp-4 $sp-3 $sp-3;
  border-radius: $r-lg;
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(0, 242, 255, .10), transparent 64%),
    $bg-card;
  border: 2rpx solid $hairline;
  box-shadow: $shadow-card;
  box-sizing: border-box;
}

.kpi-item.interactive {
  cursor: pointer;
  touch-action: manipulation;
}

.kpi-item--press {
  transform: translateY(2rpx);
  opacity: .9;
}

.kpi-item::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 4rpx;
}

.kpi-item::after {
  content: '';
  position: absolute;
  right: -28rpx;
  bottom: -28rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(0, 242, 255, .08);
}

.label {
  display: block;
  color: $ink-500;
  font-size: $fs-cap;
  font-weight: $fw-bold;
  line-height: 1.35;
  letter-spacing: 1rpx;
  text-transform: uppercase;
  @include ellipsis(1);
}

.value {
  @include metric-number($fs-metric);
  display: block;
  margin-top: $sp-2;
  color: $ink-900;
}

.hint {
  display: block;
  margin-top: $sp-1;
  color: $ink-400;
  font-size: $fs-cap;
  line-height: 1.35;
}

.kpi-arrow {
  position: absolute;
  right: $sp-2;
  top: $sp-2;
  color: $ink-500;
  font-size: $fs-h3;
  line-height: 1;
}

.kpi-item.info::before { background: $grad-cta; }
.kpi-item.success::before { background: $grad-success; }
.kpi-item.warning::before { background: $grad-warning; }
.kpi-item.danger::before { background: $grad-danger; }
.kpi-item.neutral::before { background: $grad-admin; }
</style>
