<template>
  <view class="page splash">
    <view class="brand-card">
      <text class="eyebrow">LOW ALTITUDE COMMAND</text>
      <text class="title">无人机货物吊运智慧服务平台</text>
      <text class="desc">业主、飞手、机主、后台共用同一数据源，订单流转刷新不丢。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

onLoad(() => {
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/login/index' });
  }, 120);
});
</script>

<style lang="scss" scoped>
.splash {
  display: flex;
  align-items: center;
}

.brand-card {
  @include card;
  width: 100%;
}

.eyebrow {
  display: block;
  font-size: $fs-cap;
  line-height: 1.4;
  color: $color-primary;
  font-weight: $fw-semibold;
}

.title {
  display: block;
  margin-top: $sp-2;
  font-size: $fs-h1;
  line-height: 1.25;
  font-weight: $fw-bold;
  color: $ink-900;
}

.desc {
  display: block;
  margin-top: $sp-3;
  font-size: $fs-body;
  line-height: 1.5;
  color: $ink-500;
}
</style>
