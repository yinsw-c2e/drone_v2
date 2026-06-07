<template>
  <view class="page">
    <PageHeader title="投保与理赔进度" desc="查看投保方案、当前保单和理赔处理状态。" :role="Role.Client" />
    <NoticeBar tone="warning" message="真实投保、定损、赔付和仲裁接口待生产环境接入；当前展示业务流程和状态流转。" />

    <view class="card section">
      <SectionHeader title="投保方案" desc="按货物类型展示强制/可选保障范围。" />
      <view v-for="plan in planRows" :key="plan.name" class="plan-line">
        <view>
          <text class="name">{{ cargoTypeLabel(plan.name) }}</text>
          <text class="muted">{{ plan.coverages.join(' / ') }}</text>
        </view>
        <text :class="['risk', plan.mustInsure ? 'blocked' : '']">{{ plan.mustInsure ? '强制' : '可选' }}</text>
      </view>
    </view>

    <view v-if="policy" class="card section">
      <view class="between">
        <SectionHeader title="当前保单" />
        <text class="risk">{{ policyStatusLabel(policy.status) }}</text>
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
        <SectionHeader title="理赔流程" desc="报案、调查、定责、赔付或仲裁均会同步到订单记录。" />
        <button class="link" @click="report">报案</button>
      </view>
      <view v-for="claim in claims" :key="claim.id" class="claim-line">
        <view>
          <text class="name">{{ claimStatusLabel(claim.status) }}</text>
          <text class="muted">{{ claimActionPlan(claim).description }}</text>
          <text class="muted">{{ claimLiabilityLabel(claim.liability) }}</text>
        </view>
        <view class="claim-actions">
          <button v-if="claimActionPlan(claim).secondaryLabel" class="secondary-button small" :disabled="claimActionPlan(claim).secondaryDisabled" @click="arbitrate(claim.id)">{{ claimActionPlan(claim).secondaryLabel }}</button>
          <button class="primary-button small" :disabled="claimActionPlan(claim).disabled" @click="next(claim.id)">{{ claimActionPlan(claim).label }}</button>
        </view>
      </view>
      <text v-if="message" class="message">{{ message }}</text>
      <EmptyState v-if="!claims.length" title="暂无理赔" desc="事故后可提交照片与飞行数据证据" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import MoneyText from '@/components/MoneyText.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionHeader from '@/components/SectionHeader.vue';
import { Role } from '@/models';
import type { Claim } from '@/models';
import { claimAction } from '@/services/action-plans';
import { cargoTypeLabel, claimLiabilityLabel, claimStatusLabel, policyStatusLabel } from '@/services/display-labels';
import { INSURANCE_PLANS } from '@/stores/config-data';
import { useOrderStore } from '@/stores/order';
import { advanceClaim, arbitrationClaim, createClaim } from '@/services/app-flow';
import { repo } from '@/utils/repo';

const orderStore = useOrderStore();
const order = computed(() => orderStore.activeOrder);
const policy = computed(() => order.value?.policyId ? repo.policies.find(order.value.policyId) : undefined);
const claims = computed(() => order.value ? repo.claims.where((c) => c.orderId === order.value!.id) : []);
const planRows = computed(() => Object.entries(INSURANCE_PLANS).map(([name, plan]) => ({ name, ...plan })));
const message = ref('');

function claimActionPlan(claim: Claim) {
  return claimAction(claim);
}

function report() {
  if (order.value) {
    createClaim(order.value.id, ['现场照片入口', '飞行数据入口']);
    message.value = '报案已提交，理赔流程进入待调查。';
  }
}

function next(id: string) {
  const claim = repo.claims.find(id);
  if (!claim) return;
  const action = claimActionPlan(claim);
  if (action.disabled) {
    message.value = action.description;
    return;
  }
  const nextClaimState = advanceClaim(id);
  const nextAction = claimActionPlan(nextClaimState);
  message.value = nextAction.terminal ? nextAction.description : '理赔状态已更新。';
}

function arbitrate(id: string) {
  const claim = repo.claims.find(id);
  if (!claim) return;
  const action = claimActionPlan(claim);
  if (action.secondaryDisabled) {
    message.value = action.description;
    return;
  }
  arbitrationClaim(id);
  message.value = '理赔已进入仲裁，请等待后台处理。';
}
</script>

<style lang="scss" scoped>
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

.message {
  display: block;
  margin-top: $sp-3;
  color: $info-ink;
  background: $info-bg;
  border-radius: $r-sm;
  padding: $sp-2;
  font-size: $fs-sm;
}
</style>
