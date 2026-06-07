<template>
  <text :class="['money', size, { bold, danger }]">
    <text class="sym">¥</text><text class="int">{{ intPart }}</text><text class="dec">.{{ decPart }}</text>
  </text>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { fen2yuan } from '@/utils/money';
const props = withDefaults(defineProps<{ fen: number; size?: 'display' | 'metric' | 'body'; bold?: boolean; danger?: boolean }>(), { size: 'body', bold: false, danger: false });
const yuan = computed(() => fen2yuan(Math.abs(props.fen)));
const intPart = computed(() => Math.floor(yuan.value).toString());
const decPart = computed(() => (yuan.value.toFixed(2).split('.')[1] ?? '00'));
</script>
<style lang="scss" scoped>
@import '../styles/tokens.scss';
.money { @include tabular; color: $ink-900; font-weight: $fw-semibold; line-height: 1.1; }
.money.bold { font-weight: $fw-bold; }
.money.danger { color: $danger-ink; }
.sym { font-size: $fs-sm; margin-right: 2rpx; }
.dec { font-size: $fs-sm; color: $ink-500; }
.body .int { font-size: $fs-body; }
.metric .int { font-size: $fs-metric; }
.display .int { font-size: $fs-display; }
</style>
