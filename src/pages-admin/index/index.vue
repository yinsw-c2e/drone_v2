<template>
  <view class="page">
    <PageHeader title="管理后台" desc="正在进入运营、审核、风控与报表工作台。" :role="Role.Admin" />
    <NoticeBar message="后台 H5 使用同一 repo 聚合数据，真实服务端审计与权限仍属于生产化交付。" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';

onLoad(() => {
  uni.redirectTo({ url: '/pages-admin/dashboard/index' });
});
</script>
