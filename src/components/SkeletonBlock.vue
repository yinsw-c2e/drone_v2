<template>
  <view class="skeleton" :style="{ height }" />
</template>

<script setup lang="ts">
withDefaults(defineProps<{ height?: string }>(), {
  height: '160rpx',
});
</script>

<style lang="scss" scoped>
.skeleton {
  border-radius: $r-md;
  background: $bg-sunken;
  overflow: hidden;
  position: relative;
}

.skeleton::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  background: $bg-card;
  opacity: .5;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  from {
    left: -40%;
  }

  to {
    left: 100%;
  }
}
</style>
