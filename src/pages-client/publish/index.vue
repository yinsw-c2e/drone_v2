<template>
  <view class="page wot-theme-dark">
    <PageHeader title="进入发单表单" desc="正在进入货物、地点、保险与预算表单。" :role="Role.Client" />
    <NoticeBar message="如未自动跳转，请返回业主首页后重新进入发单。" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';

onLoad(() => {
  uni.redirectTo({ url: '/pages-client/order/index' });
});
</script>
