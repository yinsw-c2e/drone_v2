<template>
  <view class="action-grid" :class="`cols-${columns}`">
    <button v-for="item in actions" :key="item.key" :class="['action-item', item.tone ?? 'info']" @click="$emit('select', item.key)">
      <view class="action-icon">
        <wd-icon v-if="item.icon" :name="item.icon" size="36rpx" />
        <text v-else>{{ item.symbol ?? item.title.slice(0, 1) }}</text>
      </view>
      <view class="action-copy">
        <text class="action-title">{{ item.title }}</text>
        <text v-if="item.desc" class="action-desc">{{ item.desc }}</text>
      </view>
      <text v-if="item.status" class="action-status">{{ item.status }}</text>
    </button>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  columns?: 2 | 3 | 4;
  actions: Array<{ key: string; title: string; desc?: string; icon?: string; symbol?: string; status?: string; tone?: 'info' | 'success' | 'warning' | 'danger' | 'owner' | 'pilot' }>;
}>(), {
  columns: 3,
});
defineEmits<{ (e: 'select', key: string): void }>();
</script>

<style lang="scss" scoped>
.action-grid {
  display: grid;
  gap: $sp-2;
  padding: $sp-2;
  border-radius: $r-lg;
  background:
    linear-gradient(0deg, rgba(132, 148, 149, .05) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(132, 148, 149, .05) 1rpx, transparent 1rpx),
    $bg-card;
  background-size: 32rpx 32rpx;
  border: 2rpx solid $hairline;
  box-shadow: $shadow-card;
  overflow: hidden;
}

.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.action-item {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 128rpx;
  padding: $sp-3 $sp-2;
  margin: 0;
  border-radius: $r-md;
  background: rgba(10, 14, 24, .58);
  border: 2rpx solid rgba(132, 148, 149, .12);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $sp-1;
  box-shadow: none;
  box-sizing: border-box;
}

.action-item::after {
  border: 0;
}

.action-item:active {
  transform: translateY(2rpx);
  background: $surface-panel;
  box-shadow: none;
}

.action-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: $r-pill;
  background: $color-primary-weak;
  color: $color-primary;
  border: 2rpx solid $info-line;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  box-shadow: none;
}

.action-icon :deep(.wd-icon) { color: currentColor; }

.action-copy {
  min-width: 0;
  width: 100%;
}

.action-title,
.action-desc,
.action-status {
  display: block;
}

.action-title {
  color: $ink-900;
  font-size: $fs-sm;
  line-height: 1.3;
  font-weight: $fw-bold;
  letter-spacing: .3rpx;
  @include ellipsis(1);
}

.action-desc {
  margin-top: 4rpx;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
  @include ellipsis(1);
}

.action-status {
  margin-top: 0;
  min-height: auto;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.35;
  font-weight: $fw-semibold;
  display: block;
  @include ellipsis(1);
}

.cols-3 .action-item {
  min-height: 124rpx;
  padding: $sp-2;
}

.cols-3 .action-icon {
  width: 46rpx;
  height: 46rpx;
  font-size: $fs-sm;
}

.cols-3 .action-title {
  font-size: $fs-sm;
}

.cols-3 .action-desc {
  display: none;
}

.success .action-icon {
  color: $success-ink;
  background: $success-bg;
  border-color: $success-line;
}

.warning .action-icon {
  color: $warning-ink;
  background: $warning-bg;
  border-color: $warning-line;
}

.danger .action-icon {
  color: $danger-ink;
  background: $danger-bg;
  border-color: $danger-line;
}

.owner .action-icon {
  color: $role-owner;
  background: $role-owner-weak;
  border-color: $role-owner-weak;
}

.pilot .action-icon {
  color: $role-pilot;
  background: $role-pilot-weak;
  border-color: $role-pilot-weak;
}

.success .action-status { color: $success-ink; }
.warning .action-status { color: $warning-ink; }
.danger .action-status { color: $danger-ink; }
.owner .action-status { color: $role-owner; }
.pilot .action-status { color: $role-pilot; }
</style>
