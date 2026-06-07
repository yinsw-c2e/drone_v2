<template>
  <wd-card :class="['cand', { selected }]" @click="$emit('select', candidate)">
    <view class="head">
      <view class="asset">
        <view class="asset-thumb">
          <view class="wing" />
          <view class="body" />
        </view>
        <view class="who">
          <text class="name">{{ droneLabel || '合规运力' }}</text>
          <text class="pilot">{{ pilotName || '认证飞手' }} · 信用 {{ candidate.creditScore }}</text>
        </view>
      </view>
      <view class="price">
        <MoneyText :fen="candidate.quoteCent" size="metric" bold />
        <text>推荐报价</text>
      </view>
    </view>
    <view class="dispatch-strip">
      <view>
        <text class="metric">{{ candidate.distanceKm }}km</text>
        <text class="metric-label">接单距离</text>
      </view>
      <view>
        <text class="metric">{{ candidate.etaMin }}分</text>
        <text class="metric-label">预计到达</text>
      </view>
      <view>
        <text class="metric">{{ candidate.score }}</text>
        <text class="metric-label">综合分</text>
      </view>
    </view>
    <view class="chips">
      <wd-tag v-if="droneMeta" round type="primary">{{ droneMeta }}</wd-tag>
      <wd-tag round type="success">空域合规</wd-tag>
      <wd-tag round type="success">责任险校验</wd-tag>
    </view>
    <view class="reasons">
      <wd-tag v-for="(r, i) in candidate.reasons.slice(0, 4)" :key="i" round>{{ r }}</wd-tag>
    </view>
    <wd-button class="choose" :type="selected ? 'success' : 'primary'" block @click.stop="$emit('select', candidate)">{{ selected ? '已选中' : '选择方案' }}</wd-button>
  </wd-card>
</template>
<script setup lang="ts">
import MoneyText from './MoneyText.vue';
import type { MatchCandidate } from '@/models';
defineProps<{ candidate: MatchCandidate; pilotName?: string; droneLabel?: string; droneMeta?: string; selected?: boolean }>();
defineEmits<{ (e: 'select', c: MatchCandidate): void }>();
</script>
<style lang="scss" scoped>
.cand {
  position: relative;
  margin-bottom: $sp-3;
  border: 2rpx solid transparent;
}

.cand.selected {
  border-color: $color-primary;
  box-shadow: $shadow-2;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: $sp-3;
}

.asset {
  display: flex;
  gap: $sp-3;
  min-width: 0;
}

.asset-thumb {
  width: 96rpx;
  height: 96rpx;
  border-radius: $r-md;
  background: $bg-sunken;
  border: 2rpx solid $line;
  position: relative;
  flex: 0 0 auto;
}

.wing,
.body {
  position: absolute;
  border-radius: $r-pill;
  background: $color-primary;
}

.wing {
  left: 18rpx;
  right: 18rpx;
  top: 44rpx;
  height: 8rpx;
}

.body {
  width: 28rpx;
  height: 28rpx;
  left: 34rpx;
  top: 30rpx;
  box-shadow: 0 0 0 8rpx $color-primary-weak;
}

.who {
  display: flex;
  flex-direction: column;
  gap: $sp-1;
  min-width: 0;
}

.name {
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.pilot {
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.price {
  text-align: right;
  flex: 0 0 auto;
}

.price > text {
  display: block;
  color: $ink-500;
  font-size: $fs-cap;
}

.dispatch-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
  margin-top: $sp-3;
  padding: $sp-3;
  border-radius: $r-md;
  background: $bg-sunken;
}

.metric,
.metric-label {
  display: block;
}

.metric {
  @include tabular;
  color: $ink-900;
  font-size: $fs-body;
  line-height: 1.35;
  font-weight: $fw-bold;
}

.metric-label {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-2;
  margin-top: $sp-3;
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-1;
  margin-top: $sp-2;
}

.choose {
  margin-top: $sp-3;
}

</style>
