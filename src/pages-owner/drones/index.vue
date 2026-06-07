<template>
  <view class="page">
    <text class="muted">正在进入设备管理</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

onLoad(() => {
  uni.redirectTo({ url: '/pages-owner/devices/index' });
});
</script>
