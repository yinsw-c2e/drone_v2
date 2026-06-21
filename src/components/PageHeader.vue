<template>
  <view :class="['page-header', role ? `role-${role}` : '', { compact }]">
    <view class="system-line">
      <view class="brand-mini">
        <view class="brand-dot" />
        <text>AeroCommand Pro</text>
      </view>
      <view class="sys-chip">
        <view class="sys-dot" />
        <text>SYS ONLINE</text>
      </view>
    </view>
    <view class="main-line">
      <view class="accent" />
      <view class="copy">
        <text v-if="eyebrow" class="eyebrow">{{ eyebrow }}</text>
        <text class="title">{{ title }}</text>
        <text v-if="desc" class="desc">{{ desc }}</text>
      </view>
      <slot name="aside">
        <RoleBadge v-if="role" :role="role" />
      </slot>
    </view>
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
  gap: $sp-3;
  margin-bottom: $sp-4;
  padding: $sp-3;
  border-radius: $r-lg;
  border: 2rpx solid $hairline;
  background:
    radial-gradient(90% 100% at 100% 0%, rgba(0, 242, 255, .12), transparent 60%),
    rgba(20, 24, 34, .92);
  box-shadow: $shadow-card;
}

.page-header.compact {
  margin-bottom: $sp-3;
}

.system-line,
.main-line {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $sp-3;
}

.system-line {
  align-items: center;
}

.brand-mini,
.sys-chip {
  min-height: 42rpx;
  display: inline-flex;
  align-items: center;
  gap: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  font-weight: $fw-bold;
  letter-spacing: 1.6rpx;
  text-transform: uppercase;
}

.brand-dot,
.sys-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}

.brand-dot {
  background: $color-primary;
  box-shadow: 0 0 0 8rpx rgba(0, 242, 255, .10);
}

.sys-chip {
  padding: 0 $sp-2;
  border-radius: $r-sm;
  border: 2rpx solid rgba(16, 185, 129, .22);
  color: $success-ink;
  background: rgba(16, 185, 129, .08);
}

.sys-dot {
  background: $success;
  box-shadow: 0 0 0 6rpx rgba(16, 185, 129, .14);
}

.accent {
  flex: 0 0 auto;
  width: 8rpx;
  align-self: stretch;
  min-height: 76rpx;
  border-radius: $r-pill;
  background: $grad-brand;
}

.role-client .accent { background: $grad-client; }
.role-pilot .accent { background: $grad-pilot; }
.role-owner .accent { background: $grad-owner; }
.role-admin .accent { background: $grad-admin; }

.copy {
  flex: 1;
  min-width: 0;
}

.eyebrow {
  @include section-label;
  display: block;
  margin-bottom: $sp-1;
  color: $color-primary;
}

.title {
  display: block;
  color: $ink-900;
  font-size: $fs-h1;
  line-height: 1.2;
  font-weight: $fw-bold;
  letter-spacing: 0;
}

.desc {
  display: block;
  margin-top: $sp-2;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}
</style>
