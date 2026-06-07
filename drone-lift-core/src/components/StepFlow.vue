<template>
  <view class="flow">
    <view v-for="(s, i) in steps" :key="i" class="step">
      <view class="rail">
        <view :class="['node', s.state]">
          <text v-if="s.state === 'done'" class="ck">✓</text>
        </view>
        <view v-if="i < steps.length - 1" :class="['link', s.state === 'done' ? 'done' : '']" />
      </view>
      <view class="body">
        <text :class="['title', s.state]">{{ s.title }}</text>
        <text v-if="s.time" class="time">{{ s.time }}</text>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
defineProps<{ steps: Array<{ title: string; time?: string; state: 'done' | 'current' | 'todo' }> }>();
</script>
<style lang="scss" scoped>
@import '../styles/tokens.scss';
.flow { display: flex; flex-direction: column; }
.step { display: flex; gap: $sp-3; }
.rail { display: flex; flex-direction: column; align-items: center; }
.node { width: 36rpx; height: 36rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2rpx solid $line; background: $bg-card; box-sizing: border-box; }
.node.done { background: $color-primary; border-color: $color-primary; }
.node.current { border-color: $color-primary; box-shadow: 0 0 0 6rpx $color-primary-weak; }
.node.todo { background: $bg-card; }
.ck { color: $on-primary; font-size: $fs-cap; line-height: 1; }
.link { width: 2rpx; flex: 1; min-height: 36rpx; background: $line; }
.link.done { background: $color-primary; }
.body { padding-bottom: $sp-4; }
.title { display: block; font-size: $fs-body; color: $ink-700; font-weight: $fw-medium; }
.title.current { color: $ink-900; font-weight: $fw-semibold; }
.title.todo { color: $ink-400; }
.time { display: block; font-size: $fs-cap; color: $ink-500; margin-top: 4rpx; }
</style>
