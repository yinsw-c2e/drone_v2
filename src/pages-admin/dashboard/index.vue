<template>
  <view class="page admin-page">
    <PageHeader title="运营总览" desc="审核、订单、风控、看板均按当前业务数据实时汇总。" :role="Role.Admin" />

    <view class="admin-shell">
      <view class="admin-rail">
        <view class="rail-card">
          <text class="rail-title">运营工作台</text>
          <text v-for="item in railItems" :key="item" class="rail-item">{{ item }}</text>
        </view>
      </view>

      <view class="admin-main">
        <view class="ops-header admin-wide">
          <view class="ops-map">
            <view class="ops-route" />
            <view class="ops-node start" />
            <view class="ops-node end" />
            <view class="ops-airspace" />
          </view>
          <view class="ops-copy">
            <text class="ops-eyebrow">低空运营控制台</text>
            <text class="ops-title">空域、订单、运力、理赔实时汇总</text>
            <text class="ops-desc">当前在线运力 {{ metrics.onlineCapacity }}，待处理订单 {{ metrics.orderCount }}，平台收入 {{ income }}。</text>
          </view>
          <button class="primary-button ops-run" @click="runFlow">跑通</button>
        </view>

        <view class="metric-grid admin-metrics">
          <MetricCard label="订单量" :value="metrics.orderCount" hint="全部订单" />
          <MetricCard label="完成数" :value="metrics.completedCount" hint="完成与已结算" delta-tone="up" />
          <MetricCard label="平台收入" :value="income" hint="技术服务费" />
          <MetricCard label="在线运力" :value="metrics.onlineCapacity" hint="可匹配容量" />
        </view>

        <AdminDataPanel class="admin-wide" title="端到端验收" desc="生成订单、确认推荐方案、空域合规、飞行、卸货、结算与分账。" action="跑通" @action="runFlow">
          <view class="panel-body">
            <text class="muted">{{ runFlowAction.description }}</text>
            <NoticeBar v-if="message" class="message" :tone="message.includes('没有在线') || message.includes('失败') ? 'warning' : 'info'" :message="message" />
          </view>
        </AdminDataPanel>

        <AdminDataPanel title="认证审核" desc="飞手、机主、业主材料均可通过或驳回，端侧实时读取状态。">
          <view class="panel-body table-list">
            <view v-for="app in applications" :key="app.id" class="audit-line">
              <view>
                <text class="name">{{ roleName(app.role) }} · {{ userName(app.userId) }}</text>
                <text class="muted">{{ certStatusName(app.status) }} · {{ fieldSummary(app.fields) }}</text>
              </view>
              <view class="audit-actions">
                <button class="secondary-button small" @click="rejectApp(app.id)">驳回</button>
                <button class="primary-button small" @click="approveApp(app.id)">通过</button>
              </view>
            </view>
            <view v-for="pilot in pilots" :key="pilot.userId" class="audit-line">
              <view>
                <text class="name">{{ userName(pilot.userId) }}</text>
                <text class="muted">执照 {{ pilot.caacLevel }} · 无犯罪 {{ certStatusName(pilot.noCrimeProof) }}</text>
              </view>
              <view class="audit-actions">
                <button class="secondary-button small" @click="rejectPilot(pilot.userId)">驳回</button>
                <button class="primary-button small" @click="approvePilot(pilot.userId)">通过</button>
              </view>
            </view>
          </view>
        </AdminDataPanel>

        <AdminDataPanel title="订单管理" desc="每行只显示当前可用动作，终态不再推进。">
          <view class="panel-body table-list">
            <view v-for="item in orders" :key="item.id" class="order-line">
              <view>
                <text class="name">{{ orderDisplayTitle(item) }}</text>
                <text class="muted">{{ item.from.address }} → {{ item.to.address }}</text>
                <text class="muted">{{ orderAction(item).description }}</text>
              </view>
              <view class="order-actions">
                <StatusTag :status="item.status" />
                <button class="secondary-button small" :disabled="orderAction(item).disabled" @click="moveOrder(item.id)">{{ orderAction(item).label }}</button>
              </view>
            </view>
            <EmptyState v-if="!orders.length" title="暂无订单" desc="点击跑通生成端到端订单" />
          </view>
        </AdminDataPanel>

        <AdminDataPanel title="风控与理赔" desc="黑名单会阻断发单/匹配，理赔终态不重复推进。">
          <view class="panel-body table-list">
            <view v-for="item in users" :key="item.id" class="audit-line risk-line">
              <view>
                <text class="name">{{ item.nickname }}</text>
                <text class="muted">{{ roleName(item.currentRole) }} · {{ item.blacklisted ? '黑名单' : '正常' }}</text>
              </view>
              <button :class="[item.blacklisted ? 'primary-button' : 'danger-button', 'small']" @click="toggleRisk(item.id)">{{ item.blacklisted ? '解除' : '拉黑' }}</button>
            </view>
            <view v-for="claim in claims" :key="claim.id" class="audit-line">
              <view>
                <text class="name">理赔 {{ claimStatusName(claim.status) }}</text>
                <text class="muted">{{ claimActionPlan(claim).description }}</text>
                <text class="muted">{{ claimLiabilityLabel(claim.liability) }}</text>
              </view>
              <view class="audit-actions">
                <button v-if="claimActionPlan(claim).secondaryLabel" class="secondary-button small" :disabled="claimActionPlan(claim).secondaryDisabled" @click="arbitrateClaim(claim.id)">{{ claimActionPlan(claim).secondaryLabel }}</button>
                <button class="primary-button small" :disabled="claimActionPlan(claim).disabled" @click="nextClaim(claim.id)">{{ claimActionPlan(claim).label }}</button>
              </view>
            </view>
          </view>
        </AdminDataPanel>

        <AdminDataPanel title="报表与建议" desc="日报、周报、月报、运力热力和规则建议均基于业务数据聚合。">
          <view class="panel-body">
            <view class="report-grid">
              <MetricCard label="完成率" :value="rate(report.completionRate)" hint="完成/总订单" />
              <MetricCard label="取消率" :value="rate(report.cancelRate)" hint="取消/总订单" />
              <MetricCard label="活跃用户" :value="report.activeUsers" hint="订单参与方" />
              <MetricCard label="投诉纠纷" :value="report.disputes" hint="理赔+异常" />
            </view>
            <view class="chart-card">
              <view class="chart-row">
                <text>完成率</text>
                <view class="bar"><view class="bar-fill success" :style="{ width: rate(report.completionRate) }" /></view>
              </view>
              <view class="chart-row">
                <text>取消率</text>
                <view class="bar"><view class="bar-fill danger" :style="{ width: rate(report.cancelRate) }" /></view>
              </view>
            </view>
            <view v-for="row in report.periods" :key="row.period" class="report-line">
              <text class="name">{{ row.period }}</text>
              <text class="muted">订单 {{ row.orders }} · 完成 {{ row.completed }} · 收入 ¥{{ (row.incomeCent / 100).toFixed(2) }}</text>
            </view>
            <view class="heatmap">
              <text v-for="point in report.heatmap" :key="point.id" :class="['heat-dot', point.status]">{{ point.label }}</text>
            </view>
            <text v-for="tip in report.suggestions" :key="tip" class="tip">{{ tip }}</text>
          </view>
        </AdminDataPanel>

        <AdminDataPanel class="admin-wide" title="审计日志" desc="关键登录、认证、支付、空域、投保、订单和提现动作留痕。">
          <view class="panel-body">
            <view v-for="log in auditLogs" :key="log.id" class="log-line">
              <text class="name">{{ auditActionLabel(log.action) }}</text>
              <text class="muted">{{ auditLogDetailLabel(log) }}</text>
            </view>
          </view>
        </AdminDataPanel>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AdminDataPanel from '@/components/AdminDataPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import MetricCard from '@/components/MetricCard.vue';
import NoticeBar from '@/components/NoticeBar.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { Role } from '@/models';
import type { Claim, Order } from '@/models';
import { adminOrderAction, adminRunFlowAction, claimAction } from '@/services/action-plans';
import { auditActionLabel, auditLogDetailLabel, auditStatusLabel, claimLiabilityLabel, claimStatusLabel, orderDisplayTitle, roleLabel } from '@/services/display-labels';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { advanceClaim, advanceOrder, analyticsReport, approveCertification, approvePilotQualification, arbitrationClaim, dashboardMetrics, decideMockAirspace, rejectCertification, rejectPilotQualification, setUserBlacklist } from '@/services/app-flow';
import { repo } from '@/utils/repo';

const userStore = useUserStore();
userStore.loginAs(Role.Admin);
const orderStore = useOrderStore();
const message = ref('');
const metrics = computed(() => dashboardMetrics());
const income = computed(() => `¥${(metrics.value.platformIncome / 100).toFixed(2)}`);
const runFlowAction = computed(() => adminRunFlowAction(metrics.value.onlineCapacity));
const pilots = computed(() => repo.pilots.all());
const orders = computed(() => repo.orders.all().reverse());
const users = computed(() => repo.users.all());
const applications = computed(() => repo.authApplications.all().reverse());
const claims = computed(() => repo.claims.all().reverse());
const report = computed(() => analyticsReport());
const auditLogs = computed(() => repo.auditLogs.all().slice(-8).reverse());
const railItems = ['运营概览', '认证审核', '订单管理', '风控理赔', '报表建议', '审计日志'];

function userName(id: string) {
  return repo.users.find(id)?.nickname ?? id;
}

const roleName = roleLabel;
const certStatusName = auditStatusLabel;
const claimStatusName = claimStatusLabel;

function formatFieldValue(value: string | number | boolean | string[]) {
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'boolean') return value ? '已确认' : '未确认';
  if (typeof value === 'number') return `${value}`;
  return certStatusName(value);
}

function fieldSummary(fields: Record<string, string | number | boolean | string[]>) {
  return Object.values(fields).slice(0, 2).map(formatFieldValue).join(' / ');
}

function approvePilot(userId: string) {
  approvePilotQualification(userId);
}

function rejectPilot(userId: string) {
  rejectPilotQualification(userId);
}

function approveApp(id: string) {
  approveCertification(id);
}

function rejectApp(id: string) {
  rejectCertification(id);
}

function toggleRisk(id: string) {
  const user = repo.users.find(id);
  if (user) {
    setUserBlacklist(id, !user.blacklisted);
    message.value = user.blacklisted ? '已解除风控黑名单' : '已加入风控黑名单';
  }
}

function orderAirspace(id: string) {
  return repo.airspace.where((item) => item.orderId === id)[0];
}

function orderAction(order: Order) {
  return adminOrderAction(order, orderAirspace(order.id));
}

function claimActionPlan(claim: Claim) {
  return claimAction(claim);
}

function moveOrder(id: string) {
  const order = repo.orders.find(id);
  if (!order) return;
  const action = orderAction(order);
  if (action.disabled) {
    message.value = action.reason;
    return;
  }
  if (order.status === 'airspace') decideMockAirspace(id);
  try {
    const next = advanceOrder(id);
    message.value = `订单已进入 ${orderAction(next).label === '已完成' ? '已结算' : orderAction(next).description}`;
  } catch (e) {
    message.value = e instanceof Error ? e.message : '订单流转失败';
  }
}

function nextClaim(id: string) {
  const claim = repo.claims.find(id);
  if (!claim) return;
  const action = claimActionPlan(claim);
  if (action.disabled) {
    message.value = action.description;
    return;
  }
  const nextClaimState = advanceClaim(id);
  const nextAction = claimActionPlan(nextClaimState);
  message.value = nextAction.terminal ? nextAction.description : '理赔状态已更新';
}

function arbitrateClaim(id: string) {
  const claim = repo.claims.find(id);
  if (!claim) return;
  const action = claimActionPlan(claim);
  if (action.secondaryDisabled) {
    message.value = action.description;
    return;
  }
  arbitrationClaim(id);
  message.value = '理赔已进入仲裁';
}

function rate(value: number) {
  return `${Math.round(value * 100)}%`;
}

async function runFlow() {
  if (!runFlowAction.value.canRun) {
    message.value = runFlowAction.value.description;
    return;
  }
  try {
    message.value = '';
    const order = orderStore.ensureOrder();
    if (!order.pilotId) {
      await orderStore.confirmSelected();
    }
    await orderStore.finish();
    message.value = '端到端流程已跑通，结算与分账已生成';
  } catch (e) {
    message.value = e instanceof Error ? e.message : '端到端跑通失败，请先确认在线运力和订单条件。';
  }
}
</script>

<style lang="scss" scoped>
.admin-shell {
  display: block;
}

.admin-rail {
  display: none;
}

.admin-main {
  display: grid;
  gap: $sp-4;
  min-width: 0;
}

.ops-header {
  @include card;
  display: grid;
  grid-template-columns: 220rpx minmax(0, 1fr);
  gap: $sp-4;
  align-items: center;
  border-left: 8rpx solid $color-primary;
}

.ops-map {
  height: 176rpx;
  border-radius: $r-md;
  background:
    linear-gradient(90deg, $line 2rpx, transparent 2rpx),
    linear-gradient(0deg, $line 2rpx, transparent 2rpx),
    $bg-sunken;
  background-size: 48rpx 48rpx;
  position: relative;
  overflow: hidden;
}

.ops-route {
  position: absolute;
  left: 18%;
  right: 16%;
  top: 58%;
  height: 6rpx;
  border-radius: $r-pill;
  background: $color-primary;
  transform: rotate(-16deg);
  transform-origin: left center;
}

.ops-node {
  position: absolute;
  width: 24rpx;
  height: 24rpx;
  border-radius: $r-pill;
  box-shadow: $shadow-1;
}

.ops-node.start {
  left: 16%;
  top: 58%;
  background: $success;
}

.ops-node.end {
  right: 15%;
  top: 36%;
  background: $danger;
}

.ops-airspace {
  position: absolute;
  right: 18%;
  top: 24%;
  width: 96rpx;
  height: 64rpx;
  border-radius: $r-pill;
  border: 2rpx solid $blue-200;
  background: $color-primary-weak;
}

.ops-eyebrow,
.ops-title,
.ops-desc {
  display: block;
}

.ops-eyebrow {
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.4;
  font-weight: $fw-semibold;
}

.ops-title {
  color: $ink-900;
  font-size: $fs-h2;
  line-height: 1.25;
  font-weight: $fw-bold;
}

.ops-desc {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.ops-run {
  grid-column: 1 / -1;
}

.rail-card {
  @include card;
}

.rail-title {
  display: block;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.35;
  font-weight: $fw-semibold;
}

.rail-item {
  display: flex;
  align-items: center;
  min-height: 80rpx;
  margin-top: $sp-2;
  padding: 0 $sp-3;
  border-radius: $r-sm;
  color: $ink-700;
  background: $bg-sunken;
  font-size: $fs-sm;
  font-weight: $fw-medium;
}

.rail-item:first-of-type {
  color: $color-primary;
  background: $color-primary-weak;
}

.audit-line,
.order-line {
  min-height: 112rpx;
  border-bottom: 2rpx solid $line;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $sp-3;
  flex-wrap: wrap;
  padding: $sp-3 0;
}

.audit-line > view:first-child,
.order-line > view:first-child {
  flex: 1 1 100%;
  min-width: 0;
}

.table-list {
  padding-top: 0;
  padding-bottom: 0;
}

.order-actions {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(176rpx, 1fr);
  align-items: center;
  gap: $sp-2;
}

.message {
  margin: $sp-3 0;
}

.name {
  display: block;
  font-size: $fs-body;
  color: $ink-900;
  font-weight: $fw-semibold;
}

.audit-actions {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-2;
}

.small {
  width: 100%;
  min-width: 176rpx;
  min-height: 72rpx;
  font-size: $fs-sm;
  white-space: nowrap;
  word-break: keep-all;
}

.risk-line > .small {
  flex: 1 1 100%;
}

.report-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-3;
  margin-top: $sp-3;
}

.chart-card {
  margin-top: $sp-3;
  padding: $sp-3;
  border-radius: $r-md;
  background: $bg-sunken;
  display: grid;
  gap: $sp-3;
}

.chart-row {
  display: grid;
  grid-template-columns: 112rpx minmax(0, 1fr);
  gap: $sp-3;
  align-items: center;
}

.chart-row text {
  color: $ink-700;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
}

.bar {
  height: 20rpx;
  border-radius: $r-pill;
  background: $bg-card;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: $r-pill;
}

.bar-fill.success {
  background: $success;
}

.bar-fill.danger {
  background: $danger;
}

.report-line,
.log-line {
  padding: $sp-3 0;
  border-bottom: 2rpx solid $line;
}

.heatmap {
  display: flex;
  flex-wrap: wrap;
  gap: $sp-2;
  margin-top: $sp-3;
}

.heat-dot,
.tip {
  display: inline-flex;
  align-items: center;
  min-height: 56rpx;
  border-radius: $r-pill;
  padding: 0 $sp-2;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-cap;
}

.heat-dot.online {
  background: $success-bg;
  color: $success-ink;
}

.heat-dot.busy {
  background: $warning-bg;
  color: $warning-ink;
}

.tip {
  margin-top: $sp-2;
  background: $info-bg;
  color: $info-ink;
}

@media screen and (min-width: 900px) {
  .admin-shell {
    display: grid;
    grid-template-columns: 240rpx minmax(0, 1fr);
    gap: $sp-4;
    align-items: start;
  }

  .admin-rail {
    display: block;
    position: sticky;
    top: $sp-4;
  }

  .admin-main {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $sp-4;
  }

  .ops-header {
    grid-template-columns: 320rpx minmax(0, 1fr) 160rpx;
  }

  .ops-run {
    grid-column: auto;
  }

  .admin-metrics,
  .admin-wide {
    grid-column: 1 / -1;
  }

  .audit-line,
  .order-line {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 96rpx;
    align-items: center;
    padding: 0;
  }

  .audit-line > view:first-child,
  .order-line > view:first-child {
    flex-basis: auto;
  }

  .audit-actions,
  .order-actions {
    width: auto;
    display: flex;
  }

  .small {
    width: 128rpx;
    min-width: 128rpx;
  }

  .risk-line > .small {
    flex: 0 0 auto;
  }

  .report-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
