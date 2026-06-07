<template>
  <view class="page">
    <view class="hero">
      <text class="eyebrow">LOW ALTITUDE COMMAND</text>
      <text class="title">选择角色进入指挥中心</text>
      <text class="desc">演示账号来自 seed，验证码任意 6 位；切换角色后仍读写同一 repo。</text>
    </view>

    <view class="roles">
      <button v-for="item in roles" :key="item.role" class="role-card" @click="login(item.role)">
        <view class="between">
          <RoleBadge :role="item.role" />
          <text class="phone">{{ item.phone }}</text>
        </view>
        <text class="role-title">{{ item.title }}</text>
        <text class="role-desc">{{ item.desc }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import RoleBadge from '@/components/RoleBadge.vue';
import { Role } from '@/models';
import { useUserStore } from '@/stores/user';
import { roleHome } from '@/services/app-flow';

const userStore = useUserStore();
const roles = [
  { role: Role.Client, title: '业主端', phone: '13800000001', desc: '发单、比价、追踪、评价' },
  { role: Role.Pilot, title: '飞手端', phone: '13800000002', desc: '接单、安检、飞行监控、钱包' },
  { role: Role.Owner, title: '机主端', phone: '13800000003', desc: '设备、运力投放、T+7 分账' },
  { role: Role.Admin, title: '管理后台', phone: 'admin', desc: '审核、风控、订单与看板' },
];

function login(role: Role) {
  userStore.loginAs(role);
  uni.reLaunch({ url: roleHome(role) });
}
</script>

<style lang="scss" scoped>
.hero {
  padding: $sp-2 0 $sp-4;
}

.eyebrow {
  font-size: $fs-cap;
  line-height: 1.4;
  color: $color-primary;
  font-weight: $fw-semibold;
}

.title {
  display: block;
  margin-top: $sp-2;
  font-size: $fs-h1;
  line-height: 1.25;
  font-weight: $fw-bold;
  color: $ink-900;
}

.desc {
  display: block;
  margin-top: $sp-2;
  font-size: $fs-body;
  line-height: 1.5;
  color: $ink-500;
}

.roles {
  display: flex;
  flex-direction: column;
  gap: $sp-3;
}

.role-card {
  @include card;
  width: 100%;
  text-align: left;
}

.phone {
  @include tabular;
  font-size: $fs-sm;
  color: $ink-500;
}

.role-title {
  display: block;
  margin-top: $sp-3;
  font-size: $fs-h2;
  line-height: 1.3;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.role-desc {
  display: block;
  margin-top: $sp-1;
  font-size: $fs-sm;
  line-height: 1.45;
  color: $ink-500;
}
</style>
