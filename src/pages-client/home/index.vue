<template>
  <view class="page">
    <PageHeader title="今日吊运态势" :desc="`${user.nickname} · 发单、匹配、追踪、结算一屏掌控`" :role="Role.Client" />

    <KpiStrip class="section" :items="kpis" />

    <view class="section console-switch" role="tablist">
      <wd-button
        v-for="item in paneOptions"
        :key="item"
        :type="activePane === item ? 'primary' : 'info'"
        :plain="activePane !== item"
        @click="switchPane(item)"
      >
        {{ item }}
      </wd-button>
    </view>

    <view class="section console-tabs">
      <view v-if="activePane === '当前任务'">
        <wd-card v-if="order" class="console-card">
          <view class="between">
            <text class="order-title">{{ order.cargo.remark || '吊运任务' }}</text>
            <StatusTag :status="order.status" />
          </view>
          <NoticeBar class="order-notice" :message="nextCopy" />
          <wd-cell-group insert>
            <InfoCell title="起终点" :desc="`${order.from.address} → ${order.to.address}`">
              <template #side>
                <wd-tag round type="primary">{{ airspaceCopy }}</wd-tag>
              </template>
            </InfoCell>
            <InfoCell title="预算">
              <template #side>
                <MoneyText :fen="order.budgetCent" size="body" bold />
              </template>
            </InfoCell>
            <InfoCell title="责任方" :value="orderPilot" />
            <InfoCell title="预计状态" :value="etaText" />
          </wd-cell-group>
          <wd-steps class="wot-steps" :active="activeStep" align-center>
            <wd-step v-for="step in homeSteps" :key="step.title" :title="step.title" :description="step.desc" />
          </wd-steps>
          <view class="tab-actions">
            <wd-button type="info" plain block @click="goMatch">匹配</wd-button>
            <wd-button type="primary" block @click="goTrack">追踪</wd-button>
          </view>
        </wd-card>
        <EmptyState v-else title="暂无订单" desc="发起一笔订单即可查看匹配与追踪" action="去发单" @action="goOrder" />
      </view>
      <view v-else-if="activePane === '快速发单'">
        <wd-card class="console-card" title="发起低空吊运">
          <wd-cell-group insert>
            <InfoCell title="默认起点" desc="北京低空货运中心" />
            <InfoCell title="默认终点" desc="顺义临空交付点" />
            <InfoCell title="在线运力" :value="`${availableCount} 台`" />
          </wd-cell-group>
          <wd-button class="tab-primary" type="primary" block @click="goOrder">立即发单</wd-button>
        </wd-card>
      </view>
      <view v-else>
        <IconActionGrid :actions="quickActions" @select="handleQuick" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import EmptyState from '@/components/EmptyState.vue';
import IconActionGrid from '@/components/IconActionGrid.vue';
import InfoCell from '@/components/InfoCell.vue';
import KpiStrip from '@/components/KpiStrip.vue';
import MoneyText from '@/components/MoneyText.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
const orderStore = useOrderStore();
const paneOptions = ['当前任务', '快速发单', '资产能力'];
const activePane = ref(orderStore.activeOrder ? paneOptions[0] : paneOptions[1]);
const user = computed(() => userStore.user.currentRole === Role.Client ? userStore.user : userStore.loginAs(Role.Client));
const order = computed(() => orderStore.activeOrder);
const credit = computed(() => repo.credits.find(user.value.id));
const availableCount = computed(() => repo.capacity.where((c) => c.status === 'online').length);
const kpis = computed(() => [
  { label: '信用分', value: credit.value?.total ?? 0, hint: credit.value ? `${credit.value.level}级` : '待计算', tone: 'info' as const },
  { label: '在线运力', value: availableCount.value, hint: '合规池', tone: 'success' as const },
  { label: '预算', value: order.value ? `¥${(order.value.budgetCent / 100).toFixed(0)}` : '--', hint: '当前单', tone: 'neutral' as const },
]);
const quickActions = computed(() => [
  { key: 'auth', title: '认证', desc: '实名与货物声明', symbol: '证', status: '可补充', tone: 'info' as const },
  { key: 'credit', title: '信用', desc: `${credit.value?.level ?? '待评'}级雷达`, symbol: '信', status: '实时', tone: 'success' as const },
  { key: 'insurance', title: '保险', desc: '投保与理赔', symbol: '保', status: order.value?.policyId ? '已关联' : '待投保', tone: 'warning' as const },
]);
const orderPilot = computed(() => order.value?.pilotId ? repo.users.find(order.value.pilotId)?.nickname ?? '已指派飞手' : '待匹配');
const etaText = computed(() => {
  if (!order.value) return '--';
  const candidate = order.value.status === 'matching' && !order.value.capacityId ? orderStore.candidates[0] : undefined;
  if (candidate) return `约${candidate.etaMin}分钟`;
  if (order.value.status === 'settled' || order.value.status === 'completed') return '已送达';
  if (order.value.status === 'inflight') return '飞行中';
  return '待确认';
});
const airspaceCopy = computed(() => {
  if (!order.value) return '待发单';
  const item = repo.airspace.where((entry) => entry.orderId === order.value!.id)[0];
  if (item?.status === 'approved') return '已批准';
  if (item?.status === 'rejected') return '需复核';
  if (order.value.status === 'confirmed') return '待申请';
  if (order.value.status === 'matching') return '待确认';
  return '处理中';
});
type StepState = 'done' | 'current' | 'todo';
const nextCopy = computed(() => {
  if (!order.value) return '';
  const map: Partial<Record<string, string>> = {
    matching: '等待选择匹配方案，确认后飞手和机主端会同步进入任务。',
    confirmed: '下一步提交空域申请，审批通过后进入起飞前准备。',
    airspace: '等待空域审批结果，危险品会进入人工复核流程。',
    preparing: '空域已通过，请飞手完成安检后开始装货。',
    loading: '正在装货，完成后进入起飞执行。',
    inflight: '飞行中，请关注追踪页告警、电量和摆度。',
    unloading: '到达终点，确认卸货后可完成任务。',
    completed: '任务已完成，可生成结算与分账。',
    settled: '订单已结算，可提交评价并查看分账。',
    exception: '订单异常，请查看理赔或联系后台处理。',
  };
  return map[order.value.status] ?? '按页面主操作推进下一阶段。';
});
const homeSteps = computed(() => {
  const status = order.value?.status ?? 'created';
  const orderMap = ['created', 'matching', 'confirmed', 'airspace', 'preparing', 'loading', 'inflight', 'unloading', 'completed', 'settled'];
  const groups = [
    { title: '发单', states: ['created', 'matching'] },
    { title: '确认', states: ['confirmed', 'airspace'] },
    { title: '执行', states: ['preparing', 'loading', 'inflight', 'unloading'] },
    { title: '结算', states: ['completed', 'settled'] },
  ];
  const current = Math.max(0, orderMap.indexOf(status));
  return groups.map((step) => {
    const last = Math.max(...step.states.map((item) => orderMap.indexOf(item)));
    const first = Math.min(...step.states.map((item) => orderMap.indexOf(item)));
    const state: StepState = current > last ? 'done' : current >= first ? 'current' : 'todo';
    return {
      title: step.title,
      state,
      desc: step.title === '发单' ? '需求' : step.title === '确认' ? '运力' : step.title === '执行' ? '飞行' : '分账',
    };
  });
});
const activeStep = computed(() => Math.max(0, homeSteps.value.findIndex((step) => step.state === 'current')));

function goOrder() {
  uni.navigateTo({ url: '/pages-client/order/index' });
}

function goMatch() {
  orderStore.ensureOrder();
  uni.navigateTo({ url: '/pages-client/match/index' });
}

function goAuth() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function goCredit() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function goInsurance() {
  uni.navigateTo({ url: '/pages-client/insurance/index' });
}

function goTrack() {
  uni.navigateTo({ url: '/pages-client/track/index' });
}

function handleQuick(key: string) {
  if (key === 'auth') goAuth();
  if (key === 'credit') goCredit();
  if (key === 'insurance') goInsurance();
}

function switchPane(value: string) {
  activePane.value = value;
}
</script>

<style lang="scss" scoped>
.order-title {
  font-size: $fs-h3;
  font-weight: $fw-semibold;
  color: $ink-900;
}

.order-notice {
  margin: $sp-3 0;
}

.console-switch {
  margin-bottom: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-2;
}

.console-tabs {
  margin-top: $sp-3;
}

.console-card {
  margin-top: $sp-3;
}

.wot-steps {
  margin-top: $sp-4;
}

.tab-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-2;
  margin-top: $sp-4;
}

.tab-primary {
  margin-top: $sp-4;
}
</style>
