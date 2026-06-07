<template>
  <view class="page">
    <view class="top">
      <view>
        <text class="title">保险理赔</text>
        <text class="desc">保单与理赔记录来自 repo，外部保险公司 API 仍为 Mock provider 预留。</text>
      </view>
      <RoleBadge :role="Role.Client" />
    </view>

    <view class="card section">
      <text class="section-title">投保方案</text>
      <view v-for="plan in planRows" :key="plan.name" class="plan-line">
        <view>
          <text class="name">{{ plan.name }}</text>
          <text class="muted">{{ plan.coverages.join(' / ') }}</text>
        </view>
        <text :class="['risk', plan.mustInsure ? 'blocked' : '']">{{ plan.mustInsure ? '强制' : '可选' }}</text>
      </view>
    </view>

    <view v-if="policy" class="card section">
      <view class="between">
        <text class="section-title">当前保单</text>
        <text class="risk">{{ policy.status }}</text>
      </view>
      <view class="policy-grid">
        <view><MoneyText :fen="policy.insuredAmountCent" bold /><text class="muted">保额</text></view>
        <view><MoneyText :fen="policy.premiumCent" bold /><text class="muted">保费</text></view>
      </view>
      <text class="muted">{{ policy.coverages.join('、') }}</text>
    </view>
    <EmptyState v-else class="section" title="暂无保单" desc="贵重货物或勾选保险后，在匹配确认时生成保单" />

    <view v-if="policy" class="card section">
      <view class="between">
        <text class="section-title">理赔流程</text>
        <button class="link" @click="report">报案</button>
      </view>
      <view v-for="claim in claims" :key="claim.id" class="claim-line">
        <view>
          <text class="name">{{ claim.status }}</text>
          <text class="muted">{{ claim.liability || '等待责任认定' }}</text>
        </view>
        <view class="claim-actions">
          <button class="secondary-button small" @click="arbitrate(claim.id)">仲裁</button>
          <button class="primary-button small" @click="next(claim.id)">推进</button>
        </view>
      </view>
      <EmptyState v-if="!claims.length" title="暂无理赔" desc="事故后可提交照片与飞行数据证据" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import MoneyText from '@/components/MoneyText.vue';
import RoleBadge from '@/components/RoleBadge.vue';
import { Role } from '@/models';
import { INSURANCE_PLANS } from '@/stores/config-data';
import { useOrderStore } from '@/stores/order';
import { advanceClaim, arbitrationClaim, createClaim } from '@/services/app-flow';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const order = computed(() => orderStore.activeOrder);
const policy = computed(() => order.value?.policyId ? repo.policies.find(order.value.policyId) : undefined);
const claims = computed(() => order.value ? repo.claims.where((c) => c.orderId === order.value!.id) : []);
const planRows = computed(() => Object.entries(INSURANCE_PLANS).map(([name, plan]) => ({ name, ...plan })));

function report() {
  if (order.value) createClaim(order.value.id, ['现场照片入口', '飞行数据入口']);
}

function next(id: string) {
  advanceClaim(id);
}

function arbitrate(id: string) {
  arbitrationClaim(id);
}
</script>

<style lang="scss" scoped>
.top {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: $sp-3;
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
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.plan-line,
.claim-line {
  min-height: 112rpx;
  border-bottom: 2rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-3;
}

.name {
  display: block;
  color: $ink-900;
  font-size: $fs-body;
  font-weight: $fw-semibold;
}

.risk {
  padding: $sp-1 $sp-2;
  border-radius: $r-pill;
  background: $success-bg;
  color: $success-ink;
  font-size: $fs-cap;
}

.risk.blocked {
  background: $warning-bg;
  color: $warning-ink;
}

.policy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-3;
  margin: $sp-3 0;
}

.claim-actions {
  display: flex;
  gap: $sp-2;
}

.small {
  width: 112rpx;
  min-height: 72rpx;
  font-size: $fs-sm;
}

.link {
  color: $color-primary;
  font-size: $fs-sm;
}
</style>
