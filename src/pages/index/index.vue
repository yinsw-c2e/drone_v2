<template>
  <view class="page splash">
    <view class="brand-card">
      <PageHeader eyebrow="低空吊运平台" title="无人机货物吊运智慧服务平台" desc="业主、飞手、机主、后台贯通协同，订单流转刷新不丢。" compact />
      <view class="state-card">
        <text class="status-copy">正在加载低空指挥中心，进入后可按角色完成发单、匹配、飞行、结算与评价。</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import PageHeader from '@/components/PageHeader.vue';

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

</style>
