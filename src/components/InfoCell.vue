<template>
  <wd-cell :clickable="clickable" :is-link="isLink" value-align="left" @click="$emit('click')">
    <view class="info-cell">
      <view class="copy">
        <text class="title">{{ title }}</text>
        <text v-if="desc" class="desc">{{ desc }}</text>
      </view>
      <view v-if="value || $slots.side" class="side">
        <slot name="side">
          <text class="value">{{ value }}</text>
        </slot>
      </view>
    </view>
  </wd-cell>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; desc?: string; value?: string | number; clickable?: boolean; isLink?: boolean }>(), {
  desc: '',
  value: '',
  clickable: false,
  isLink: false,
});
defineEmits<{ (e: 'click'): void }>();
</script>

<style lang="scss" scoped>
.info-cell {
  width: 100%;
  min-height: 88rpx;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: $sp-3;
  align-items: center;
}

.copy {
  min-width: 0;
}

.title,
.desc,
.value {
  display: block;
}

.title {
  color: $ink-900;
  font-size: $fs-body;
  line-height: 1.45;
  font-weight: $fw-semibold;
}

.desc {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.side {
  max-width: 240rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
}

.value {
  @include tabular;
  color: $ink-700;
  font-size: $fs-body;
  line-height: 1.45;
  font-weight: $fw-semibold;
}
</style>
