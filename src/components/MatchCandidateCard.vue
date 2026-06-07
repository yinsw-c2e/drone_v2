<template>
  <view :class="['cand', { selected }]" @click="$emit('select', candidate)">
    <view class="head">
      <view class="who">
        <text class="name">{{ pilotName || ('飞手 ' + candidate.pilotId.slice(-4)) }}</text>
        <view class="credit"><text>信用 {{ candidate.creditScore }}</text></view>
      </view>
      <MoneyText :fen="candidate.quoteCent" size="metric" bold />
    </view>
    <view class="chips">
      <view class="chip"><text>{{ candidate.distanceKm }}km</text></view>
      <view class="chip"><text>约{{ candidate.etaMin }}分钟</text></view>
      <view class="chip"><text>机型 {{ candidate.droneId }}</text></view>
    </view>
    <view class="reasons">
      <text v-for="(r, i) in candidate.reasons.slice(0, 4)" :key="i" class="reason">{{ r }}</text>
    </view>
    <view v-if="selected" class="check">已选</view>
  </view>
</template>
<script setup lang="ts">
import MoneyText from './MoneyText.vue';
import type { MatchCandidate } from '@/models';
defineProps<{ candidate: MatchCandidate; pilotName?: string; selected?: boolean }>();
defineEmits<{ (e: 'select', c: MatchCandidate): void }>();
</script>
<style lang="scss" scoped>
@import '../styles/tokens.scss';
.cand { position: relative; @include card; margin-bottom: $sp-3; border: 2rpx solid transparent; }
.cand.selected { border-color: $color-primary; box-shadow: $shadow-2; }
.head { display: flex; justify-content: space-between; align-items: flex-start; }
.who { display: flex; flex-direction: column; gap: $sp-1; }
.name { font-size: $fs-h3; font-weight: $fw-semibold; color: $ink-900; }
.credit { align-self: flex-start; background: $success-bg; color: $success-ink; font-size: $fs-cap; padding: 2rpx 12rpx; border-radius: $r-pill; }
.chips { display: flex; flex-wrap: wrap; gap: $sp-2; margin-top: $sp-3; }
.chip { background: $bg-sunken; color: $ink-700; font-size: $fs-sm; padding: 6rpx 16rpx; border-radius: $r-sm; }
.reasons { display: flex; flex-wrap: wrap; gap: $sp-1; margin-top: $sp-2; }
.reason { font-size: $fs-cap; color: $color-primary; background: $color-primary-weak; padding: 2rpx 12rpx; border-radius: $r-sm; }
.check { position: absolute; top: 0; right: 0; background: $color-primary; color: $on-primary; font-size: $fs-cap; padding: 4rpx 16rpx; border-radius: 0 $r-md 0 $r-md; }
</style>
