<template>
  <view v-if="active" class="panel-mask" @click="close" />

  <view v-if="active === 'notifications'" class="console-pop">
    <view class="pop-head">
      <text class="pop-title">通知中心</text>
      <view class="pop-head-side">
        <text class="pop-count">{{ unreadCount }} 未读</text>
        <view class="pop-button" hover-class="tap-press" @click="markAllRead">
          <StitchIcon name="mark_email_read" size="15px" />
          <text>全部已读</text>
        </view>
      </view>
    </view>
    <scroll-view class="pop-body" scroll-y>
      <view v-if="!noticeGroups.length" class="pop-empty">
        <StitchIcon name="notifications_off" size="26px" />
        <text>暂无通知</text>
      </view>
      <view
        v-for="group in noticeGroups"
        :key="group.key"
        :class="['notice-row', group.unread ? 'unread' : '']"
        hover-class="tap-press"
        @click="markGroupRead(group)"
      >
        <view :class="['notice-icon', group.tone]">
          <StitchIcon :name="group.icon" size="18px" />
        </view>
        <view class="notice-copy">
          <view class="notice-title-row">
            <text class="notice-title">{{ group.title }}</text>
            <text v-if="group.count > 1" class="notice-x">×{{ group.count }}</text>
          </view>
          <text class="notice-body">{{ group.body }}</text>
          <text class="notice-meta">{{ group.roleText }} · {{ group.time }}</text>
        </view>
        <view v-if="group.unread" class="notice-dot" />
      </view>
    </scroll-view>
  </view>

  <view v-if="active === 'settings'" class="console-pop">
    <view class="pop-head">
      <text class="pop-title">系统设置</text>
      <view class="pop-head-side">
        <text class="pop-count">{{ productionRuntime ? '正式数据' : '演示数据' }}</text>
      </view>
    </view>
    <view class="pop-section">
      <view v-for="row in envRows" :key="row.label" class="env-row">
        <text class="env-label">{{ row.label }}</text>
        <text class="env-value">{{ row.value }}</text>
      </view>
    </view>
    <view v-if="!productionRuntime" class="pop-section actions">
      <view class="pop-action" hover-class="tap-press" @click="exportSnapshot">
        <StitchIcon name="download" size="18px" />
        <view class="pop-action-copy">
          <text class="pop-action-title">导出演示数据</text>
          <text class="pop-action-desc">下载当前演示业务数据，用于留存或问题排查</text>
        </view>
      </view>
      <view class="pop-action danger" hover-class="tap-press" @click="confirmReset">
        <StitchIcon name="restart_alt" size="18px" />
        <view class="pop-action-copy">
          <text class="pop-action-title">重置演示数据</text>
          <text class="pop-action-desc">清空订单、流水与通知，恢复初始示例</text>
        </view>
      </view>
    </view>
    <view v-if="confirmingReset" class="pop-section reset-confirm">
      <text class="reset-title">确认重置演示数据</text>
      <text class="reset-desc">将清空当前演示订单、流水、通知等业务数据并恢复初始示例，此操作不可撤销。</text>
      <view class="reset-actions">
        <view class="pop-button" hover-class="tap-press" @click="confirmingReset = false">取消</view>
        <view class="pop-button danger-button" hover-class="tap-press" @click="resetDemoData">重置</view>
      </view>
    </view>
  </view>

  <view v-if="active === 'system'" class="console-pop">
    <view class="pop-head">
      <text class="pop-title">系统运行状态</text>
      <view class="pop-head-side">
        <text class="pop-count">实时概览</text>
      </view>
    </view>
    <view class="pop-section">
      <view v-for="row in healthRows" :key="row.label" class="env-row">
        <text class="env-label">{{ row.label }}</text>
        <text class="env-value">{{ row.value }}</text>
      </view>
    </view>
    <view class="pop-section">
      <text class="section-caption">运营提示</text>
      <view class="op-row">
        <text class="op-time">LIVE</text>
        <text class="op-text">{{ systemAdvice }}</text>
      </view>
    </view>
  </view>

  <view v-if="active === 'operator'" class="console-pop">
    <view class="pop-head">
      <text class="pop-title">OP-LEAD-01</text>
      <view class="pop-head-side">
        <text class="pop-count">{{ operatorRoleText }}</text>
      </view>
    </view>
    <view class="pop-section">
      <view v-for="row in operatorRows" :key="row.label" class="env-row">
        <text class="env-label">{{ row.label }}</text>
        <text class="env-value">{{ row.value }}</text>
      </view>
    </view>
    <view class="pop-section">
      <text class="section-caption">最近操作</text>
      <view v-if="!recentOps.length" class="pop-empty compact">
        <text>暂无审计记录</text>
      </view>
      <view v-for="op in recentOps" :key="op.id" class="op-row">
        <text class="op-time">{{ op.time }}</text>
        <text class="op-text">{{ op.actionLabel }} · {{ op.detail }}</text>
      </view>
    </view>
    <view class="pop-section actions">
      <view class="pop-action" hover-class="tap-press" @click="openAuditModule">
        <StitchIcon name="history" size="18px" />
        <view class="pop-action-copy">
          <text class="pop-action-title">查看审计日志</text>
          <text class="pop-action-desc">全部 {{ auditCount }} 条操作记录</text>
        </view>
      </view>
      <view class="pop-action danger" hover-class="tap-press" @click="logout">
        <StitchIcon name="logout" size="18px" />
        <view class="pop-action-copy">
          <text class="pop-action-title">退出登录</text>
          <text class="pop-action-desc">返回身份选择页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { isProductionBackendRequired } from '@/api/backend';
import { CapacityStatus, NotificationType, OrderStatus, Role } from '@/models';
import { adminAuditRows, adminModuleRoute, agoLabel } from '@/services/admin-console';
import { roleLabel } from '@/services/display-labels';
import { useUserStore } from '@/stores/user';
import { resetDB } from '@/utils/db';
import { exportStamp, exportTextFile } from '@/utils/export';
import { db } from '@/utils/db';
import { repo } from '@/utils/repo';

export type ConsolePanelKey = 'notifications' | 'settings' | 'operator' | 'system';

interface NoticeGroup {
  key: string;
  title: string;
  body: string;
  icon: string;
  tone: 'info' | 'success' | 'warning' | 'danger' | 'muted';
  count: number;
  unread: boolean;
  time: string;
  roleText: string;
  ids: string[];
}

const emit = defineEmits<{ (e: 'changed'): void }>();
const userStore = useUserStore();
const productionRuntime = isProductionBackendRequired();
const active = ref<'' | ConsolePanelKey>('');
const confirmingReset = ref(false);

function open(panel: ConsolePanelKey) {
  active.value = active.value === panel ? '' : panel;
}

function close() {
  active.value = '';
  confirmingReset.value = false;
}

defineExpose({ open, close });

const NOTICE_STYLE: Record<NotificationType, { icon: string; tone: NoticeGroup['tone'] }> = {
  [NotificationType.Dispatch]: { icon: 'flight_takeoff', tone: 'info' },
  [NotificationType.Audit]: { icon: 'fact_check', tone: 'warning' },
  [NotificationType.Settlement]: { icon: 'payments', tone: 'success' },
  [NotificationType.Alert]: { icon: 'warning', tone: 'danger' },
  [NotificationType.System]: { icon: 'info', tone: 'muted' },
};

const unreadCount = computed(() => repo.notifications.where((item) => !item.read).length);

// 相同标题+内容的通知合并为一条（避免“新吊运任务 ×N”刷屏），保留全部 id 以便批量已读
const noticeGroups = computed<NoticeGroup[]>(() => {
  const map = new Map<string, NoticeGroup & { latestAt: string; roles: Set<string> }>();
  repo.notifications.all().forEach((item) => {
    const key = `${item.type}|${item.title}|${item.body}`;
    const user = repo.users.find(item.userId);
    const role = user ? roleLabel(user.currentRole) : item.userId;
    const existing = map.get(key);
    if (!existing) {
      const style = NOTICE_STYLE[item.type] ?? NOTICE_STYLE[NotificationType.System];
      map.set(key, {
        key,
        title: item.title,
        body: item.body,
        icon: style.icon,
        tone: style.tone,
        count: 1,
        unread: !item.read,
        latestAt: item.createdAt,
        roles: new Set([role]),
        ids: [item.id],
        time: '',
        roleText: '',
      });
      return;
    }
    existing.count += 1;
    existing.unread = existing.unread || !item.read;
    if (item.createdAt > existing.latestAt) existing.latestAt = item.createdAt;
    existing.roles.add(role);
    existing.ids.push(item.id);
  });
  return Array.from(map.values())
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt))
    .slice(0, 30)
    .map((group) => ({ ...group, time: agoLabel(group.latestAt), roleText: Array.from(group.roles).join(' / ') }));
});

function markGroupRead(group: NoticeGroup) {
  if (productionRuntime) {
    uni.showToast({ title: '暂时无法更新通知状态，请稍后重试', icon: 'none' });
    return;
  }
  group.ids.forEach((id) => repo.notifications.update(id, { read: true }));
  emit('changed');
}

function markAllRead() {
  if (productionRuntime) {
    uni.showToast({ title: '暂时无法更新通知状态，请稍后重试', icon: 'none' });
    return;
  }
  repo.notifications.where((item) => !item.read).forEach((item) => repo.notifications.update(item.id, { read: true }));
  uni.showToast({ title: '通知已全部标记已读', icon: 'none' });
  emit('changed');
}

const envRows = computed(() => [
  { label: '数据存储', value: productionRuntime ? '云端安全存储' : '设备内演示数据' },
  { label: '订单', value: `${repo.orders.all().length} 单` },
  { label: '在线运力', value: `${repo.capacity.where((c) => c.status === 'online').length} / ${repo.capacity.all().length}` },
  { label: '审计日志', value: `${repo.auditLogs.all().length} 条` },
  { label: '未读通知', value: `${unreadCount.value} 条` },
]);

const activeOrderCount = computed(() => repo.orders.where((order) => order.status !== OrderStatus.Settled && order.status !== OrderStatus.Cancelled && order.status !== OrderStatus.Exception).length);
const capacityCount = computed(() => repo.capacity.all().length);
const offlineCapacityCount = computed(() => repo.capacity.where((item) => item.status !== CapacityStatus.Online).length);
const healthRows = computed(() => [
  { label: '数据状态', value: '已加载授权数据' },
  { label: '订单总量', value: `${repo.orders.all().length} 单` },
  { label: '流转中订单', value: `${activeOrderCount.value} 单` },
  { label: '在线运力', value: `${repo.capacity.where((item) => item.status === CapacityStatus.Online).length} / ${capacityCount.value}` },
  { label: '非在线运力', value: `${offlineCapacityCount.value} 台` },
  { label: '待审认证', value: `${repo.authApplications.where((item) => item.status === 'pending').length} 项` },
]);
const systemAdvice = computed(() => {
  if (activeOrderCount.value > 0) return '有订单仍在流转，建议优先关注订单管理与空域审批状态。';
  if (offlineCapacityCount.value > 0) return '部分运力不在线，可在机主端核查设备状态后重新上线。';
  return '当前无阻塞事项，可继续观察订单与运力趋势。';
});

async function exportSnapshot() {
  const filename = `skylink-db-snapshot-${exportStamp()}.json`;
  const result = await exportTextFile(filename, JSON.stringify(db, null, 2), 'application/json');
  uni.showToast({ title: result === 'downloaded' ? `已下载 ${filename}` : result === 'copied' ? '数据备份已复制到剪贴板' : '导出失败', icon: 'none' });
}

function confirmReset() {
  confirmingReset.value = true;
}

function resetDemoData() {
  if (productionRuntime) {
    uni.showToast({ title: '正式数据不能在此重置', icon: 'none' });
    return;
  }
  resetDB();
  close();
  uni.showToast({ title: '演示数据已重置', icon: 'none' });
  emit('changed');
}

const operatorRoleText = computed(() => roleLabel(Role.Admin));
const operatorRows = computed(() => [
  { label: '账号', value: userStore.user.nickname || userStore.user.id },
  { label: '身份', value: roleLabel(userStore.user.currentRole) },
  { label: '实名状态', value: userStore.user.realNameVerified ? '已认证' : '未认证' },
]);
const auditCount = computed(() => repo.auditLogs.all().length);
const recentOps = computed(() => adminAuditRows().slice(0, 3));

function openAuditModule() {
  close();
  uni.redirectTo({ url: adminModuleRoute('audit') });
}

function logout() {
  userStore.logout();
  uni.reLaunch({ url: '/pages/login/index' });
}
</script>

<style lang="scss" scoped>
.panel-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(6, 9, 14, .35);
}

.console-pop {
  position: fixed;
  top: 78px;
  right: 24px;
  z-index: 1210;
  width: 396px;
  max-width: calc(100vw - 48px);
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  background: $bg-card;
  box-shadow: 0 18px 48px rgba(0, 0, 0, .45);
  overflow: hidden;
}

.pop-head {
  min-height: 52px;
  padding: 0 16px;
  border-bottom: 2rpx solid $line-strong;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pop-title {
  color: $blue-50;
  font-size: var(--admin-fs-body);
  font-weight: $fw-bold;
}

.pop-head-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pop-count {
  color: $ink-500;
  font-family: "JetBrains Mono", monospace;
  font-size: var(--admin-fs-cap);
}

.pop-button {
  height: 30px;
  padding: 0 12px;
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  color: $ink-700;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--admin-fs-cap);
  font-weight: $fw-bold;
}

.pop-body {
  max-height: 56vh;
}

.pop-empty {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: $ink-500;
  font-size: var(--admin-fs-small);
}

.pop-empty.compact {
  min-height: 56px;
}

.notice-row {
  position: relative;
  padding: 14px 16px;
  border-bottom: 2rpx solid $line;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.notice-row:last-child {
  border-bottom: 0;
}

.notice-row.unread {
  background: $surface-command;
}

.notice-icon {
  width: 34px;
  height: 34px;
  border-radius: $r-sm;
  background: $surface-panel;
  color: $ink-700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
}

.notice-icon.info { color: $info-ink; background: $info-bg; }
.notice-icon.success { color: $success-ink; background: $success-bg; }
.notice-icon.warning { color: $warning-ink; background: $warning-bg; }
.notice-icon.danger { color: $danger-ink; background: $danger-bg; }

.notice-copy {
  min-width: 0;
  flex: 1;
}

.notice-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notice-title {
  color: $ink-900;
  font-size: var(--admin-fs-label);
  font-weight: $fw-semibold;
  @include ellipsis(1);
}

.notice-x {
  flex: 0 0 auto;
  padding: 0 7px;
  border-radius: $r-sm;
  background: $surface-panel;
  color: $ink-700;
  font-family: "JetBrains Mono", monospace;
  font-size: var(--admin-fs-cap);
  line-height: 18px;
  font-weight: $fw-bold;
}

.notice-body {
  display: block;
  margin-top: 4px;
  color: $ink-700;
  font-size: var(--admin-fs-small);
  line-height: 18px;
  @include ellipsis(2);
}

.notice-meta {
  display: block;
  margin-top: 6px;
  color: $ink-500;
  font-family: "JetBrains Mono", monospace;
  font-size: var(--admin-fs-cap);
}

.notice-dot {
  position: absolute;
  top: 18px;
  right: 14px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $danger;
}

.pop-section {
  padding: 12px 16px;
  border-bottom: 2rpx solid $line;
}

.pop-section:last-child {
  border-bottom: 0;
}

.section-caption {
  display: block;
  margin-bottom: 8px;
  color: $ink-500;
  font-family: "JetBrains Mono", monospace;
  font-size: var(--admin-fs-cap);
  font-weight: $fw-bold;
  letter-spacing: .12em;
}

.env-row {
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.env-label {
  color: $ink-500;
  font-size: var(--admin-fs-small);
}

.env-value {
  color: $ink-900;
  font-family: "JetBrains Mono", monospace;
  font-size: var(--admin-fs-cap);
  text-align: right;
}

.op-row {
  padding: 6px 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.op-time {
  flex: 0 0 auto;
  color: $color-primary;
  font-family: "JetBrains Mono", monospace;
  font-size: var(--admin-fs-cap);
  font-weight: $fw-bold;
}

.op-text {
  min-width: 0;
  color: $ink-700;
  font-size: var(--admin-fs-cap);
  line-height: 17px;
  @include ellipsis(1);
}

.pop-section.actions {
  display: grid;
  gap: 8px;
}

.pop-action {
  padding: 12px 14px;
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  background: $bg-sunken;
  color: $ink-700;
  display: flex;
  align-items: center;
  gap: 12px;
}

.pop-action.danger {
  border-color: $danger-line;
  color: $danger-ink;
}

.reset-confirm {
  background: $danger-bg;
}

.reset-title,
.reset-desc {
  display: block;
}

.reset-title {
  color: $danger-ink;
  font-size: var(--admin-fs-label);
  font-weight: $fw-bold;
}

.reset-desc {
  margin-top: 6px;
  color: $ink-700;
  font-size: var(--admin-fs-small);
  line-height: 18px;
}

.reset-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.danger-button {
  border-color: $danger-line;
  color: $danger-ink;
  background: rgba(239, 68, 68, .12);
}

.pop-action-copy {
  min-width: 0;
}

.pop-action-title {
  display: block;
  color: $ink-900;
  font-size: var(--admin-fs-label);
  font-weight: $fw-semibold;
}

.pop-action.danger .pop-action-title {
  color: $danger-ink;
}

.pop-action-desc {
  display: block;
  margin-top: 3px;
  color: $ink-500;
  font-size: var(--admin-fs-cap);
  line-height: 16px;
}

.tap-press {
  opacity: .85;
}
</style>
