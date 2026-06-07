<template>
  <view class="action-grid" :class="`cols-${columns}`">
    <button v-for="item in actions" :key="item.key" :class="['action-item', item.tone ?? 'info']" @click="$emit('select', item.key)">
      <view class="action-icon">
        <wd-icon v-if="item.icon" :name="item.icon" />
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
}

.cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.action-item {
  min-height: 144rpx;
  padding: $sp-3 $sp-2;
  border-radius: $r-md;
  background: $bg-card;
  border: 2rpx solid $line;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: $sp-2;
  box-shadow: $shadow-1;
}

.action-item:active {
  box-shadow: $shadow-2;
}

.action-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: $r-sm;
  background: $color-primary-weak;
  color: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-body;
  font-weight: $fw-bold;
}

.action-copy {
  min-width: 0;
}

.action-title,
.action-desc,
.action-status {
  display: block;
}

.action-title {
  color: $ink-900;
  font-size: $fs-sm;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.action-desc,
.action-status {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
}

.action-status {
  color: $color-primary;
  font-weight: $fw-semibold;
}

.success .action-icon {
  background: $success-bg;
  color: $success-ink;
}

.warning .action-icon {
  background: $warning-bg;
  color: $warning-ink;
}

.danger .action-icon {
  background: $danger-bg;
  color: $danger-ink;
}

.owner .action-icon {
  background: $role-owner-weak;
  color: $role-owner;
}

.pilot .action-icon {
  background: $role-pilot-weak;
  color: $role-pilot;
}
</style>
