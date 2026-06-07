<template>
  <view :class="['route-hero', tone, compact ? 'compact' : '']">
    <view class="hero-map">
      <view class="airspace-ring ring-a" />
      <view class="airspace-ring ring-b" />
      <view class="route-line" />
      <view class="route-line route-shadow" />
      <view class="marker start"><text>起</text></view>
      <view class="marker end"><text>终</text></view>
      <view class="craft" :style="{ left: craftLeft, top: craftTop }">
        <view class="craft-core" />
      </view>
      <view class="status-chip">
        <text class="status-dot" />
        <text>{{ status }}</text>
      </view>
    </view>
    <view class="hero-copy">
      <view>
        <text v-if="eyebrow" class="eyebrow">{{ eyebrow }}</text>
        <text class="title">{{ title }}</text>
        <text v-if="subtitle" class="subtitle">{{ subtitle }}</text>
      </view>
      <view class="route-points">
        <text>{{ from }}</text>
        <text>{{ to }}</text>
      </view>
      <view class="hero-kpis">
        <view v-for="item in heroMetrics" :key="item.label" :class="['hero-kpi', item.tone || 'neutral']">
          <text class="hero-value">{{ item.value }}</text>
          <text class="hero-label">{{ item.label }}</text>
          <text v-if="item.hint" class="hero-hint">{{ item.hint }}</text>
        </view>
      </view>
      <view v-if="primary" class="hero-actions">
        <wd-button v-if="secondary" class="hero-button" type="info" plain @click="$emit('secondary')">{{ secondary }}</wd-button>
        <wd-button class="hero-button" type="primary" @click="$emit('primary')">{{ primary }}</wd-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Telemetry } from '@/models';
import { routeHeroMetrics } from '@/services/route-hero';
import type { RouteHeroMetric } from '@/services/route-hero';

const props = withDefaults(defineProps<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  from?: string;
  to?: string;
  status?: string;
  frame?: Telemetry;
  eta?: string;
  distance?: string;
  battery?: string;
  metrics?: RouteHeroMetric[];
  primary?: string;
  secondary?: string;
  tone?: 'client' | 'pilot' | 'owner' | 'admin';
  compact?: boolean;
}>(), {
  subtitle: '',
  eyebrow: '',
  from: '北京低空货运中心',
  to: '顺义临空交付点',
  status: '空域可控',
  frame: undefined,
  eta: '--',
  distance: '5km',
  battery: '',
  metrics: () => [],
  primary: '',
  secondary: '',
  tone: 'client',
  compact: false,
});

defineEmits<{ (e: 'primary'): void; (e: 'secondary'): void }>();

const heroMetrics = computed(() => routeHeroMetrics({
  metrics: props.metrics,
  eta: props.eta,
  distance: props.distance,
  battery: props.battery,
  frame: props.frame,
}));
const progress = computed(() => {
  const pct = props.frame ? (100 - props.frame.batteryPct) / 42 : 0.24;
  return Math.max(0.16, Math.min(0.84, pct));
});
const craftLeft = computed(() => `${Math.round(progress.value * 100)}%`);
const craftTop = computed(() => `${Math.round((0.68 - progress.value * 0.36) * 100)}%`);
</script>

<style lang="scss" scoped>
.route-hero {
  overflow: hidden;
  border-radius: $r-lg;
  background: $bg-card;
  box-shadow: $shadow-2;
  border: 2rpx solid $line;
}

.hero-map {
  position: relative;
  height: 360rpx;
  background:
    linear-gradient(90deg, $line 2rpx, transparent 2rpx),
    linear-gradient(0deg, $line 2rpx, transparent 2rpx),
    $bg-sunken;
  background-size: 88rpx 88rpx;
}

.airspace-ring {
  position: absolute;
  border: 2rpx solid $blue-200;
  border-radius: $r-pill;
  background: $color-primary-weak;
}

.ring-a {
  width: 260rpx;
  height: 160rpx;
  left: 10%;
  top: 24%;
}

.ring-b {
  width: 220rpx;
  height: 132rpx;
  right: 10%;
  top: 20%;
}

.route-line,
.route-shadow {
  position: absolute;
  left: 15%;
  right: 14%;
  top: 58%;
  height: 8rpx;
  border-radius: $r-pill;
  background: $color-primary;
  transform: rotate(-18deg);
  transform-origin: left center;
}

.route-shadow {
  top: 62%;
  background: $blue-200;
}

.marker {
  position: absolute;
  width: 64rpx;
  height: 64rpx;
  border-radius: $r-pill;
  color: $on-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-cap;
  font-weight: $fw-semibold;
  box-shadow: $shadow-2;
}

.start {
  left: 11%;
  top: 56%;
  background: $success;
}

.end {
  right: 10%;
  top: 30%;
  background: $danger;
}

.craft {
  position: absolute;
  width: 64rpx;
  height: 64rpx;
  border-radius: $r-pill;
  background: $on-primary;
  box-shadow: $shadow-2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.craft-core {
  width: 32rpx;
  height: 32rpx;
  border-radius: $r-pill;
  background: $color-primary;
}

.status-chip {
  position: absolute;
  left: $sp-4;
  top: $sp-4;
  min-height: 56rpx;
  padding: 0 $sp-3;
  border-radius: $r-pill;
  background: $bg-card;
  color: $ink-700;
  display: flex;
  align-items: center;
  gap: $sp-1;
  box-shadow: $shadow-1;
  font-size: $fs-cap;
  font-weight: $fw-semibold;
}

.status-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: $r-pill;
  background: $success;
}

.hero-copy {
  padding: $sp-4;
  display: grid;
  gap: $sp-3;
}

.eyebrow,
.title,
.subtitle,
  .route-points text,
  .hero-value,
  .hero-label,
  .hero-hint {
  display: block;
}

.eyebrow {
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.title {
  color: $ink-900;
  font-size: $fs-h2;
  line-height: 1.25;
  font-weight: $fw-bold;
}

.subtitle {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.route-points {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-2;
}

.route-points text {
  padding: $sp-2;
  border-radius: $r-sm;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.hero-kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
}

.hero-kpi {
  padding: $sp-2;
  border-radius: $r-md;
  background: $color-primary-weak;
}

.hero-value {
  @include tabular;
  @include ellipsis(1);
  color: $ink-900;
  font-size: $fs-h2;
  line-height: 1.2;
  font-weight: $fw-bold;
}

.hero-label {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
}

.hero-hint {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.35;
}

.hero-kpi.success {
  background: $success-bg;
}

.hero-kpi.warning {
  background: $warning-bg;
}

.hero-kpi.danger {
  background: $danger-bg;
}

.hero-kpi.info {
  background: $info-bg;
}

.hero-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-2;
}

.hero-actions .hero-button:first-child:last-child {
  grid-column: 1 / -1;
}

.pilot .status-dot,
.pilot .craft-core {
  background: $role-pilot;
}

.pilot .eyebrow {
  color: $role-pilot;
}

.pilot .hero-kpi {
  background: $role-pilot-weak;
}

.owner .status-dot,
.owner .craft-core {
  background: $role-owner;
}

.owner .eyebrow {
  color: $role-owner;
}

.owner .hero-kpi {
  background: $role-owner-weak;
}

.compact .hero-map {
  height: 300rpx;
}

.compact .hero-copy {
  padding: $sp-3;
}
</style>
