<template>
  <view class="map-card">
    <view class="grid">
      <view class="route" />
      <view class="start marker"><text>起</text></view>
      <view class="end marker"><text>终</text></view>
      <view class="drone" :style="{ left: droneLeft, top: droneTop }" />
    </view>
    <view class="map-footer">
      <view>
        <text class="name">{{ title }}</text>
        <text class="desc">{{ subtitle }}</text>
      </view>
      <view class="telemetry">
        <text>{{ battery }}</text>
        <text>电量</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Telemetry } from '@/models';

const props = withDefaults(defineProps<{ title: string; subtitle?: string; frame?: Telemetry }>(), {
  subtitle: '起终点与围栏实时联动',
  frame: undefined,
});

const battery = computed(() => props.frame && props.frame.batteryPct > 0 ? `${props.frame.batteryPct}%` : '--');
const progress = computed(() => {
  const pct = props.frame ? (100 - props.frame.batteryPct) / 40 : 0.18;
  return Math.max(0.14, Math.min(0.82, pct));
});
const droneLeft = computed(() => `${Math.round(progress.value * 100)}%`);
const droneTop = computed(() => `${Math.round((0.68 - progress.value * 0.32) * 100)}%`);
</script>

<style lang="scss" scoped>
.map-card {
  overflow: hidden;
  border-radius: $r-lg;
  background: $bg-card;
  box-shadow: $shadow-1;
}

.grid {
  height: 320rpx;
  position: relative;
  background:
    linear-gradient(90deg, $line 2rpx, transparent 2rpx),
    linear-gradient(0deg, $line 2rpx, transparent 2rpx),
    $bg-sunken;
  background-size: 80rpx 80rpx;
}

.route {
  position: absolute;
  left: 16%;
  right: 16%;
  top: 58%;
  height: 8rpx;
  border-radius: $r-pill;
  background: $color-primary;
  transform: rotate(-18deg);
  transform-origin: left center;
}

.marker {
  position: absolute;
  width: 56rpx;
  height: 56rpx;
  border-radius: $r-pill;
  color: $on-primary;
  font-size: $fs-cap;
  font-weight: $fw-semibold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-2;
}

.start {
  left: 12%;
  top: 58%;
  background: $success;
}

.end {
  right: 12%;
  top: 32%;
  background: $danger;
}

.drone {
  position: absolute;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: $color-primary;
  box-shadow: 0 0 0 12rpx $color-primary-weak;
}

.map-footer {
  padding: $sp-4;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name {
  display: block;
  font-size: $fs-h3;
  line-height: 1.35;
  font-weight: $fw-semibold;
  color: $ink-900;
}

.desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  line-height: 1.45;
  color: $ink-500;
}

.telemetry {
  @include tabular;
  min-width: 108rpx;
  padding: $sp-2;
  border-radius: $r-md;
  background: $color-primary-weak;
  color: $color-primary;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $sp-1;
  font-size: $fs-cap;
}

.telemetry text:first-child {
  font-size: $fs-h2;
  font-weight: $fw-semibold;
}
</style>
