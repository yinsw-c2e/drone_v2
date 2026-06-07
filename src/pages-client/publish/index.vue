<template>
  <view class="page">
    <text class="muted">正在进入发单向导</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

onLoad(() => {
  uni.redirectTo({ url: '/pages-client/order/index' });
});
</script>
