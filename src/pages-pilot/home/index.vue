<template>
  <view class="page">
    <PageHeader title="任务与通知" :desc="`${user.nickname} · 在线任务、派单通知与飞行钱包`" :role="Role.Pilot" />

    <view class="metric-grid">
      <MetricCard label="信用分" :value="credit?.total ?? 0" :hint="credit ? credit.level + ' 级' : '实时计算'" />
      <MetricCard label="通知" :value="notifications.length" hint="未读派单" delta="推送" />
    </view>

    <ActionCard tone="pilot" eyebrow="下一任务" title="进入接单大厅" desc="只展示当前飞手可承接、预算内、合规运力可用的订单。" cta="接单" @action="openHall" />

    <view class="section">
      <SectionHeader title="当前任务" desc="有任务时直接进入驾驶舱；无任务时从大厅接单。" action="钱包" @action="openWallet" />
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
      <EmptyState v-else title="暂无任务" desc="进入接单大厅响应 Matching 订单" action="去接单" @action="openHall" />
    </view>

    <view class="quick-actions section">
      <button class="secondary-button" @click="openAuth">认证</button>
      <button class="secondary-button" @click="openCredit">信用</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ActionCard from '@/components/ActionCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import MetricCard from '@/components/MetricCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionHeader from '@/components/SectionHeader.vue';
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

function openHall() {
  uni.navigateTo({ url: '/pages-pilot/hall/index' });
}

function openTask() {
  uni.navigateTo({ url: '/pages-pilot/task/index' });
}

function openWallet() {
  uni.navigateTo({ url: '/pages-pilot/wallet/index' });
}

function openAuth() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function openCredit() {
  uni.navigateTo({ url: '/pages/credit/index' });
}
</script>

<style lang="scss" scoped>
.desc,
.task-meta {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
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

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $sp-2;
}
</style>
