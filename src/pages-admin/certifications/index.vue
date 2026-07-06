<template>
  <AdminConsoleShell active="certifications">
    <view class="module-head">
      <view>
        <text class="module-kicker">FACT CHECK / QUEUE</text>
        <text class="module-title">认证审核</text>
        <text class="module-subtitle">三方认证、飞手资质与机主设备材料集中复核</text>
      </view>
      <view class="module-actions">
        <view class="ghost-button" hover-class="tap-press" @click="refresh()">刷新队列</view>
        <view v-if="selected" class="action-button" hover-class="tap-press" @click="approve(selected)">通过当前</view>
      </view>
    </view>

    <view class="summary-grid">
      <view class="metric-tile">
        <text class="metric-label">PENDING</text>
        <text class="metric-value">{{ rows.length }}</text>
        <text class="metric-note">待审核材料</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">APPLICATIONS</text>
        <text class="metric-value">{{ applicationCount }}</text>
        <text class="metric-note">三方认证申请</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">PROFILE CHECK</text>
        <text class="metric-value">{{ pilotProfileCount }}</text>
        <text class="metric-note">飞手资质复核</text>
      </view>
      <view class="metric-tile">
        <text class="metric-label">OVERDUE</text>
        <text class="metric-value">{{ overdueCount }}</text>
        <text class="metric-note">超 1 小时待审</text>
      </view>
    </view>

    <view class="content-grid">
      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">审核队列</text>
          <text class="panel-subtitle">{{ rows.length }} 条</text>
        </view>
        <view v-if="!rows.length" class="empty-state">
          <text>队列已清空</text>
          <text>新的认证材料提交后会进入这里</text>
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
              <text class="record-title">{{ row.title }} · {{ row.userName }}</text>
              <text class="record-desc">{{ row.description }}</text>
              <text class="record-meta">{{ row.roleLabel }} / {{ row.submittedAt }} / {{ row.waitLabel }}</text>
            </view>
            <view class="record-side">
              <text :class="['status-pill', row.tone]">{{ row.statusLabel }}</text>
              <view class="outline-button" hover-class="tap-press" @click.stop="approve(row)">通过</view>
              <view class="danger-button" hover-class="tap-press" @click.stop="reject(row)">驳回</view>
            </view>
          </view>
        </view>
      </view>

      <view class="panel">
        <view class="panel-head">
          <text class="panel-title">资料明细</text>
          <text class="panel-subtitle">{{ selected?.code || '未选择' }}</text>
        </view>
        <view v-if="selected" class="field-grid">
          <view class="field-item">
            <text class="field-label">用户</text>
            <text class="field-value">{{ selected.userName }} / {{ selected.userId }}</text>
          </view>
          <view class="field-item">
            <text class="field-label">角色</text>
            <text class="field-value">{{ selected.roleLabel }}</text>
          </view>
          <view v-for="field in selected.fields" :key="field.label" class="field-item">
            <text class="field-label">{{ field.label }}</text>
            <text class="field-value">{{ field.value }}</text>
          </view>
        </view>
        <view v-else class="empty-state">
          <text>暂无资料</text>
          <text>认证队列为空</text>
        </view>
      </view>
    </view>
  </AdminConsoleShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminConsoleShell from '@/components/AdminConsoleShell.vue';
import type { AdminCertificationRow } from '@/services/admin-console';
import { adminCertificationRows, approveAdminCertification, rejectAdminCertification } from '@/services/admin-console';
import { approveCertificationRemote, fetchCertificationsRemote, rejectCertificationRemote } from '@/api/backend';

const refreshTick = ref(0);
const selectedId = ref('');

const rows = computed(() => {
  void refreshTick.value;
  return adminCertificationRows();
});
const selected = computed(() => rows.value.find((row) => row.id === selectedId.value) ?? rows.value[0]);
const applicationCount = computed(() => rows.value.filter((row) => row.kind === 'application').length);
const pilotProfileCount = computed(() => rows.value.filter((row) => row.kind === 'pilot').length);
const overdueCount = computed(() => rows.value.filter((row) => row.tone === 'danger').length);

onMounted(() => {
  void refresh(false);
});

async function refresh(showMessage = true) {
  await fetchCertificationsRemote();
  refreshTick.value += 1;
  if (showMessage) uni.showToast({ title: '审核队列已刷新', icon: 'none' });
}

async function approve(row: AdminCertificationRow) {
  try {
    const remote = row.kind === 'application' ? await approveCertificationRemote(row.sourceId) : undefined;
    if (!remote) approveAdminCertification(row);
    refreshTick.value += 1;
    uni.showToast({ title: `${row.code} 已通过`, icon: 'none' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '审核失败', icon: 'none' });
  }
}

async function reject(row: AdminCertificationRow) {
  try {
    const remote = row.kind === 'application' ? await rejectCertificationRemote(row.sourceId) : undefined;
    if (!remote) rejectAdminCertification(row);
    refreshTick.value += 1;
    uni.showToast({ title: `${row.code} 已驳回`, icon: 'none' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '审核失败', icon: 'none' });
  }
}
</script>
