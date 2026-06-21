<template>
  <wd-card :class="['admin-data-panel', wide ? 'wide' : '']">
    <view class="panel-head">
      <view>
        <text class="title">{{ title }}</text>
        <text v-if="desc" class="desc">{{ desc }}</text>
      </view>
      <wd-button v-if="action" class="panel-action" type="info" plain @click="$emit('action')">{{ action }}</wd-button>
    </view>
    <slot />
  </wd-card>
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
  padding: 0;
  overflow: hidden;
  border: 2rpx solid $hairline;
  border-radius: $r-lg;
  box-shadow: $shadow-card;
  background: $bg-card;
}

.panel-head {
  min-height: 96rpx;
  padding: $sp-3 $sp-4;
  border-bottom: 2rpx solid $hairline;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
  background:
    radial-gradient(80% 90% at 100% 0%, rgba(0, 242, 255, .08), transparent 60%),
    $surface-panel;
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
  letter-spacing: .3rpx;
}

.desc {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.4;
}

:deep(.panel-body) {
  padding: $sp-4;
}
</style>
