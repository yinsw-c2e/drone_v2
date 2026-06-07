<template>
  <view class="page wallet-page">
    <view class="balance-card">
      <text class="label">机主待结算</text>
      <MoneyText :fen="wallet?.pendingCent ?? 0" size="display" bold />
      <text class="desc">可提现 {{ balanceText }} · 周期 T+7</text>
    </view>

    <view class="section card">
      <view v-for="item in ledger" :key="item.id" class="line">
        <view>
          <text class="note">{{ item.note || item.type }}</text>
          <text class="time">{{ item.cycle }} · {{ item.status }}</text>
        </view>
        <MoneyText :fen="item.amountCent" />
      </view>
      <EmptyState v-if="!ledger.length" title="暂无分账" desc="完成订单结算后机主获得 30% 设备使用费" />
    </view>

    <BottomActionBar primary="释放待结算" secondary="完成订单" @secondary="finish" @primary="release" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import EmptyState from '@/components/EmptyState.vue';
import MoneyText from '@/components/MoneyText.vue';
import { Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';
import { releasePending } from '@/utils/wallet';

const userStore = useUserStore();
const orderStore = useOrderStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const wallet = computed(() => repo.wallets.find(user.value.id));
const ledger = computed(() => repo.ledger.where((item) => item.userId === user.value.id).reverse());
const balanceText = computed(() => `¥${((wallet.value?.balanceCent ?? 0) / 100).toFixed(2)}`);

function finish() {
  orderStore.finish();
}

function release() {
  releasePending(user.value.id);
}
</script>

<style lang="scss" scoped>
.wallet-page {
  padding-bottom: calc($sp-10 + 160rpx);
}

.balance-card {
  padding: $sp-5 $sp-4;
  border-radius: $r-lg;
  background: $color-primary;
  color: $on-primary;
  box-shadow: $shadow-2;
}

.label,
.desc {
  display: block;
  font-size: $fs-sm;
  line-height: 1.45;
}

.desc {
  margin-top: $sp-2;
}

.line {
  min-height: 88rpx;
  border-bottom: 2rpx solid $line;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.note {
  display: block;
  font-size: $fs-body;
  color: $ink-900;
}

.time {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-cap;
  color: $ink-500;
}
</style>
