<template>
  <view :class="['admin-data-panel', wide ? 'wide' : '']">
    <view class="panel-head">
      <view>
        <text class="title">{{ title }}</text>
        <text v-if="desc" class="desc">{{ desc }}</text>
      </view>
      <button v-if="action" class="panel-action" @click="$emit('action')">{{ action }}</button>
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; desc?: string; action?: string; wide?: boolean }>(), {
  desc: '',
  action: '',
  wide: false,
});
defineEmits<{ (e: 'action'): void }>();
</script>

<style lang="scss" scoped>
.admin-data-panel {
  @include card;
  padding: 0;
  overflow: hidden;
}

.panel-head {
  min-height: 104rpx;
  padding: $sp-4;
  border-bottom: 2rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
  background: $bg-card;
}

.title,
.desc {
  display: block;
}

.title {
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.desc {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
}

.panel-action {
  min-width: 104rpx;
  min-height: 72rpx;
  padding: 0 $sp-3;
  border-radius: $r-sm;
  background: $color-primary-weak;
  color: $color-primary;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
}

:deep(.panel-body) {
  padding: $sp-4;
}
</style>
