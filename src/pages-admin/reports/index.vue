<template>
  <AdminConsoleShell active="reports">
    <view class="module-head">
      <view>
        <text class="module-kicker">ANALYTICS / ADVICE</text>
        <text class="module-title">报表建议</text>
        <text class="module-subtitle">订单吞吐、收入结构、纠纷与运力热区运营分析</text>
      </view>
      <view class="module-actions">
        <view class="ghost-button" hover-class="tap-press" @click="refresh">刷新报表</view>
        <view class="action-button" hover-class="tap-press" @click="exportSummary">导出摘要</view>
      </view>
    </view>

    <view class="summary-grid reports-summary">
      <view class="metric-tile">
        <text class="metric-label">COMPLETION</text>
        <text class="metric-value">{{ completionRate }}</text>
        <text class="metric-note">平台完单率</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">CANCEL RATE</text>
        <text class="metric-value">{{ cancelRate }}</text>
        <text class="metric-note">取消率</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">REVENUE</text>
        <text class="metric-value">{{ revenueLabel }}</text>
        <text class="metric-note">订单总流水</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">ACTIVE USERS</text>
        <text class="metric-value">{{ report.activeUsers }}</text>
        <text class="metric-note">参与方去重</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">CLAIMS</text>
        <text class="metric-value">{{ claimSummary }}</text>
        <text class="metric-note">理赔闭环 / 未处理 {{ report.openClaimCount }}</text>
      </view>
    </view>

    <view v-if="summaryVisible" class="content-grid wide">
      <view class="panel export-panel">
        <view class="panel-head">
          <text class="panel-title">运营报表摘要</text>
          <text class="panel-subtitle">{{ summaryFeedback }}</text>
        </view>
        <view class="summary-list">
          <view v-for="row in summaryRows" :key="row.label" class="summary-row">
            <text>{{ row.label }}</text>
            <text>{{ row.value }}</text>
          </view>
        </view>
        <view class="summary-advice">
          <text>运营建议</text>
          <text>{{ summaryAdvice }}</text>
        </view>
        <view class="summary-actions">
          <view class="ghost-button" hover-class="tap-press" @click="summaryVisible = false">收起摘要</view>
          <view class="action-button" hover-class="tap-press" @click="downloadSummary">重新导出</view>
        </view>
      </view>
    </view>

    <view class="content-grid">
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">周期报表</text>
          <text class="panel-subtitle">日报 / 周报 / 月报</text>
        </view>
        <view class="table-list">
          <view class="table-head">
            <text>周期</text>
            <text>订单</text>
            <text>完单</text>
            <text>流水</text>
          </view>
          <view v-for="period in report.periods" :key="period.period" class="table-row">
            <text>{{ period.period }}</text>
            <text>{{ period.orders }}</text>
            <text>{{ period.completed }}</text>
            <text>{{ money(period.incomeCent) }}</text>
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">运营建议</text>
          <text class="panel-subtitle">{{ report.suggestions.length }} 条</text>
        </view>
        <view v-if="!report.suggestions.length" class="empty-state">
          <text>暂无建议</text>
          <text>订单、运力或纠纷变化后会生成建议</text>
        </view>
        <view v-else class="record-list">
          <view v-for="item in report.suggestions" :key="item" class="record-row">
            <view>
              <text class="record-id">ADVICE</text>
              <text class="record-title">{{ item }}</text>
              <text class="record-desc">基于当前订单、在线运力与纠纷数据生成</text>
            </view>
            <view class="record-side">
              <text class="status-pill warning">建议</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="content-grid wide">
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">运力热区</text>
          <text class="panel-subtitle">{{ report.heatmap.length }} 个运力点</text>
        </view>
        <view class="table-list">
          <view class="table-head">
            <text>运力</text>
            <text>状态</text>
            <text>位置</text>
            <text>运营提示</text>
          </view>
          <view v-for="point in report.heatmap" :key="point.id" class="table-row">
            <text>{{ point.label }}</text>
            <text>{{ point.statusLabel }}</text>
            <text>{{ point.area }}</text>
            <text>{{ point.actionHint }}</text>
          </view>
        </view>
      </view>
    </view>
  </AdminConsoleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AdminConsoleShell from '@/components/AdminConsoleShell.vue';
import { adminReport, formatMoneyCent, formatPercent } from '@/services/admin-console';
import { exportStamp, exportTextFile } from '@/utils/export';

const refreshTick = ref(0);
const summaryVisible = ref(false);
const summaryFeedback = ref('未导出');
const report = computed(() => {
  void refreshTick.value;
  return adminReport();
});
const completionRate = computed(() => formatPercent(report.value.completionRate));
const cancelRate = computed(() => formatPercent(report.value.cancelRate));
const revenueLabel = computed(() => formatMoneyCent(report.value.revenue));
const claimSummary = computed(() => `${report.value.paidClaimCount}/${report.value.claimCount}`);
const claimPayoutLabel = computed(() => formatMoneyCent(report.value.claimPayoutCent));
const summaryRows = computed(() => [
  { label: '完单率', value: completionRate.value },
  { label: '取消率', value: cancelRate.value },
  { label: '流水', value: revenueLabel.value },
  { label: '纠纷/异常', value: String(report.value.disputes) },
  { label: '已赔付理赔', value: `${report.value.paidClaimCount}/${report.value.claimCount}` },
  { label: '累计赔付', value: claimPayoutLabel.value },
]);
const summaryAdvice = computed(() => report.value.suggestions.length ? report.value.suggestions.join('；') : '暂无运营建议');

function refresh() {
  refreshTick.value += 1;
  uni.showToast({ title: '报表已刷新', icon: 'none' });
}

function money(value: number) {
  return formatMoneyCent(value);
}

async function exportSummary() {
  summaryVisible.value = true;
  await downloadSummary();
}

async function downloadSummary() {
  const filename = `skylink-operation-summary-${exportStamp()}.txt`;
  const result = await exportTextFile(filename, summaryText(), 'text/plain;charset=utf-8');
  summaryFeedback.value = result === 'downloaded' ? `已下载 ${filename}` : result === 'copied' ? '摘要已复制到剪贴板' : '导出失败，请稍后重试';
}

function summaryText() {
  return [
    'SkyLink Logistics 运营报表摘要',
    ...summaryRows.value.map((row) => `${row.label}：${row.value}`),
    `运营建议：${summaryAdvice.value}`,
  ].join('\n');
}
</script>

<style lang="scss" scoped>
.export-panel {
  border-color: $color-primary;
}

.summary-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $sp-3;
}

.reports-summary.summary-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.summary-row {
  min-height: 74px;
  padding: $sp-3;
  border: 2rpx solid $line;
  border-radius: $r-sm;
  background: $bg-sunken;
  box-sizing: border-box;
}

.summary-row text:first-child,
.summary-advice text:first-child {
  display: block;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.2;
  font-weight: $fw-bold;
}

.summary-row text:last-child {
  display: block;
  margin-top: $sp-2;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 1.2;
  font-weight: $fw-bold;
}

.summary-advice {
  margin-top: $sp-3;
  padding: $sp-3;
  border: 2rpx solid $line;
  border-radius: $r-sm;
  background: $surface-command;
}

.summary-advice text:last-child {
  display: block;
  margin-top: $sp-2;
  color: $ink-900;
  font-size: $fs-body;
  line-height: 1.45;
}

.summary-actions {
  margin-top: $sp-3;
  display: flex;
  justify-content: flex-end;
  gap: $sp-2;
}

@media screen and (max-width: 980px) {
  .reports-summary.summary-grid,
  .summary-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
