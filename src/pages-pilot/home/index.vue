<template>
  <view class="page">
    <view class="top">
      <view>
        <text class="title">飞手驾驶舱</text>
        <text class="desc">{{ user.nickname }} · 在线任务与派单通知</text>
      </view>
      <RoleBadge :role="Role.Pilot" />
    </view>

    <view class="metrics">
      <MetricCard label="信用分" :value="credit?.total ?? 0" :hint="credit ? credit.level + ' 级' : '实时计算'" />
      <MetricCard label="通知" :value="notifications.length" hint="未读派单" delta="推送" />
    </view>

    <view class="section">
      <view class="between">
        <text class="section-title">任务大厅</text>
        <button class="link" @click="ensureOrder">拉取</button>
      </view>
      <view v-if="order" class="card task-card">
        <view class="between">
          <text class="task-title">{{ order.cargo.remark || '吊运任务' }}</text>
          <StatusTag :status="order.status" />
        </view>
        <view class="task-meta">
          <text>{{ order.from.address }}</text>
          <text>{{ order.to.address }}</text>
        </view>
        <button class="primary-button open" @click="openTask">进入任务</button>
      </view>
      <EmptyState v-else title="暂无任务" desc="业主发单并确认后将在这里出现" action="生成演示订单" @action="ensureOrder" />
    </view>

    <view class="section">
      <button class="secondary-button" @click="openWallet">查看钱包</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import MetricCard from '@/components/MetricCard.vue';
import RoleBadge from '@/components/RoleBadge.vue';
import StatusTag from '@/components/StatusTag.vue';
import { Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const orderStore = useOrderStore();
const user = computed(() => userStore.user.currentRole === Role.Pilot ? userStore.user : userStore.loginAs(Role.Pilot));
const credit = computed(() => repo.credits.find(user.value.id));
const notifications = computed(() => repo.notifications.where((n) => n.userId === user.value.id && !n.read));
const order = computed(() => orderStore.activeOrder ?? repo.orders.where((o) => o.pilotId === user.value.id)[0]);

function ensureOrder() {
  orderStore.ensureOrder();
}

function openTask() {
  uni.navigateTo({ url: '/pages-pilot/task/index' });
}

function openWallet() {
  uni.navigateTo({ url: '/pages-pilot/wallet/index' });
}
</script>

<style lang="scss" scoped>
.top,
.metrics {
  display: grid;
  gap: $sp-3;
}

.top {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.metrics {
  grid-template-columns: 1fr 1fr;
  margin-top: $sp-4;
}

.title {
  display: block;
  font-size: $fs-h1;
  line-height: 1.25;
  font-weight: $fw-bold;
  color: $ink-900;
}

.desc,
.task-meta {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.link {
  color: $color-primary;
  font-size: $fs-sm;
}

.task-card {
  margin-top: $sp-3;
}

.task-title {
  font-size: $fs-h3;
  font-weight: $fw-semibold;
  color: $ink-900;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: $sp-1;
}

.open {
  margin-top: $sp-3;
}
</style>
