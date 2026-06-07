<template>
  <view class="page wallet-page">
    <view class="balance-card">
      <text class="label">飞手可提现</text>
      <MoneyText :fen="wallet?.balanceCent ?? 0" size="display" bold />
      <text class="desc">待结算 {{ pendingText }}</text>
    </view>

    <view class="section">
      <view class="between">
        <text class="section-title">流水</text>
        <button class="link" @click="release">到账</button>
      </view>
      <view class="card">
        <view v-for="item in ledger" :key="item.id" class="line">
          <view>
            <text class="note">{{ item.note || item.type }}</text>
            <text class="time">{{ item.createdAt.slice(0, 10) }} · {{ item.status }}</text>
          </view>
          <MoneyText :fen="item.amountCent" :danger="item.amountCent < 0" />
        </view>
        <EmptyState v-if="!ledger.length" title="暂无流水" desc="结算后飞手收益按 T+1 入账" />
      </view>
    </view>

    <BottomActionBar primary="提现" secondary="完成订单" @secondary="finish" @primary="withdraw" />
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
import { releasePending, walletWithdraw } from '@/utils/wallet';

const userStore = useUserStore();
const orderStore = useOrderStore();
const user = computed(() => userStore.user.currentRole === Role.Pilot ? userStore.user : userStore.loginAs(Role.Pilot));
const wallet = computed(() => repo.wallets.find(user.value.id));
const ledger = computed(() => repo.ledger.where((item) => item.userId === user.value.id).reverse());
const pendingText = computed(() => `¥${((wallet.value?.pendingCent ?? 0) / 100).toFixed(2)}`);

function finish() {
  orderStore.finish();
}

function release() {
  releasePending(user.value.id);
}

function withdraw() {
  try {
    releasePending(user.value.id);
    walletWithdraw(user.value.id, 1);
    uni.showToast({ title: '提现成功', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '提现失败', icon: 'none' });
  }
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

.link {
  color: $color-primary;
  font-size: $fs-sm;
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
