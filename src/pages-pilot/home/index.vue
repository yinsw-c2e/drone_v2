<template>
  <view class="page">
    <PageHeader title="任务与通知" :desc="`${user.nickname} · 在线任务、派单通知与飞行钱包`" :role="Role.Pilot" />

    <RouteHero
      class="section"
      tone="pilot"
      eyebrow="飞行任务驾驶舱"
      title="待命航线"
      :subtitle="order ? '当前任务可直接进入驾驶舱。' : '暂无锁定任务，进入大厅接收可承接订单。'"
      :from="order?.from.address ?? '北京低空货运中心'"
      :to="order?.to.address ?? '顺义临空交付点'"
      :status="order ? '任务已锁定' : '待命在线'"
      :eta="notifications.length ? `${notifications.length}条` : '待命'"
      :distance="order ? '任务中' : '5km'"
      battery="96%"
      primary="接单"
      secondary="钱包"
      @primary="openHall"
      @secondary="openWallet"
    />

    <KpiStrip class="section" :items="kpis" />

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

    <IconActionGrid class="section" :columns="2" :actions="quickActions" @select="handleQuick" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import IconActionGrid from '@/components/IconActionGrid.vue';
import KpiStrip from '@/components/KpiStrip.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteHero from '@/components/RouteHero.vue';
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
const kpis = computed(() => [
  { label: '信用分', value: credit.value?.total ?? 0, hint: credit.value ? `${credit.value.level}级` : '实时计算', tone: 'success' as const },
  { label: '通知', value: notifications.value.length, hint: '未读派单', tone: notifications.value.length ? 'warning' as const : 'neutral' as const },
  { label: '任务', value: order.value ? '1' : '0', hint: order.value ? '执行中' : '待接单', tone: 'info' as const },
]);
const quickActions = [
  { key: 'auth', title: '认证', desc: '资质材料', symbol: '证', status: '可更新', tone: 'pilot' as const },
  { key: 'credit', title: '信用', desc: '飞行表现', symbol: '信', status: '实时', tone: 'success' as const },
];

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

function handleQuick(key: string) {
  if (key === 'auth') openAuth();
  if (key === 'credit') openCredit();
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

</style>
