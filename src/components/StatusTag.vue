<template>
  <wd-tag round :type="tagType">{{ meta.label }}</wd-tag>
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
const tagType = computed(() => {
  if (meta.value.tone === 'danger') return 'danger';
  if (meta.value.tone === 'warning') return 'warning';
  if (meta.value.tone === 'success') return 'success';
  if (meta.value.tone === 'muted') return 'default';
  return 'primary';
});
</script>
