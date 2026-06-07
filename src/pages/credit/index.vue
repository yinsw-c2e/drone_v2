<template>
  <view class="page">
    <PageHeader title="信用风控" desc="三方信用维度来自 repo.credits，黑名单会阻断发单与匹配。" :role="role" />

    <view class="card section">
      <view class="between">
        <text class="section-title">{{ user.nickname }}</text>
        <text :class="['risk', user.blacklisted ? 'blocked' : '']">{{ user.blacklisted ? '黑名单' : '正常' }}</text>
      </view>
      <text class="score">{{ credit?.total ?? 0 }}</text>
      <text class="muted">{{ credit?.level ?? '待计算' }} 级 · 当前角色信用雷达</text>
      <view class="radar">
        <view v-for="dim in dimensions" :key="dim.name" class="bar-line">
          <text class="bar-name">{{ dim.name }}</text>
          <view class="bar"><view class="fill" :style="{ width: percent(dim.score, dim.max) }" /></view>
          <text class="bar-num">{{ dim.score }}/{{ dim.max }}</text>
        </view>
      </view>
    </view>

    <view v-if="role === Role.Admin" class="card section">
      <text class="section-title">黑名单管理</text>
      <view v-for="item in users" :key="item.id" class="user-line">
        <view>
          <text class="name">{{ item.nickname }}</text>
          <text class="muted">{{ item.currentRole }} · {{ item.blacklisted ? '已阻断' : '可交易' }}</text>
        </view>
        <button :class="[item.blacklisted ? 'primary-button' : 'danger-button', 'small']" @click="toggle(item.id)">{{ item.blacklisted ? '解除' : '拉黑' }}</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import { ensureDemoCredit, setUserBlacklist } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

ensureDemoCredit();
const userStore = useUserStore();
const role = computed(() => userStore.user.currentRole);
const user = computed(() => userStore.user);
const credit = computed(() => repo.credits.find(user.value.id));
const dimensions = computed(() => credit.value?.dimensions ?? []);
const users = computed(() => repo.users.all());

function percent(score: number, max: number) {
  return `${Math.round((score / max) * 100)}%`;
}

function toggle(id: string) {
  const target = repo.users.find(id);
  if (target) setUserBlacklist(id, !target.blacklisted);
}
</script>

<style lang="scss" scoped>
.risk {
  padding: $sp-1 $sp-2;
  border-radius: $r-pill;
  background: $success-bg;
  color: $success-ink;
  font-size: $fs-cap;
}

.risk.blocked {
  background: $danger-bg;
  color: $danger-ink;
}

.score {
  @include tabular;
  display: block;
  margin-top: $sp-3;
  color: $ink-900;
  font-size: $fs-display;
  font-weight: $fw-bold;
}

.radar {
  display: grid;
  gap: $sp-3;
  margin-top: $sp-4;
}

.bar-line,
.user-line {
  display: grid;
  grid-template-columns: 140rpx 1fr 96rpx;
  align-items: center;
  gap: $sp-2;
}

.user-line {
  grid-template-columns: 1fr 112rpx;
  min-height: 112rpx;
  border-bottom: 2rpx solid $line;
}

.bar-name,
.bar-num,
.name {
  color: $ink-900;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
}

.bar-num {
  @include tabular;
  text-align: right;
}

.bar {
  height: $sp-2;
  border-radius: $r-pill;
  background: $bg-sunken;
  overflow: hidden;
}

.fill {
  height: 100%;
  border-radius: $r-pill;
  background: $color-primary;
}

.small {
  min-height: 72rpx;
  font-size: $fs-sm;
}
</style>
