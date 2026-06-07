<template>
  <view class="page">
    <wd-navbar title="低空吊运平台" left-text="演示环境" bordered />
    <PageHeader title="选择角色进入系统" desc="用同一订单体验业主、飞手、机主和后台协同。" compact />
    <NoticeBar tone="info" title="演示环境" message="登录用于角色切换体验；实名、人脸、短信与 CAAC 真实核验待生产环境接入。" />

    <wd-cell-group class="roles" insert>
      <InfoCell v-for="item in roles" :key="item.role" :title="item.title" :desc="item.desc" clickable is-link @click="login(item.role)">
        <template #side>
          <wd-tag round type="primary">{{ item.phone }}</wd-tag>
        </template>
      </InfoCell>
    </wd-cell-group>
  </view>
</template>

<script setup lang="ts">
import InfoCell from '@/components/InfoCell.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import { useUserStore } from '@/stores/user';
import { roleHome } from '@/services/app-flow';

const userStore = useUserStore();
const roles = [
  { role: Role.Client, title: '业主端', phone: '13800000001', desc: '发单、比价、追踪、评价' },
  { role: Role.Pilot, title: '飞手端', phone: '13800000002', desc: '接单、安检、飞行监控、钱包' },
  { role: Role.Owner, title: '机主端', phone: '13800000003', desc: '设备、运力投放、T+7 分账' },
  { role: Role.Admin, title: '管理后台', phone: '后台入口', desc: '审核、风控、订单与看板' },
];

function login(role: Role) {
  userStore.loginAs(role);
  uni.reLaunch({ url: roleHome(role) });
}
</script>

<style lang="scss" scoped>
.roles {
  margin-top: $sp-4;
}

</style>
