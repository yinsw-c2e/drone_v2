<template>
  <AdminConsoleShell active="risk">
    <view class="module-head">
      <view>
        <text class="module-kicker">RISK / CLAIMS</text>
        <text class="module-title">风控理赔</text>
        <text class="module-subtitle">异常订单、理赔工单与黑名单处置统一入口</text>
      </view>
      <view class="module-actions">
        <view class="ghost-button" hover-class="tap-press" @click="refresh">刷新风险</view>
        <view v-if="selected && selected.sourceType !== 'order'" class="action-button" hover-class="tap-press" @click="handle(selected)">{{ selected.actionLabel }}</view>
      </view>
    </view>

    <view class="summary-grid">
      <view class="metric-tile">
        <text class="metric-label">RISK ITEMS</text>
        <text class="metric-value">{{ rows.length }}</text>
        <text class="metric-note">需处理事项</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">CLAIMS</text>
        <text class="metric-value">{{ claimCount }}</text>
        <text class="metric-note">理赔流转中</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">EXCEPTIONS</text>
        <text class="metric-value">{{ exceptionCount }}</text>
        <text class="metric-note">异常运单</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">BLACKLIST</text>
        <text class="metric-value">{{ blacklistCount }}</text>
        <text class="metric-note">受限用户</text>
      </view>
    </view>

    <view class="content-grid">
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">风险队列</text>
          <text class="panel-subtitle">{{ rows.length }} 项</text>
        </view>
        <view v-if="!rows.length" class="empty-state">
          <text>当前无异常</text>
          <text>新的理赔、黑名单或异常订单会进入这里</text>
        </view>
        <view v-else class="record-list">
          <view
            v-for="row in rows"
            :key="row.id"
            :class="['record-row', selected?.id === row.id ? 'selected' : '']"
            hover-class="tap-press"
            @click="selectedId = row.id"
          >
            <view>
              <text class="record-id">{{ row.code }}</text>
              <text class="record-title">{{ row.title }}</text>
              <text class="record-desc">{{ row.description }}</text>
              <text class="record-meta">{{ row.sourceType }}</text>
            </view>
            <view class="record-side">
              <text :class="['status-pill', row.tone]">{{ row.statusLabel }}</text>
              <view class="outline-button" hover-class="tap-press" @click.stop="handle(row)">{{ row.actionLabel }}</view>
            </view>
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">处置明细</text>
          <text class="panel-subtitle">{{ selected?.code || '未选择' }}</text>
        </view>
        <view v-if="selected" class="timeline-list">
          <view v-for="line in selected.detailLines" :key="line" class="timeline-item">
            <text class="timeline-time">{{ selected.statusLabel }}</text>
            <text class="timeline-text">{{ line }}</text>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>暂无风险项</text>
          <text>当前业务流没有待处置风险</text>
        </view>
      </view>
    </view>
  </AdminConsoleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AdminConsoleShell from '@/components/AdminConsoleShell.vue';
import type { AdminRiskRow } from '@/services/admin-console';
import { adminRiskRows, runAdminRiskAction } from '@/services/admin-console';

const refreshTick = ref(0);
const selectedId = ref('');

const rows = computed(() => {
  void refreshTick.value;
  return adminRiskRows();
});
const selected = computed(() => rows.value.find((row) => row.id === selectedId.value) ?? rows.value[0]);
const claimCount = computed(() => rows.value.filter((row) => row.sourceType === 'claim').length);
const exceptionCount = computed(() => rows.value.filter((row) => row.sourceType === 'order').length);
const blacklistCount = computed(() => rows.value.filter((row) => row.sourceType === 'user').length);

function refresh() {
  refreshTick.value += 1;
  uni.showToast({ title: '风险队列已刷新', icon: 'none' });
}

function handle(row: AdminRiskRow) {
  selectedId.value = row.id;
  if (row.sourceType === 'order') {
    uni.showToast({ title: `${row.code} 已打开事件`, icon: 'none' });
    return;
  }
  runAdminRiskAction(row);
  refreshTick.value += 1;
  uni.showToast({ title: `${row.code} 已处理`, icon: 'none' });
}
</script>
