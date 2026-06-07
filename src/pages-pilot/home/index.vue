<template>
  <view class="page">
    <PageHeader title="任务与通知" :desc="`${user.nickname} · 在线任务、派单通知与飞行钱包`" :role="Role.Pilot" />

    <KpiStrip class="section" :items="kpis" />
    <wd-card class="section" title="飞行任务工作台">
      <wd-cell-group insert>
        <InfoCell title="任务状态" :value="order ? '任务中' : '待命'" />
        <InfoCell title="未读派单" :value="notifications.length ? `${notifications.length}条` : '0条'" />
        <InfoCell title="最近电量" desc="演示遥测，真实电量待真机接入" value="96%" />
      </wd-cell-group>
      <view class="home-actions">
        <wd-button type="info" plain block @click="openWallet">钱包</wd-button>
        <wd-button type="primary" block @click="openHall">接单</wd-button>
      </view>
    </wd-card>

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
        <wd-button class="open" type="primary" block @click="openTask">进入任务</wd-button>
      </view>
      <EmptyState v-else title="暂无任务" desc="进入接单大厅响应待匹配订单" action="去接单" @action="openHall" />
    </view>

    <IconActionGrid class="section" :columns="2" :actions="quickActions" @select="handleQuick" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import IconActionGrid from '@/components/IconActionGrid.vue';
import InfoCell from '@/components/InfoCell.vue';
import KpiStrip from '@/components/KpiStrip.vue';
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

.home-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-2;
}

</style>
