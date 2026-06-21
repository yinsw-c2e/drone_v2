<template>
  <AdminConsoleShell active="orders">
    <view class="module-head">
      <view>
        <text class="module-kicker">ORDER OPS / FLOW</text>
        <text class="module-title">订单管理</text>
        <text class="module-subtitle">发单、匹配、空域、飞行、完结与结算状态统一调度</text>
      </view>
      <view class="module-actions">
        <view class="ghost-button" hover-class="tap-press" @click="refresh()">刷新订单</view>
        <view v-if="selected?.canAdvance" class="action-button" hover-class="tap-press" @click="advance(selected)">
          {{ loadingId === selected.id ? '处理中' : selected.actionLabel }}
        </view>
      </view>
    </view>

    <view class="summary-grid">
      <view class="metric-tile">
        <text class="metric-label">TOTAL ORDERS</text>
        <text class="metric-value">{{ rows.length }}</text>
        <text class="metric-note">全量运单</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">ACTIVE</text>
        <text class="metric-value">{{ activeCount }}</text>
        <text class="metric-note">流转中</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">SETTLED</text>
        <text class="metric-value">{{ settledCount }}</text>
        <text class="metric-note">已完成结算</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">REVENUE</text>
        <text class="metric-value">{{ revenueLabel }}</text>
        <text class="metric-note">订单总流水</text>
      </view>
    </view>

    <view v-if="feedback.message" :class="['order-feedback', feedback.kind]">
      <StitchIcon :name="feedback.kind === 'danger' ? 'error' : feedback.kind === 'success' ? 'check_circle' : 'info'" size="20px" />
      <view>
        <text class="order-feedback-title">{{ feedback.title }}</text>
        <text class="order-feedback-copy">{{ feedback.message }}</text>
      </view>
    </view>

    <view class="content-grid">
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">运单列表</text>
          <text class="panel-subtitle">{{ rows.length }} 单</text>
        </view>
        <view v-if="!rows.length" class="empty-state">
          <text>暂无订单</text>
          <text>由业主发单后会进入订单管理</text>
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
              <text class="record-title">{{ row.title }} · {{ row.cargoLabel }}</text>
              <text class="record-desc">{{ row.route }}</text>
              <text class="record-meta">{{ row.createdAt }} / {{ row.latestEvent }}</text>
            </view>
            <view class="record-side">
              <text :class="['status-pill', row.tone]">{{ row.statusLabel }}</text>
              <view v-if="row.canAdvance" class="outline-button" hover-class="tap-press" @click.stop="advance(row)">
                {{ loadingId === row.id ? '处理中' : row.actionLabel }}
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">订单明细</text>
          <text class="panel-subtitle">{{ selected?.code || '未选择' }}</text>
        </view>
        <view v-if="selected" class="field-grid">
          <view class="field-item">
            <text class="field-label">状态</text>
            <text class="field-value">{{ selected.statusLabel }}</text>
          </view>
          <view class="field-item">
            <text class="field-label">预算 / 成交</text>
            <text class="field-value">{{ selected.budgetLabel }} / {{ selected.priceLabel }}</text>
          </view>
          <view class="field-item">
            <text class="field-label">飞手</text>
            <text class="field-value">{{ selected.pilotLabel }}</text>
          </view>
          <view class="field-item">
            <text class="field-label">设备</text>
            <text class="field-value">{{ selected.droneLabel }}</text>
          </view>
          <view class="field-item">
            <text class="field-label">机主</text>
            <text class="field-value">{{ selected.ownerLabel }}</text>
          </view>
          <view class="field-item">
            <text class="field-label">下一动作</text>
            <text class="field-value">{{ selected.actionLabel }}</text>
          </view>
        </view>
        <view v-if="selected" class="timeline-list">
          <view v-for="event in selected.events" :key="`${event.at}-${event.status}-${event.note}`" class="timeline-item">
            <text class="timeline-time">{{ event.at }} / {{ event.status }}</text>
            <text class="timeline-text">{{ event.note }}</text>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>暂无明细</text>
          <text>请选择一条订单</text>
        </view>
      </view>
    </view>
  </AdminConsoleShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminConsoleShell from '@/components/AdminConsoleShell.vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { OrderStatus } from '@/models';
import { syncBackendSnapshot } from '@/api/backend';
import type { AdminOrderRow } from '@/services/admin-console';
import { adminOrderRows, adminReport, advanceAdminOrder, formatMoneyCent } from '@/services/admin-console';

const refreshTick = ref(0);
const selectedId = ref('');
const loadingId = ref('');
const feedback = ref<{ kind: 'info' | 'success' | 'danger'; title: string; message: string }>({ kind: 'info', title: '', message: '' });

const rows = computed(() => {
  void refreshTick.value;
  return adminOrderRows();
});
const selected = computed(() => rows.value.find((row) => row.id === selectedId.value) ?? rows.value[0]);
const activeCount = computed(() => rows.value.filter((row) => ![OrderStatus.Settled, OrderStatus.Cancelled, OrderStatus.Exception].includes(row.status)).length);
const settledCount = computed(() => rows.value.filter((row) => row.status === OrderStatus.Settled).length);
const revenueLabel = computed(() => {
  void refreshTick.value;
  return formatMoneyCent(adminReport().revenue);
});

onMounted(() => {
  void refresh(false);
});

async function refresh(showMessage = true) {
  await syncBackendSnapshot();
  refreshTick.value += 1;
  if (showMessage) {
    setFeedback('info', '订单已刷新', '后台订单列表已同步最新业务状态。');
    uni.showToast({ title: '订单已刷新', icon: 'none' });
  }
}

async function advance(row: AdminOrderRow) {
  if (loadingId.value) return;
  loadingId.value = row.id;
  try {
    const next = await advanceAdminOrder(row.id);
    selectedId.value = next.id;
    refreshTick.value += 1;
    const message = row.actionLabel === '锁定推荐运力'
      ? `${row.code} 已锁定推荐运力，请由飞手提交空域申请。`
      : `${row.code} 已推进，最新状态已同步。`;
    setFeedback('success', '操作完成', message);
    uni.showToast({ title: `${row.code} 已推进`, icon: 'none' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '推进失败';
    setFeedback('danger', '操作未完成', message);
    uni.showToast({ title: message, icon: 'none' });
  } finally {
    loadingId.value = '';
  }
}

function setFeedback(kind: 'info' | 'success' | 'danger', title: string, message: string) {
  feedback.value = { kind, title, message };
}
</script>

<style lang="scss" scoped>
.order-feedback {
  margin-top: 18px;
  min-height: 64px;
  padding: 14px 16px;
  border: 1px solid rgba(63, 78, 96, .92);
  border-radius: 6px;
  background: rgba(16, 24, 36, .86);
  color: #dbeafe;
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
}

.order-feedback.success {
  border-color: rgba(16, 185, 129, .45);
  background: rgba(16, 185, 129, .11);
  color: #bbf7d0;
}

.order-feedback.danger {
  border-color: rgba(248, 113, 113, .55);
  background: rgba(127, 29, 29, .2);
  color: #fecaca;
}

.order-feedback :deep(.stitch-icon) {
  flex: 0 0 auto;
}

.order-feedback-title,
.order-feedback-copy {
  display: block;
}

.order-feedback-title {
  font-size: 13px;
  line-height: 18px;
  font-weight: 800;
}

.order-feedback-copy {
  margin-top: 2px;
  font-size: 13px;
  line-height: 20px;
  color: inherit;
}
</style>
