<template>
  <view class="page">
    <text class="muted">正在进入飞手驾驶舱</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

onLoad(() => {
  uni.redirectTo({ url: '/pages-pilot/home/index' });
});
</script>
