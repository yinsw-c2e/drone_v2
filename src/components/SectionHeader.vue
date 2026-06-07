<template>
  <view class="section-header">
    <view class="copy">
      <text class="title">{{ title }}</text>
      <text v-if="desc" class="desc">{{ desc }}</text>
    </view>
    <button v-if="action" class="action" @click="$emit('action')">{{ action }}</button>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; desc?: string; action?: string }>(), {
  desc: '',
  action: '',
});
defineEmits<{ (e: 'action'): void }>();
</script>

<style lang="scss" scoped>
.section-header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: $sp-3;
  margin-bottom: $sp-3;
}

.copy {
  min-width: 0;
}

.title {
  display: block;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.action {
  min-height: 72rpx;
  padding: 0 $sp-3;
  border-radius: $r-pill;
  color: $color-primary;
  background: $color-primary-weak;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
}
</style>
