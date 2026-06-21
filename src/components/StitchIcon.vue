<template>
  <text class="stitch-icon" :class="{ fill }" :style="iconStyle">{{ name }}</text>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  name: string;
  size?: string | number;
  fill?: boolean;
}>(), {
  size: '24rpx',
  fill: false,
});

const normalizedSize = computed(() => (typeof props.size === 'number' ? `${props.size}rpx` : props.size));
const iconStyle = computed(() => ({
  fontFamily: `'Material Symbols Outlined'`,
  fontWeight: 400,
  fontStyle: 'normal',
  letterSpacing: '0',
  textTransform: 'none',
  fontSize: normalizedSize.value,
  width: normalizedSize.value,
  height: normalizedSize.value,
  lineHeight: normalizedSize.value,
  fontVariationSettings: `'FILL' ${props.fill ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
}));
</script>

<style lang="scss" scoped>
.stitch-icon {
  font-family: 'Material Symbols Outlined';
  font-weight: 400;
  font-style: normal;
  letter-spacing: 0;
  text-transform: none;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  overflow: hidden;
  text-rendering: optimizeLegibility;
  -webkit-font-feature-settings: 'liga';
  font-feature-settings: 'liga';
}
</style>
