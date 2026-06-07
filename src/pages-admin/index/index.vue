<template>
  <view class="page">
    <text class="muted">正在进入管理后台</text>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';

onLoad(() => {
  uni.redirectTo({ url: '/pages-admin/dashboard/index' });
});
</script>
