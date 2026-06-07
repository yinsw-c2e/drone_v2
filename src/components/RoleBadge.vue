<template>
  <view :class="['role-badge', role]">
    <text class="role-dot" />
    <text>{{ label }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Role } from '@/models';

const props = defineProps<{ role: Role }>();
const label = computed(() => {
  if (props.role === Role.Pilot) return '飞手';
  if (props.role === Role.Owner) return '机主';
  if (props.role === Role.Admin) return '后台';
  return '业主';
});
</script>

<style lang="scss" scoped>
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: $sp-1;
  padding: 6rpx 16rpx;
  border-radius: $r-pill;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-medium;
}

.role-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
}

.client {
  color: $role-client;
  background: $role-client-weak;
}

.client .role-dot {
  background: $role-client;
}

.pilot {
  color: $role-pilot;
  background: $role-pilot-weak;
}

.pilot .role-dot {
  background: $role-pilot;
}

.owner {
  color: $role-owner;
  background: $role-owner-weak;
}

.owner .role-dot {
  background: $role-owner;
}

.admin {
  color: $ink-700;
  background: $bg-sunken;
}

.admin .role-dot {
  background: $ink-700;
}
</style>
