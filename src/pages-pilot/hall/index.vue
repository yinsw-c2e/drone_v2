<template>
  <view class="page hall-page">
    <PageHeader title="接单大厅" desc="只展示当前飞手可承接、预算内、合规运力可用的订单。" :role="Role.Pilot" />
    <NoticeBar tone="info" message="接单会锁定匹配运力并通知业主，后续从任务页推进空域、安检和飞行。" />

    <view class="section list-stack">
      <view v-for="item in orders" :key="item.order.id" class="card order-card">
        <view class="between">
          <view>
            <text class="order-title">{{ item.order.cargo.remark || '吊运任务' }}</text>
            <text class="muted">{{ item.order.from.address }} → {{ item.order.to.address }}</text>
          </view>
          <StatusTag :status="item.order.status" />
        </view>
        <view class="candidate">
          <view>
            <text class="metric">{{ item.candidate.distanceKm.toFixed(3) }}km</text>
            <text class="muted">距离</text>
          </view>
          <view>
            <text class="metric">{{ item.candidate.etaMin }}分</text>
            <text class="muted">ETA</text>
          </view>
          <view>
            <MoneyText :fen="item.candidate.quoteCent" bold />
            <text class="muted">报价</text>
          </view>
        </view>
        <view class="reasons">
          <text v-for="reason in item.candidate.reasons" :key="reason" class="reason">{{ reason }}</text>
        </view>
        <button class="primary-button accept" @click="accept(item.order.id)">接单</button>
      </view>
      <EmptyState v-if="!orders.length" title="暂无可接订单" desc="没有满足距离、载重、合规和预算条件的 Matching 订单" action="生成待接单" @action="createMatching" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import MoneyText from '@/components/MoneyText.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { Role } from '@/models';
import { matchingOrdersForPilot } from '@/services/app-flow';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const orderStore = useOrderStore();
const user = computed(() => userStore.user.currentRole === Role.Pilot ? userStore.user : userStore.loginAs(Role.Pilot));
const orders = computed(() => matchingOrdersForPilot(user.value.id));

function createMatching() {
  orderStore.createDemoOrder();
}

function accept(orderId: string) {
  orderStore.acceptForPilot(orderId, user.value.id);
  uni.navigateTo({ url: '/pages-pilot/task/index' });
}
</script>

<style lang="scss" scoped>
.hall-page {
  padding-bottom: $sp-10;
}

.order-title {
  display: block;
  font-size: $fs-h3;
  line-height: 1.35;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.candidate {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-2;
  margin-top: $sp-3;
  padding: $sp-3;
  border-radius: $r-md;
  background: $bg-sunken;
}

.metric {
  @include tabular;
  display: block;
  font-size: $fs-body;
  line-height: 1.5;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.reasons {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-1;
  margin-top: $sp-3;
}

.reason {
  padding: $sp-1 $sp-2;
  border-radius: $r-sm;
  background: $color-primary-weak;
  color: $color-primary;
  font-size: $fs-cap;
}

.accept {
  margin-top: $sp-3;
}
</style>
