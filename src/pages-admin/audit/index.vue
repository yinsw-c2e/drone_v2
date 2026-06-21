<template>
  <AdminConsoleShell active="audit">
    <view class="module-head">
      <view>
        <text class="module-kicker">AUDIT / TRACE</text>
        <text class="module-title">审计日志</text>
        <text class="module-subtitle">订单、认证、支付、空域、保险与风控动作全链路留痕</text>
      </view>
      <view class="module-actions">
        <view class="ghost-button" hover-class="tap-press" @click="refresh">刷新日志</view>
      </view>
    </view>

    <view class="summary-grid">
      <view class="metric-tile">
        <text class="metric-label">LOGS</text>
        <text class="metric-value">{{ rows.length }}</text>
        <text class="metric-note">审计事件</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">FILTERED</text>
        <text class="metric-value">{{ filteredRows.length }}</text>
        <text class="metric-note">当前筛选结果</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">LATEST</text>
        <text class="metric-value">{{ latestAction }}</text>
        <text class="metric-note">最近动作类型</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">ACTORS</text>
        <text class="metric-value">{{ actorCount }}</text>
        <text class="metric-note">参与主体</text>
      </view>
    </view>

    <view class="content-grid wide">
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">日志筛选</text>
          <text class="panel-subtitle">{{ activeLabel }}</text>
        </view>
        <view class="field-grid">
          <view
            v-for="filter in filters"
            :key="filter.key"
            :class="['field-item', activeFilter === filter.key ? 'selected' : '']"
            hover-class="tap-press"
            @click="activeFilter = filter.key"
          >
            <text class="field-label">{{ filter.count }} 条</text>
            <text class="field-value">{{ filter.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="content-grid wide">
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">事件流水</text>
          <text class="panel-subtitle">{{ filteredRows.length }} 条</text>
        </view>
        <view v-if="!filteredRows.length" class="empty-state">
          <text>暂无日志</text>
          <text>业务动作发生后会自动写入审计日志</text>
        </view>
        <view v-else class="record-list">
          <view v-for="row in filteredRows" :key="row.id" class="record-row">
            <view>
              <text class="record-id">{{ row.actionLabel }} / {{ row.time }}</text>
              <text class="record-title">{{ row.detail }}</text>
              <text class="record-desc">{{ row.actorLabel }} -> {{ row.targetLabel }}</text>
            </view>
            <view class="record-side">
              <text class="status-pill normal">{{ row.actionLabel }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </AdminConsoleShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AdminConsoleShell from '@/components/AdminConsoleShell.vue';
import type { AuditAction } from '@/models';
import { adminAuditRows } from '@/services/admin-console';

type AuditFilter = AuditAction | 'all';

const refreshTick = ref(0);
const activeFilter = ref<AuditFilter>('all');

const rows = computed(() => {
  void refreshTick.value;
  return adminAuditRows();
});
const filters = computed(() => {
  const groups = new Map<AuditFilter, { key: AuditFilter; label: string; count: number }>();
  groups.set('all', { key: 'all', label: '全部', count: rows.value.length });
  rows.value.forEach((row) => {
    const current = groups.get(row.action);
    if (current) {
      current.count += 1;
    } else {
      groups.set(row.action, { key: row.action, label: row.actionLabel, count: 1 });
    }
  });
  return Array.from(groups.values());
});
const filteredRows = computed(() => activeFilter.value === 'all' ? rows.value : rows.value.filter((row) => row.action === activeFilter.value));
const activeLabel = computed(() => filters.value.find((item) => item.key === activeFilter.value)?.label ?? '全部');
const latestAction = computed(() => rows.value[0]?.actionLabel ?? '-');
const actorCount = computed(() => new Set(rows.value.map((row) => row.actorLabel)).size);

function refresh() {
  refreshTick.value += 1;
  uni.showToast({ title: '审计日志已刷新', icon: 'none' });
}
</script>
