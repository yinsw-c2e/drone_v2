<template>
  <view class="stage-stepper">
    <view v-for="(step, index) in steps" :key="step.title" :class="['stage', step.state]">
      <view class="node">
        <text v-if="step.state === 'done'">✓</text>
        <text v-else>{{ index + 1 }}</text>
      </view>
      <view class="copy">
        <text class="title">{{ step.title }}</text>
        <text v-if="step.desc" class="desc">{{ step.desc }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ steps: Array<{ title: string; desc?: string; state: 'done' | 'current' | 'todo' }> }>();
</script>

<style lang="scss" scoped>
.stage-stepper {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: $sp-2;
}

.stage {
  min-height: 108rpx;
  border-radius: $r-md;
  padding: $sp-2;
  background: $bg-sunken;
  border: 2rpx solid $line;
}

.node {
  width: 40rpx;
  height: 40rpx;
  border-radius: $r-pill;
  background: $bg-card;
  color: $ink-500;
  border: 2rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-cap;
  font-weight: $fw-semibold;
}

.copy {
  margin-top: $sp-2;
}

.title,
.desc {
  display: block;
}

.title {
  color: $ink-700;
  font-size: $fs-cap;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.desc {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.35;
}

.stage.done,
.stage.current {
  background: $color-primary-weak;
  border-color: $blue-200;
}

.stage.done .node,
.stage.current .node {
  background: $color-primary;
  border-color: $color-primary;
  color: $on-primary;
}

.stage.current .title {
  color: $color-primary;
}
</style>
