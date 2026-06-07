<template>
  <view class="page">
    <view class="top">
      <view>
        <text class="title">机主管理台</text>
        <text class="desc">{{ user.nickname }} · 设备合规与运力投放</text>
      </view>
      <RoleBadge :role="Role.Owner" />
    </view>

    <view class="metrics">
      <MetricCard label="设备数" :value="drones.length" hint="绑定设备" />
      <MetricCard label="在线运力" :value="onlineCapacity" hint="可参与匹配" delta="实时" delta-tone="up" />
    </view>

    <view class="section">
      <button class="primary-button" @click="openDevices">管理设备与运力</button>
    </view>
    <view class="section">
      <button class="secondary-button" @click="openWallet">查看分账钱包</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MetricCard from '@/components/MetricCard.vue';
import RoleBadge from '@/components/RoleBadge.vue';
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

.desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  color: $ink-500;
}
</style>
