<template>
  <view :class="['cand', { selected }]" @click="$emit('select', candidate)">
    <view class="quote-head">
      <view class="identity">
        <view class="asset-thumb">
          <text>机</text>
        </view>
        <view class="who">
          <view class="name-row">
            <text class="name">{{ droneLabel || '合规运力' }}</text>
          </view>
          <view class="pilot-row">
            <text>{{ pilotName || '认证飞手' }}</text>
            <text class="dot" />
            <text>信用 {{ candidate.creditScore }}</text>
          </view>
        </view>
      </view>
      <view class="price-block">
        <MoneyText :fen="candidate.quoteCent" size="metric" bold />
        <text class="price-label">推荐报价</text>
      </view>
    </view>

    <view class="dispatch-strip">
      <view class="dispatch-cell primary">
        <text class="metric">{{ candidate.etaMin }}分</text>
        <text class="metric-label">到达起点</text>
      </view>
      <view class="dispatch-cell">
        <text class="metric">{{ candidate.distanceKm }}km</text>
        <text class="metric-label">接近距离</text>
      </view>
      <view class="dispatch-cell">
        <text class="metric">{{ candidate.score }}</text>
        <text class="metric-label">综合分</text>
      </view>
    </view>

    <view class="assurance">
      <view class="assurance-row">
        <text class="assurance-label">承运保障</text>
        <text class="assurance-copy">{{ droneMeta || '载荷与三者险已校验' }}</text>
      </view>
      <view class="assurance-row">
        <text class="assurance-label">推荐理由</text>
        <text class="assurance-copy">{{ reasonCopy }}</text>
      </view>
    </view>

    <view class="quote-footer">
      <view class="status-pill">
        <text class="status-dot" />
        <text>{{ selected ? '当前选中方案' : '点击整卡选择' }}</text>
      </view>
      <text class="capacity-copy">空域合规 · 责任险校验</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import MoneyText from './MoneyText.vue';
import type { MatchCandidate } from '@/models';

const props = defineProps<{ candidate: MatchCandidate; pilotName?: string; droneLabel?: string; droneMeta?: string; selected?: boolean }>();
defineEmits<{ (e: 'select', c: MatchCandidate): void }>();

const reasonCopy = computed(() => props.candidate.reasons.slice(0, 3).join(' · ') || '综合距离、信用与报价推荐');
</script>
<style lang="scss" scoped>
.cand {
  position: relative;
  margin-bottom: $sp-3;
  padding: $sp-4;
  border-radius: $r-lg;
  background: $bg-card;
  border: 2rpx solid $hairline;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.cand.selected {
  border-color: $color-primary;
  box-shadow: $shadow-command;
}

.quote-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: $sp-3;
  align-items: start;
}

.identity {
  display: flex;
  gap: $sp-3;
  min-width: 0;
}

.asset-thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: $r-md;
  background: $surface-command;
  border: 2rpx solid $info-line;
  color: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-h2;
  font-weight: $fw-bold;
  flex: 0 0 auto;
}

.who {
  display: flex;
  flex-direction: column;
  gap: $sp-1;
  min-width: 0;
  flex: 1;
}

.name-row,
.pilot-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: $sp-2;
}

.name {
  @include ellipsis(1);
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.25;
  font-weight: $fw-bold;
  min-width: 0;
  flex: 1;
}

.pilot-row {
  max-width: 100%;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
}

.pilot-row text {
  flex: 0 0 auto;
}

.dot,
.status-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: $r-pill;
  background: $success;
}

.price-block {
  text-align: right;
  flex: 0 0 auto;
}

.price-label {
  display: block;
  color: $ink-500;
  font-size: $fs-cap;
}

.dispatch-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
  margin-top: $sp-3;
}

.dispatch-cell {
  min-height: 112rpx;
  padding: $sp-2;
  border-radius: $r-md;
  background: $surface-panel;
  border: 2rpx solid $line;
  box-sizing: border-box;
}

.dispatch-cell.primary {
  background: $color-primary-weak;
  border-color: $info-line;
}

.metric,
.metric-label {
  display: block;
}

.metric {
  @include tabular;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.25;
  font-weight: $fw-bold;
}

.metric-label {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
}

.assurance {
  margin-top: $sp-3;
  padding: $sp-3;
  border-radius: $r-md;
  background: $surface-panel;
  display: grid;
  gap: $sp-2;
}

.assurance-row {
  display: grid;
  grid-template-columns: 120rpx minmax(0, 1fr);
  gap: $sp-2;
  align-items: start;
}

.assurance-label,
.assurance-copy {
  display: block;
  font-size: $fs-cap;
  line-height: 1.45;
}

.assurance-label {
  color: $ink-500;
  font-weight: $fw-semibold;
}

.assurance-copy {
  color: $ink-700;
  font-weight: $fw-medium;
}

.quote-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
  margin-top: $sp-3;
}

.status-pill {
  min-height: 56rpx;
  padding: 0 $sp-2;
  border-radius: $r-pill;
  background: $success-bg;
  color: $success-ink;
  display: inline-flex;
  align-items: center;
  gap: $sp-1;
  font-size: $fs-cap;
  font-weight: $fw-semibold;
}

.capacity-copy {
  @include ellipsis(1);
  min-width: 0;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
  text-align: right;
}

</style>
