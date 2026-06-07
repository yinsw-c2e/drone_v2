<template>
  <view class="page">
    <PageHeader title="进入运营工作台" desc="正在进入运营、审核、风控与报表工作台。" :role="Role.Admin" />
    <NoticeBar message="当前为演示环境；真实服务端审计、权限和数据仓待生产环境接入。" />
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
