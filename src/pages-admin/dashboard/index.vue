<template>
  <view class="page admin-page">
    <view class="top">
      <view>
        <text class="title">运营管理后台</text>
        <text class="desc">审核、订单、风控、看板均来自 repo 实时聚合。</text>
      </view>
      <RoleBadge :role="Role.Admin" />
    </view>

    <view class="metrics">
      <MetricCard label="订单量" :value="metrics.orderCount" hint="全部订单" />
      <MetricCard label="完成数" :value="metrics.completedCount" hint="完成与已结算" delta-tone="up" />
      <MetricCard label="平台收入" :value="income" hint="技术服务费" />
      <MetricCard label="在线运力" :value="metrics.onlineCapacity" hint="可匹配容量" />
    </view>

    <view class="section card">
      <view class="between">
        <text class="section-title">端到端验收</text>
        <button class="link" @click="runFlow">跑通</button>
      </view>
      <text class="muted">生成订单、确认 Top1、空域合规、飞行、卸货、结算与分账。</text>
    </view>

    <view class="section card">
      <text class="section-title">认证审核</text>
      <view v-for="pilot in pilots" :key="pilot.userId" class="audit-line">
        <view>
          <text class="name">{{ userName(pilot.userId) }}</text>
          <text class="muted">执照 {{ pilot.caacLevel }} · {{ pilot.noCrimeProof }}</text>
        </view>
        <view class="audit-actions">
          <button class="secondary-button small" @click="rejectPilot(pilot.userId)">驳回</button>
          <button class="primary-button small" @click="approvePilot(pilot.userId)">通过</button>
        </view>
      </view>
    </view>

    <view class="section card">
      <text class="section-title">订单管理</text>
      <view v-for="item in orders" :key="item.id" class="order-line">
        <view>
          <text class="name">{{ item.cargo.remark || item.id }}</text>
          <text class="muted">{{ item.from.address }} → {{ item.to.address }}</text>
        </view>
        <StatusTag :status="item.status" />
      </view>
      <EmptyState v-if="!orders.length" title="暂无订单" desc="点击跑通生成端到端订单" />
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
import { approvePilotQualification, dashboardMetrics, rejectPilotQualification } from '@/services/app-flow';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
userStore.loginAs(Role.Admin);
const orderStore = useOrderStore();
const metrics = computed(() => dashboardMetrics());
const income = computed(() => `¥${(metrics.value.platformIncome / 100).toFixed(2)}`);
const pilots = computed(() => repo.pilots.all());
const orders = computed(() => repo.orders.all().reverse());

function userName(id: string) {
  return repo.users.find(id)?.nickname ?? id;
}

function approvePilot(userId: string) {
  approvePilotQualification(userId);
}

function rejectPilot(userId: string) {
  rejectPilotQualification(userId);
}

async function runFlow() {
  const order = orderStore.ensureOrder();
  if (!order.pilotId) {
    await orderStore.confirmSelected();
  }
  await orderStore.finish();
}
</script>

<style lang="scss" scoped>
.admin-page {
  max-width: 1180rpx;
}

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
  color: $ink-900;
  font-weight: $fw-bold;
}

.desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  color: $ink-500;
}

.link {
  color: $color-primary;
  font-size: $fs-sm;
}

.audit-line,
.order-line {
  min-height: 112rpx;
  border-bottom: 2rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
}

.name {
  display: block;
  font-size: $fs-body;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.audit-actions {
  display: flex;
  gap: $sp-2;
}

.small {
  width: 112rpx;
  min-height: 72rpx;
  font-size: $fs-sm;
}
</style>
