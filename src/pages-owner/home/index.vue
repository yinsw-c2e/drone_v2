<template>
  <view class="page">
    <PageHeader title="设备运营态势" :desc="`${user.nickname} · 设备合规、运力投放与分账钱包`" :role="Role.Owner" />

    <RouteHero
      class="section"
      tone="owner"
      eyebrow="资产与运力调度台"
      title="合规运力池"
      subtitle="适航、载荷、三者险和维护记录通过后进入匹配池。"
      status="设备合规门"
      :eta="`${onlineCapacity}在线`"
      :distance="`${drones.length}设备`"
      battery="T+7"
      primary="调度"
      secondary="钱包"
      @primary="openDevices"
      @secondary="openWallet"
    />

    <KpiStrip class="section" :items="kpis" />
    <IconActionGrid class="section" :columns="3" :actions="quickActions" @select="handleQuick" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import IconActionGrid from '@/components/IconActionGrid.vue';
import KpiStrip from '@/components/KpiStrip.vue';
import PageHeader from '@/components/PageHeader.vue';
import RouteHero from '@/components/RouteHero.vue';
import { Role } from '@/models';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const onlineCapacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id && c.status === 'online').length);
const kpis = computed(() => [
  { label: '设备数', value: drones.value.length, hint: '绑定资产', tone: 'neutral' as const },
  { label: '在线运力', value: onlineCapacity.value, hint: '可匹配', tone: 'success' as const },
  { label: '保险门槛', value: '500万', hint: '三者险', tone: 'warning' as const },
]);
const quickActions = [
  { key: 'devices', title: '设备', desc: '投放撤回', symbol: '机', status: '资产', tone: 'owner' as const },
  { key: 'auth', title: '认证', desc: '适航/UOM', symbol: '证', status: '合规', tone: 'warning' as const },
  { key: 'credit', title: '信用', desc: '协作评分', symbol: '信', status: '实时', tone: 'success' as const },
];

function openDevices() {
  uni.navigateTo({ url: '/pages-owner/devices/index' });
}

function openWallet() {
  uni.navigateTo({ url: '/pages-owner/wallet/index' });
}

function openAuth() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function openCredit() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function handleQuick(key: string) {
  if (key === 'devices') openDevices();
  if (key === 'auth') openAuth();
  if (key === 'credit') openCredit();
}
</script>

<style lang="scss" scoped>
.desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  color: $ink-500;
}
</style>
