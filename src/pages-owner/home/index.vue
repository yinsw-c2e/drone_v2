<template>
  <view class="page">
    <PageHeader title="设备运营态势" :desc="`${user.nickname} · 设备合规、运力投放与分账钱包`" :role="Role.Owner" />

    <view class="metric-grid">
      <MetricCard label="设备数" :value="drones.length" hint="绑定设备" />
      <MetricCard label="在线运力" :value="onlineCapacity" hint="可参与匹配" delta="实时" delta-tone="up" />
    </view>

    <ActionCard tone="owner" eyebrow="运力调度" title="管理设备与运力" desc="上线前校验适航、载荷和三者险，合规后进入匹配池。" cta="调度" @action="openDevices" />
    <view class="section">
      <button class="secondary-button" @click="openWallet">查看分账钱包</button>
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
import MetricCard from '@/components/MetricCard.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
const onlineCapacity = computed(() => repo.capacity.where((c) => c.ownerId === user.value.id && c.status === 'online').length);

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
</script>

<style lang="scss" scoped>
.desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  color: $ink-500;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $sp-2;
}
</style>
