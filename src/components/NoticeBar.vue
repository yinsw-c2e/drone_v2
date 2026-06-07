<template>
  <wd-notice-bar
    :text="text"
    :type="noticeType"
    :scrollable="false"
    wrapable
    :prefix="prefix"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ message: string; title?: string; tone?: 'info' | 'success' | 'warning' | 'danger' }>(), {
  title: '',
  tone: 'info',
});

const text = computed(() => props.title ? `${props.title}：${props.message}` : props.message);
const noticeType = computed(() => props.tone === 'danger' ? 'danger' : props.tone === 'warning' ? 'warning' : 'info');
const prefix = computed(() => props.tone === 'success' ? 'check-outline' : props.tone === 'danger' ? 'error-fill' : 'warning');
</script>
