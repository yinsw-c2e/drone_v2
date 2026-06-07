<template>
  <view :class="['tag', meta.tone]">
    <view class="dot" /><text class="label">{{ meta.label }}</text>
  </view>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { OrderStatus } from '@/models';
const props = defineProps<{ status: OrderStatus }>();
type Tone = 'info' | 'primary' | 'warning' | 'success' | 'muted' | 'danger';
const MAP: Record<OrderStatus, { label: string; tone: Tone }> = {
  [OrderStatus.Created]: { label: '待匹配', tone: 'info' },
  [OrderStatus.Matching]: { label: '匹配中', tone: 'primary' },
  [OrderStatus.Confirmed]: { label: '已接单', tone: 'primary' },
  [OrderStatus.AirspaceApplying]: { label: '空域审批', tone: 'warning' },
  [OrderStatus.Preparing]: { label: '飞行准备', tone: 'warning' },
  [OrderStatus.Loading]: { label: '装货中', tone: 'primary' },
  [OrderStatus.InFlight]: { label: '运输中', tone: 'primary' },
  [OrderStatus.Unloading]: { label: '卸货中', tone: 'primary' },
  [OrderStatus.Completed]: { label: '已完成', tone: 'success' },
  [OrderStatus.Settled]: { label: '已结算', tone: 'success' },
  [OrderStatus.Cancelled]: { label: '已取消', tone: 'muted' },
  [OrderStatus.Exception]: { label: '异常', tone: 'danger' },
};
const meta = computed(() => MAP[props.status]);
</script>
<style lang="scss" scoped>
@import '../styles/tokens.scss';
.tag { display: inline-flex; align-items: center; gap: $sp-1; padding: 6rpx 18rpx; border-radius: $r-pill; font-size: $fs-cap; line-height: 1; }
.dot { width: 10rpx; height: 10rpx; border-radius: 50%; }
.label { font-weight: $fw-medium; }
.info { background: $info-bg; color: $info-ink; } .info .dot { background: $info; }
.primary { background: $color-primary-weak; color: $blue-700; } .primary .dot { background: $color-primary; }
.warning { background: $warning-bg; color: $warning-ink; } .warning .dot { background: $warning; }
.success { background: $success-bg; color: $success-ink; } .success .dot { background: $success; }
.danger { background: $danger-bg; color: $danger-ink; } .danger .dot { background: $danger; }
.muted { background: $bg-sunken; color: $ink-500; } .muted .dot { background: $ink-400; }
</style>
