<template>
  <view :class="['page-header', { compact }]">
    <view class="copy">
      <text v-if="eyebrow" class="eyebrow">{{ eyebrow }}</text>
      <text class="title">{{ title }}</text>
      <text v-if="desc" class="desc">{{ desc }}</text>
    </view>
    <slot name="aside">
      <RoleBadge v-if="role" :role="role" />
    </slot>
  </view>
</template>

<script setup lang="ts">
import RoleBadge from './RoleBadge.vue';
import type { Role } from '@/models';

withDefaults(defineProps<{ title: string; desc?: string; eyebrow?: string; role?: Role; compact?: boolean }>(), {
  desc: '',
  eyebrow: '',
  role: undefined,
  compact: false,
});
</script>

<style lang="scss" scoped>
.page-header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: flex-start;
  gap: $sp-3;
  margin-bottom: $sp-4;
}

.page-header.compact {
  margin-bottom: $sp-3;
}

.copy {
  min-width: 0;
}

.eyebrow {
  display: block;
  margin-bottom: $sp-1;
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.title {
  display: block;
  color: $ink-900;
  font-size: $fs-h1;
  line-height: 1.25;
  font-weight: $fw-bold;
}

.desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}
</style>
