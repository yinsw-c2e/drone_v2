<template>
  <view class="admin-home">
    <view class="topbar">
      <view class="brand-wrap" hover-class="tap-press" @click="showFeedback('管理员在线')">
        <view class="avatar-button">
          <StitchIcon name="person" size="38rpx" />
        </view>
        <text class="brand">SkyLink Logistics</text>
      </view>
      <view class="signal-button" hover-class="tap-press" @click="showFeedback('Signal link stable')">
        <StitchIcon name="signal_cellular_alt" size="46rpx" />
      </view>
    </view>

    <view class="content">
      <view class="overview-row">
        <view>
          <text class="page-title">运营总览</text>
          <text class="timestamp">{{ timestamp }}</text>
        </view>
        <view class="online-pill" hover-class="tap-press" @click="showFeedback('SYSTEM ONLINE · 12ms')">
          <view class="pulse-dot" />
          <text>SYSTEM ONLINE</text>
        </view>
      </view>

      <view class="kpi-grid">
        <view
          v-for="card in kpiCards"
          :key="card.label"
          class="kpi-card"
          hover-class="tap-press"
          @click="showFeedback(card.feedback)"
        >
          <view class="kpi-head">
            <text>{{ card.label }}</text>
            <StitchIcon :name="card.icon" size="31rpx" />
          </view>
          <text :class="['kpi-value', card.tone]">{{ card.value }}</text>
          <view class="trend-row">
            <StitchIcon name="trending_up" size="30rpx" />
            <text>{{ card.trend }}</text>
          </view>
        </view>

        <view class="fleet-card" hover-class="tap-press" @click="openDashboard">
          <view class="fleet-head">
            <view class="fleet-label">
              <StitchIcon name="flight_takeoff" size="50rpx" />
              <text>在线运力监控</text>
            </view>
            <text class="fleet-count">{{ onlineCapacity }}/{{ totalCapacity }} 活跃</text>
          </view>
          <view class="fleet-track">
            <view class="fleet-fill" :style="{ width: `${capacityPct}%` }" />
          </view>
          <view class="zone-row">
            <text>在线: {{ capacityBuckets.online }}</text>
            <text>忙碌: {{ capacityBuckets.busy }}</text>
            <text>离线: {{ capacityBuckets.offline }}</text>
          </view>
        </view>
      </view>

      <view class="section-block">
        <view class="section-title">系统工具</view>
        <view class="tool-card" hover-class="tap-press" @click="runFlow">
          <view class="tool-left">
            <view class="tool-icon">
              <StitchIcon name="route" size="55rpx" />
            </view>
            <view>
              <text class="tool-title">流程演练系统</text>
              <text class="tool-desc">模拟调度与异常场景</text>
            </view>
          </view>
          <StitchIcon class="chevron" name="chevron_right" size="51rpx" />
        </view>
      </view>

      <view class="section-block audit-section">
        <view class="section-head">
          <view class="section-title no-margin">认证审核队列</view>
          <view class="audit-badge" hover-class="tap-press" @click="openDashboard">{{ pendingApplications.length }} 待审</view>
        </view>
        <view class="audit-list">
          <view v-if="!auditRows.length" class="audit-card">
            <view class="audit-left">
              <view class="audit-icon">
                <StitchIcon name="task_alt" size="49rpx" />
              </view>
              <view class="audit-copy">
                <text class="audit-name">队列已清空</text>
                <text class="audit-id">暂无待审核的认证申请</text>
              </view>
            </view>
          </view>
          <view
            v-for="item in auditRows"
            :key="item.id"
            class="audit-card"
            hover-class="tap-press"
            @click="openAudit(item)"
          >
            <view class="audit-left">
              <view class="audit-icon">
                <StitchIcon :name="item.icon" size="49rpx" />
              </view>
              <view class="audit-copy">
                <text class="audit-name">{{ item.name }}</text>
                <text class="audit-id">{{ item.meta }}</text>
              </view>
            </view>
            <view class="audit-action" @click.stop="openAudit(item)">审核</view>
          </view>
        </view>
      </view>

      <view class="section-block risk-section">
        <view class="section-title">风险与提醒</view>
        <view v-if="!riskOrders.length" class="risk-card">
          <view class="risk-copy">
            <text class="risk-title">暂无风险告警</text>
            <text class="risk-body">当前没有异常订单或仲裁中的理赔。</text>
          </view>
        </view>
        <view v-for="risk in riskOrders" :key="risk.id" class="risk-card" hover-class="tap-press" @click="openRiskDetail(risk)">
          <view class="risk-line" />
          <view class="warning-mark"><text class="warning-bang">!</text></view>
          <view class="risk-copy">
            <text class="risk-title">{{ risk.title }}</text>
            <text class="risk-body">单号 <text class="mono">{{ risk.code }}</text> {{ risk.note }}</text>
            <view class="risk-actions">
              <view class="risk-detail" hover-class="tap-press" @click.stop="openRiskDetail(risk)">查看详情</view>
              <view class="risk-contact" hover-class="tap-press" @click.stop="contactPilot(risk)">联系飞手</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item active" hover-class="tap-press" @click="showFeedback('当前：Home')">
        <StitchIcon name="grid_view" size="39rpx" fill />
        <text>Home</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="openDashboard">
        <StitchIcon name="assignment" size="42rpx" />
        <text>Tasks</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="openAuth">
        <StitchIcon name="account_balance_wallet" size="42rpx" />
        <text>Assets</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="showFeedback('当前为管理员身份')">
        <StitchIcon name="person" size="40rpx" />
        <text>Profile</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { AuditStatus, CapacityStatus, OrderStatus, Role } from '@/models';
import type { Order } from '@/models';
import { fetchCertificationsRemote } from '@/api/backend';
import { adminRunFlowAction } from '@/services/action-plans';
import { ensureRole } from '@/services/auth-guard';
import { dashboardMetrics } from '@/services/app-flow';
import { orderStatusLabel, roleLabel } from '@/services/display-labels';
import { useOrderStore } from '@/stores/order';
import { repo } from '@/utils/repo';

interface KpiCard {
  label: string;
  value: string;
  icon: string;
  trend: string;
  tone: 'primary' | 'cyan';
  feedback: string;
}

interface AuditRow {
  id: string;
  icon: string;
  name: string;
  meta: string;
}

interface RiskRow {
  id: string;
  code: string;
  title: string;
  note: string;
  pilotId?: string;
}

ensureRole(Role.Admin);
const orderStore = useOrderStore();
const refreshTick = ref(0);

onMounted(() => {
  void refreshRemoteCertifications();
});

async function refreshRemoteCertifications() {
  await fetchCertificationsRemote();
  refreshTick.value += 1;
}

const timestamp = computed(() => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} CST`;
});

const metrics = computed(() => {
  void refreshTick.value;
  return dashboardMetrics();
});
const onlineCapacity = computed(() => metrics.value.onlineCapacity);
const totalCapacity = computed(() => {
  void refreshTick.value;
  return repo.capacity.all().length;
});
const capacityPct = computed(() => totalCapacity.value ? Math.round((onlineCapacity.value / totalCapacity.value) * 100) : 0);
const capacityBuckets = computed(() => {
  void refreshTick.value;
  const all = repo.capacity.all();
  return {
    online: all.filter((c) => c.status === CapacityStatus.Online).length,
    busy: all.filter((c) => c.status === CapacityStatus.Busy).length,
    offline: all.filter((c) => c.status === CapacityStatus.Offline).length,
  };
});
const runFlowAction = computed(() => adminRunFlowAction(onlineCapacity.value));

const kpiCards = computed<KpiCard[]>(() => [
  {
    label: '订单总量',
    value: metrics.value.orderCount.toLocaleString('en-US'),
    icon: 'receipt_long',
    trend: `完单 ${metrics.value.completedCount}`,
    tone: 'primary',
    feedback: `订单总量 ${metrics.value.orderCount}，已完成 ${metrics.value.completedCount}`,
  },
  {
    label: '平台累计收入',
    value: `¥${(metrics.value.platformIncome / 100).toLocaleString('en-US')}`,
    icon: 'payments',
    trend: `取消率 ${(metrics.value.cancelRate * 100).toFixed(1)}%`,
    tone: 'cyan',
    feedback: `平台累计收入 ¥${(metrics.value.platformIncome / 100).toLocaleString('en-US')}`,
  },
]);

const pendingApplications = computed(() => {
  void refreshTick.value;
  return repo.authApplications.where((app) => app.status === AuditStatus.Pending);
});

const auditRows = computed<AuditRow[]>(() => pendingApplications.value.slice(0, 4).map((app) => {
  const applicant = repo.users.find(app.userId);
  const realName = typeof app.fields.realName === 'string' ? app.fields.realName : '';
  return {
    id: app.id,
    icon: app.role === Role.Owner ? 'precision_manufacturing' : app.role === Role.Pilot ? 'person_check' : 'badge',
    name: `${realName || applicant?.nickname || app.userId} (${roleLabel(app.role)})`,
    meta: `ID: ${app.id.toUpperCase()} · ${app.submittedAt.slice(5, 16).replace('T', ' ')}`,
  };
}));

const riskOrders = computed<RiskRow[]>(() => {
  void refreshTick.value;
  const exceptions = repo.orders.where((o) => o.status === OrderStatus.Exception).reverse().slice(0, 3);
  return exceptions.map((order) => ({
    id: order.id,
    code: order.id.toUpperCase(),
    title: '异常订单警报',
    note: order.events[order.events.length - 1]?.note ?? '订单进入异常处理，需要后台干预。',
    pilotId: order.pilotId,
  }));
});

function showFeedback(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function openDashboard() {
  uni.navigateTo({ url: '/pages-admin/dashboard/index' });
}

function openAuth() {
  uni.navigateTo({ url: '/pages-admin/certifications/index' });
}

function openAudit(item: AuditRow) {
  showFeedback(`已打开认证审核：${item.name}`);
  uni.navigateTo({ url: '/pages-admin/certifications/index' });
}

function findOrder(id: string): Order | undefined {
  return repo.orders.find(id);
}

function openRiskDetail(risk: RiskRow) {
  const order = findOrder(risk.id);
  if (!order) return;
  const latest = order.events[order.events.length - 1];
  showFeedback(`${risk.code} · ${latest ? orderStatusLabel(latest.status) : '暂无事件'}`);
}

function contactPilot(risk: RiskRow) {
  const pilot = risk.pilotId ? repo.users.find(risk.pilotId) : undefined;
  if (!pilot) {
    showFeedback('该订单未指派飞手');
    return;
  }
  uni.makePhoneCall({
    phoneNumber: pilot.phone,
    fail: () => showFeedback(`${pilot.nickname} · ${pilot.phone}`),
  });
}

async function runFlow() {
  if (!runFlowAction.value.canRun) {
    showFeedback(runFlowAction.value.description);
    return;
  }
  try {
    const order = orderStore.ensureOrder();
    if (!order.pilotId) {
      await orderStore.confirmSelected();
    }
    await orderStore.finish();
    showFeedback('流程演练已完成');
  } catch (error) {
    showFeedback(error instanceof Error ? error.message : '流程演练失败');
  }
}
</script>

<style lang="scss" scoped>
.admin-home {
  min-height: 100vh;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 224rpx;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  height: 123rpx;
  padding: 0 31rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap,
.tool-left,
.audit-left,
.fleet-label,
.trend-row {
  display: flex;
  align-items: center;
}

.brand-wrap {
  gap: 24rpx;
  min-width: 0;
}

.avatar-button {
  width: 62rpx;
  height: 62rpx;
  border-radius: 999rpx;
  background: #313540;
  color: #e1fdff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 46rpx;
  line-height: 56rpx;
  font-weight: 700;
  white-space: nowrap;
}

.signal-button {
  width: 66rpx;
  height: 66rpx;
  color: #e1fdff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  position: relative;
  z-index: 1;
  padding: 154rpx 31rpx 0;
  display: flex;
  flex-direction: column;
  gap: 31rpx;
  box-sizing: border-box;
}

.overview-row {
  min-height: 92rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
}

.page-title,
.timestamp {
  display: block;
}

.page-title {
  color: #dfe2f0;
  font-size: 35rpx;
  line-height: 46rpx;
  font-weight: 700;
}

.timestamp {
  margin-top: 12rpx;
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 39rpx;
}

.online-pill {
  height: 48rpx;
  padding: 0 22rpx;
  border: 2rpx solid rgba(0, 242, 255, .32);
  border-radius: 4rpx;
  background: rgba(0, 242, 255, .10);
  color: #00f2ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 21rpx;
  line-height: 48rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10rpx;
  white-space: nowrap;
}

.pulse-dot {
  width: 15rpx;
  height: 15rpx;
  border-radius: 999rpx;
  background: #00f2ff;
  box-shadow: 0 0 0 0 rgba(0, 242, 255, .42);
  animation: adminPulse 2s infinite;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 31rpx;
}

.kpi-card,
.fleet-card,
.tool-card,
.audit-card {
  background: #141822;
  box-sizing: border-box;
}

.kpi-card,
.fleet-card,
.tool-card {
  border: 1rpx solid rgba(58, 73, 75, .45);
}

.audit-card {
  border: 2rpx solid #3a494b;
}

.kpi-card {
  min-height: 275rpx;
  padding: 31rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.kpi-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
  color: #b9cacb;
  font-size: 25rpx;
  line-height: 34rpx;
  font-weight: 700;
}

.kpi-head .stitch-icon {
  color: #849495;
  flex: 0 0 auto;
}

.kpi-value {
  margin-top: 26rpx;
  color: #e1fdff;
  font-family: "Hanken Grotesk", "JetBrains Mono", sans-serif;
  font-size: 72rpx;
  line-height: 86rpx;
  font-weight: 700;
  white-space: nowrap;
}

.kpi-value.cyan {
  color: #00f2ff;
  font-size: 68rpx;
}

.trend-row {
  margin-top: 20rpx;
  gap: 8rpx;
  color: #10b981;
  font-family: "JetBrains Mono", monospace;
  font-size: 25rpx;
  line-height: 35rpx;
  font-weight: 700;
}

.fleet-card {
  grid-column: span 2;
  min-height: 185rpx;
  padding: 27rpx 31rpx;
  border-radius: 16rpx;
}

.fleet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.fleet-label {
  gap: 18rpx;
  color: #b9cacb;
  font-size: 29rpx;
  line-height: 41rpx;
  font-weight: 700;
}

.fleet-label .stitch-icon {
  color: #00f2ff;
}

.fleet-count {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 29rpx;
  line-height: 41rpx;
  white-space: nowrap;
}

.fleet-track {
  height: 15rpx;
  border-radius: 999rpx;
  margin-top: 24rpx;
  overflow: hidden;
  background: #313540;
}

.fleet-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #00f2ff;
}

.zone-row {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 16rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 700;
  white-space: nowrap;
}

.section-block {
  margin-top: 8rpx;
}

.section-title {
  color: #b9cacb;
  font-size: 25rpx;
  line-height: 35rpx;
  font-weight: 700;
  padding-bottom: 18rpx;
  margin-bottom: 22rpx;
  border-bottom: 2rpx solid #3a494b;
}

.section-title.no-margin {
  margin: 0;
  padding: 0;
  border: 0;
}

.tool-card {
  min-height: 139rpx;
  border-radius: 16rpx;
  background: #1b1f2a;
  padding: 31rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.tool-left {
  gap: 24rpx;
  min-width: 0;
}

.tool-icon {
  width: 76rpx;
  height: 76rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(59, 130, 246, .40);
  background: rgba(59, 130, 246, .20);
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.tool-title,
.tool-desc {
  display: block;
}

.tool-title {
  color: #e1fdff;
  font-size: 31rpx;
  line-height: 43rpx;
  font-weight: 600;
}

.tool-desc {
  margin-top: 8rpx;
  color: #b9cacb;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 700;
}

.chevron {
  color: #849495;
  flex: 0 0 auto;
}

.section-head {
  padding-bottom: 18rpx;
  margin-bottom: 22rpx;
  border-bottom: 2rpx solid #3a494b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.audit-badge {
  min-width: 116rpx;
  height: 39rpx;
  border-radius: 999rpx;
  padding: 0 18rpx;
  box-sizing: border-box;
  background: #f59e0b;
  color: #0b0e14;
  font-size: 23rpx;
  line-height: 39rpx;
  font-weight: 800;
  text-align: center;
}

.audit-list {
  display: flex;
  flex-direction: column;
  gap: 23rpx;
}

.audit-card {
  min-height: 124rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.audit-left {
  gap: 24rpx;
  min-width: 0;
}

.audit-icon {
  width: 78rpx;
  height: 78rpx;
  border-radius: 24rpx;
  border: 2rpx solid #3a494b;
  background: #1b1f2a;
  color: #849495;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.audit-copy {
  min-width: 0;
}

.audit-name,
.audit-id {
  display: block;
  max-width: 374rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-name {
  color: #e1fdff;
  font-size: 29rpx;
  line-height: 41rpx;
  font-weight: 500;
}

.audit-id {
  margin-top: 6rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 700;
}

.audit-action {
  width: 103rpx;
  height: 58rpx;
  border-radius: 4rpx;
  background: #00f2ff;
  color: #002022;
  font-size: 25rpx;
  line-height: 58rpx;
  font-weight: 800;
  text-align: center;
  flex: 0 0 auto;
}

.risk-card {
  position: relative;
  min-height: 244rpx;
  border: 2rpx solid rgba(239, 68, 68, .55);
  border-radius: 16rpx;
  background: #262a34;
  overflow: hidden;
  display: flex;
  gap: 24rpx;
  padding: 31rpx;
  box-sizing: border-box;
}

.risk-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 9rpx;
  background: #ef4444;
}

.warning-mark {
  width: 43rpx;
  height: 39rpx;
  margin-top: 3rpx;
  color: #ef4444;
  flex: 0 0 auto;
  position: relative;
  box-sizing: border-box;
}

.warning-mark::before,
.warning-mark::after {
  content: "";
  position: absolute;
  width: 0;
  height: 0;
}

.warning-mark::before {
  left: 0;
  top: 0;
  border-left: 22rpx solid transparent;
  border-right: 22rpx solid transparent;
  border-bottom: 39rpx solid #ef4444;
}

.warning-mark::after {
  left: 5rpx;
  top: 8rpx;
  border-left: 17rpx solid transparent;
  border-right: 17rpx solid transparent;
  border-bottom: 29rpx solid #262a34;
}

.warning-bang {
  position: absolute;
  left: 0;
  right: 0;
  top: 13rpx;
  z-index: 2;
  color: #ef4444;
  font-size: 24rpx;
  line-height: 24rpx;
  font-weight: 900;
  text-align: center;
}

.risk-copy {
  min-width: 0;
  flex: 1;
}

.risk-title,
.risk-body {
  display: block;
}

.risk-title {
  color: #e1fdff;
  font-size: 29rpx;
  line-height: 41rpx;
  font-weight: 700;
}

.risk-body {
  margin-top: 9rpx;
  color: #b9cacb;
  font-size: 27rpx;
  line-height: 39rpx;
}

.mono {
  color: #e1fdff;
  font-family: "JetBrains Mono", monospace;
}

.risk-actions {
  margin-top: 27rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.risk-detail,
.risk-contact {
  height: 55rpx;
  padding: 0 24rpx;
  border-radius: 4rpx;
  font-size: 25rpx;
  line-height: 55rpx;
  font-weight: 700;
  box-sizing: border-box;
}

.risk-detail {
  border: 2rpx solid #ef4444;
  color: #ef4444;
}

.risk-contact {
  background: #353944;
  color: #dfe2f0;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  height: 148rpx;
  padding: 14rpx 31rpx 27rpx;
  border-top: 2rpx solid #3a494b;
  border-top-left-radius: 16rpx;
  border-top-right-radius: 16rpx;
  background: #0f131d;
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-sizing: border-box;
}

.nav-item {
  min-width: 88rpx;
  height: 96rpx;
  color: #b9cacb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 21rpx;
  line-height: 25rpx;
  font-weight: 700;
}

.nav-item.active {
  min-width: 106rpx;
  border-radius: 30rpx;
  color: #00f2ff;
  background: rgba(5, 102, 217, .35);
}

.tap-press {
  opacity: .78;
  transform: scale(.985);
}

@keyframes adminPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 242, 255, .42);
  }

  70% {
    box-shadow: 0 0 0 12rpx rgba(0, 242, 255, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(0, 242, 255, 0);
  }
}
@media (min-width: 768px) {
  .admin-home {
    width: 390px;
    min-height: 1100px;
    margin: 0 auto;
    box-shadow: 0 0 0 1px rgba(58, 73, 75, .45);
  }

  .topbar,
  .bottom-nav {
    left: 50%;
    width: 390px;
    transform: translateX(-50%);
  }
}
</style>
