<template>
  <button :class="['action-card', tone]" @click="$emit('action')">
    <view class="copy">
      <text v-if="eyebrow" class="eyebrow">{{ eyebrow }}</text>
      <text class="title">{{ title }}</text>
      <text v-if="desc" class="desc">{{ desc }}</text>
    </view>
    <text class="cta">{{ cta }}</text>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ title: string; desc?: string; cta: string; eyebrow?: string; tone?: 'primary' | 'owner' | 'pilot' | 'neutral' }>(), {
  desc: '',
  eyebrow: '',
  tone: 'primary',
});
defineEmits<{ (e: 'action'): void }>();
</script>

<style lang="scss" scoped>
.action-card {
  width: 100%;
  min-height: 176rpx;
  padding: $sp-4;
  border-radius: $r-lg;
  background: $color-primary-weak;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: $sp-3;
  text-align: left;
  box-shadow: $shadow-1;
}

.action-card:active {
  box-shadow: $shadow-2;
}

.copy {
  min-width: 0;
}

.eyebrow {
  display: block;
  margin-bottom: $sp-1;
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.title {
  display: block;
  color: $ink-900;
  font-size: $fs-h2;
  line-height: 1.3;
  font-weight: $fw-bold;
}

.desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.cta {
  min-width: 112rpx;
  min-height: 88rpx;
  border-radius: $r-md;
  color: $on-primary;
  background: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $fs-body;
  font-weight: $fw-semibold;
}

.owner {
  background: $role-owner-weak;
}

.owner .eyebrow {
  color: $role-owner;
}

.owner .cta {
  background: $role-owner;
}

.pilot {
  background: $role-pilot-weak;
}

.pilot .eyebrow {
  color: $role-pilot;
}

.pilot .cta {
  background: $role-pilot;
}

.neutral {
  background: $bg-card;
}
</style>
