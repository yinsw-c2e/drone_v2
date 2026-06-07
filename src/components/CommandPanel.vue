<template>
  <view :class="['command-panel', tone]">
    <view class="copy">
      <text v-if="eyebrow" class="eyebrow">{{ eyebrow }}</text>
      <text class="title">{{ title }}</text>
      <text v-if="desc" class="desc">{{ desc }}</text>
    </view>
    <view class="actions">
      <button v-if="secondary" class="secondary-button panel-button" @click="$emit('secondary')">{{ secondary }}</button>
      <button class="primary-button panel-button" :disabled="disabled" @click="$emit('primary')">{{ primary }}</button>
    </view>
    <text v-if="reason" class="reason">{{ reason }}</text>
  </view>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  desc?: string;
  eyebrow?: string;
  primary: string;
  secondary?: string;
  disabled?: boolean;
  reason?: string;
  tone?: 'client' | 'pilot' | 'owner' | 'admin' | 'danger';
}>(), {
  desc: '',
  eyebrow: '',
  secondary: '',
  reason: '',
  tone: 'client',
});
defineEmits<{ (e: 'primary'): void; (e: 'secondary'): void }>();
</script>

<style lang="scss" scoped>
.command-panel {
  @include card;
  display: grid;
  gap: $sp-3;
  border-left: 8rpx solid $color-primary;
}

.eyebrow,
.title,
.desc,
.reason {
  display: block;
}

.eyebrow {
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.title {
  margin-top: $sp-1;
  color: $ink-900;
  font-size: $fs-h2;
  line-height: 1.25;
  font-weight: $fw-bold;
}

.desc {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-2;
}

.actions .panel-button:first-child:last-child {
  grid-column: 1 / -1;
}

.reason {
  padding: $sp-2;
  border-radius: $r-sm;
  background: $warning-bg;
  color: $warning-ink;
  font-size: $fs-sm;
  line-height: 1.45;
}

.pilot {
  border-left-color: $role-pilot;
}

.pilot .eyebrow {
  color: $role-pilot;
}

.owner {
  border-left-color: $role-owner;
}

.owner .eyebrow {
  color: $role-owner;
}

.danger {
  border-left-color: $danger;
}

.danger .eyebrow {
  color: $danger-ink;
}
</style>
