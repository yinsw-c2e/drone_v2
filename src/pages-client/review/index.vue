<template>
  <view class="page review-page">
    <view v-if="order" class="card">
      <view class="between">
        <text class="section-title">结算分账</text>
        <StatusTag :status="order.status" />
      </view>
      <view v-if="order.settlement" class="settlement">
        <view v-for="item in order.settlement.items" :key="item.party" class="line">
          <text>{{ partyLabel(item.party) }} · {{ item.cycle }}</text>
          <MoneyText :fen="item.amountCent" />
        </view>
      </view>
      <EmptyState v-else title="订单尚未结算" desc="可一键完成剩余流程并生成分账" />
    </view>

    <view class="card section">
      <text class="section-title">评价飞手</text>
      <view class="stars">
        <button v-for="n in 5" :key="n" :class="['star', star >= n ? 'active' : '']" @click="setStar(n)">{{ n }}</button>
      </view>
      <textarea v-model="text" class="textarea" maxlength="80" />
      <text v-if="message" class="message">{{ message }}</text>
    </view>

    <BottomActionBar primary="提交评价" secondary="完成结算" @secondary="finish" @primary="review" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import EmptyState from '@/components/EmptyState.vue';
import MoneyText from '@/components/MoneyText.vue';
import StatusTag from '@/components/StatusTag.vue';
import { useOrderStore } from '@/stores/order';

const orderStore = useOrderStore();
const order = computed(() => orderStore.activeOrder ?? orderStore.ensureOrder());
const star = ref<1 | 2 | 3 | 4 | 5>(5);
const text = ref('准时响应，吊运稳定');
const message = ref('');

async function finish() {
  await orderStore.finish();
  message.value = '结算已生成，钱包与看板同步更新';
}

async function review() {
  if (!order.value?.settlement) await finish();
  orderStore.review(star.value, text.value);
  message.value = '评价已提交，飞手信用分已重算';
}

function setStar(value: number) {
  star.value = Math.min(5, Math.max(1, value)) as 1 | 2 | 3 | 4 | 5;
}

function partyLabel(party: string) {
  const map: Record<string, string> = { platform: '平台', pilot: '飞手', owner: '机主', insurance: '保险', tax: '税费' };
  return map[party] ?? party;
}
</script>

<style lang="scss" scoped>
.review-page {
  padding-bottom: calc($sp-10 + 160rpx);
}

.settlement {
  margin-top: $sp-3;
}

.line {
  min-height: 72rpx;
  border-bottom: 2rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: $ink-700;
  font-size: $fs-sm;
}

.stars {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: $sp-2;
  margin-top: $sp-3;
}

.star {
  min-height: 88rpx;
  border-radius: $r-md;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-body;
}

.star.active {
  color: $on-primary;
  background: $color-primary;
}

.textarea {
  width: 100%;
  min-height: 180rpx;
  margin-top: $sp-3;
  border-radius: $r-sm;
  background: $bg-sunken;
  padding: $sp-3;
  font-size: $fs-body;
  color: $ink-900;
}

.message {
  display: block;
  margin-top: $sp-2;
  font-size: $fs-sm;
  color: $success-ink;
}
</style>
