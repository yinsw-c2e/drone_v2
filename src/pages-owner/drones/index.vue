<template>
  <view class="page">
    <PageHeader title="设备资质" desc="查看适航、三者险、载荷和设备运行状态。" :role="Role.Owner" />
    <NoticeBar tone="info" message="三者险不足 500 万或适航未通过的设备不会进入在线运力池。" />

    <view class="section">
      <view v-for="drone in drones" :key="drone.id" class="card drone-card">
        <view class="between">
          <view>
            <text class="drone-title">{{ drone.brand }} {{ drone.model }}</text>
            <text class="muted">{{ drone.sn }} · 载荷 {{ drone.maxPayloadKg }}kg</text>
          </view>
          <text :class="['tag', drone.airworthiness]">{{ drone.airworthiness }}</text>
        </view>
        <view class="audit-grid">
          <view>
            <text class="metric">{{ drone.insured.thirdParty ? '已投保' : '未投保' }}</text>
            <text class="muted">三者险</text>
          </view>
          <view>
            <text class="metric">{{ Math.round(drone.insured.thirdPartyAmount / 10000) }}万</text>
            <text class="muted">保额</text>
          </view>
          <view>
            <text class="metric">{{ drone.status }}</text>
            <text class="muted">设备状态</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import { Role } from '@/models';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const user = computed(() => userStore.user.currentRole === Role.Owner ? userStore.user : userStore.loginAs(Role.Owner));
const drones = computed(() => repo.drones.where((d) => d.ownerId === user.value.id));
</script>

<style lang="scss" scoped>
.drone-card {
  margin-bottom: $sp-3;
}

.drone-title {
  display: block;
  font-size: $fs-h3;
  line-height: 1.35;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.tag {
  padding: $sp-1 $sp-2;
  border-radius: $r-pill;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-cap;
}

.tag.approved {
  background: $success-bg;
  color: $success-ink;
}

.audit-grid {
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
  color: $ink-900;
  font-size: $fs-body;
  line-height: 1.5;
  font-weight: $fw-semibold;
}
</style>
