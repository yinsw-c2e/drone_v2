<template>
  <view class="map-card">
    <view class="map-canvas">
      <view class="rings" />
      <view class="route-trail" />
      <view class="route" />
      <view class="pin start"><text>起</text></view>
      <view class="pin end"><text>终</text></view>
      <view class="craft" :style="{ left: droneLeft, top: droneTop }"><view class="craft-pulse" /></view>
    </view>
    <view class="map-footer">
      <view class="ft-copy">
        <text class="name">{{ title }}</text>
        <text class="desc">{{ subtitle }}</text>
      </view>
      <view v-if="frame" class="ft-batt">
        <text class="bv">{{ battery }}</text>
        <text class="bl">电量</text>
      </view>
      <view v-else class="ft-tag">航线预览</view>
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

const battery = computed(() => props.frame ? `${props.frame.batteryPct}%` : '--');
const progress = computed(() => {
  const pct = props.frame ? (100 - props.frame.batteryPct) / 40 : 0.2;
  return Math.max(0.14, Math.min(0.82, pct));
});
const droneLeft = computed(() => `${Math.round(progress.value * 100)}%`);
const droneTop = computed(() => `${Math.round((0.64 - progress.value * 0.34) * 100)}%`);
</script>

<style lang="scss" scoped>
.map-card {
  overflow: hidden;
  border-radius: $r-lg;
  background: $bg-card;
  border: 2rpx solid $hairline;
  box-shadow: $shadow-card;
}

.map-canvas {
  position: relative;
  height: 300rpx;
  @include command-map;
}

.rings {
  position: absolute;
  right: -80rpx;
  top: -80rpx;
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  border: 2rpx solid $info-line;
}

.rings::after {
  content: '';
  position: absolute;
  inset: 64rpx;
  border-radius: 50%;
  border: 2rpx solid $info-line;
}

.route-trail,
.route {
  position: absolute;
  left: 12%;
  right: 12%;
  top: 58%;
  border-radius: $r-pill;
  transform: rotate(-12deg);
  transform-origin: left center;
}

.route-trail { height: 20rpx; background: $color-primary-weak; filter: blur(7rpx); }
.route { height: 6rpx; background: $grad-cta; box-shadow: $shadow-glow-primary; }

.pin {
  position: absolute;
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $on-primary;
  font-size: $fs-cap;
  font-weight: $fw-bold;
  box-shadow: $shadow-2;
  z-index: 2;
}

.pin.start { left: 8%; top: 56%; background: $grad-success; }
.pin.end { right: 8%; top: 18%; background: $grad-danger; }

.craft {
  position: absolute;
  width: 42rpx;
  height: 42rpx;
  margin: -21rpx 0 0 -21rpx;
  border-radius: 50%;
  background: $on-primary;
  border: 8rpx solid $color-primary;
  box-shadow: $shadow-glow-primary;
  z-index: 3;
}

.craft-pulse {
  position: absolute;
  inset: -16rpx;
  border-radius: 50%;
  border: 3rpx solid $color-primary;
  opacity: .4;
}

.map-footer {
  padding: $sp-4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
}

.ft-copy { min-width: 0; }
.name { display: block; font-size: $fs-h3; line-height: 1.3; font-weight: $fw-semibold; color: $ink-900; @include ellipsis(1); }
.desc { display: block; margin-top: $sp-1; font-size: $fs-sm; line-height: 1.45; color: $ink-500; @include ellipsis(1); }

.ft-batt {
  @include tabular;
  flex: 0 0 auto;
  min-width: 112rpx;
  padding: $sp-2;
  border-radius: $r-md;
  background: $color-primary-weak;
  color: $color-primary;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
}

.bv { font-size: $fs-h2; font-weight: $fw-bold; }
.bl { font-size: $fs-cap; }

.ft-tag {
  flex: 0 0 auto;
  padding: 8rpx $sp-3;
  border-radius: $r-pill;
  background: $color-primary-weak;
  color: $color-primary;
  font-size: $fs-cap;
  font-weight: $fw-semibold;
}
</style>
