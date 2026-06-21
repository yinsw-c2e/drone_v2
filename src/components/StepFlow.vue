<template>
  <view class="stepflow">
    <view v-for="(s, i) in steps" :key="i" :class="['sf-row', s.state]">
      <view class="sf-mark">
        <wd-icon v-if="s.state === 'done'" name="check" size="20rpx" />
        <text v-else class="sf-num">{{ i + 1 }}</text>
      </view>
      <view class="sf-body">
        <text class="sf-title">{{ s.title }}</text>
        <text v-if="s.time" class="sf-time">{{ s.time }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{ steps: Array<{ title: string; time?: string; state: 'done' | 'current' | 'todo' }> }>();
</script>

<style lang="scss" scoped>
.stepflow {
  display: flex;
  flex-direction: column;
  gap: $sp-3;
}

.sf-row {
  display: flex;
  align-items: center;
  gap: $sp-3;
}

.sf-mark {
  width: 44rpx;
  height: 44rpx;
  flex: 0 0 auto;
  border-radius: 50%;
  border: 2rpx solid $line-strong;
  background: $bg-sunken;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sf-num {
  font-size: $fs-cap;
  font-weight: $fw-bold;
  color: $ink-400;
}

.sf-mark :deep(.wd-icon) { color: $bg-page; }

.sf-row.done .sf-mark {
  background: $success;
  border-color: $success;
}

.sf-row.current .sf-mark {
  background: $color-primary;
  border-color: $color-primary;
  box-shadow: 0 0 0 6rpx $color-primary-weak;
}

.sf-row.current .sf-num { color: $on-primary; }

.sf-body { min-width: 0; }

.sf-title {
  display: block;
  font-size: $fs-body;
  font-weight: $fw-semibold;
  color: $ink-500;
  line-height: 1.35;
}

.sf-row.current .sf-title,
.sf-row.done .sf-title { color: $ink-900; }

.sf-time {
  display: block;
  margin-top: 2rpx;
  font-size: $fs-cap;
  color: $ink-400;
  line-height: 1.35;
}
</style>
