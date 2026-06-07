<template>
  <wd-steps vertical :active="activeIndex">
    <wd-step
      v-for="(s, i) in steps"
      :key="i"
      :title="s.title"
      :description="s.time || ''"
      :status="s.state === 'current' ? 'process' : s.state === 'done' ? 'finished' : 'wait'"
    />
  </wd-steps>
</template>
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ steps: Array<{ title: string; time?: string; state: 'done' | 'current' | 'todo' }> }>();
const activeIndex = computed(() => Math.max(0, props.steps.findIndex((step) => step.state === 'current')));
</script>
