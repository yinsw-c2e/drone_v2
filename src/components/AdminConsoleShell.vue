<template>
  <view class="admin-console-shell">
    <view class="topbar">
      <view class="brand-cluster">
        <StitchIcon class="brand-icon" name="public" size="28px" fill />
        <text class="brand-title">SkyLink Logistics</text>
        <text class="version-chip">OP-CONSOLE / V2.4</text>
      </view>

      <view class="operator-cluster">
        <view class="top-icon" hover-class="tap-press" @click="openPanel('notifications')">
          <StitchIcon name="notifications" size="28px" />
          <view v-if="unreadCount" class="alert-dot" />
        </view>
        <view class="top-icon" hover-class="tap-press" @click="openPanel('settings')">
          <StitchIcon name="settings" size="28px" />
        </view>
        <view class="role-switch" hover-class="tap-press" @click="switchIdentity">
          <StitchIcon name="switch_account" size="23px" />
          <text>切换身份</text>
        </view>
        <view class="operator-divider" />
        <view class="operator-card" hover-class="tap-press" @click="openPanel('operator')">
          <image class="operator-avatar" src="/static/stitch/op-console-avatar.png" mode="aspectFill" />
          <view class="operator-copy">
            <text class="operator-id">OP-LEAD-01</text>
            <text class="operator-state">Active</text>
          </view>
        </view>
      </view>
    </view>

    <AdminConsolePanels ref="panels" />


    <view class="side-rail">
      <text class="rail-label">MODULES</text>
      <view
        v-for="item in navModules"
        :key="item.key"
        :class="['rail-item', item.active ? 'active' : '']"
        hover-class="tap-press"
        @click="openModule(item)"
      >
        <StitchIcon :name="item.icon" size="29px" :fill="item.active" />
        <text>{{ item.label }}</text>
        <text v-if="item.badge" class="rail-badge">{{ item.badge }}</text>
      </view>

      <view class="system-card" hover-class="tap-press" @click="showSystemHealth">
        <view class="system-head">
          <StitchIcon name="wifi" size="18px" />
          <text>SYSTEM ONLINE</text>
        </view>
        <text class="system-line">ORDERS: {{ metrics.orderCount }}</text>
        <text class="system-line">CAPACITY: {{ metrics.onlineCapacity }}</text>
      </view>
    </view>

    <view class="main-scroll">
      <view class="grid-layer" />
      <view class="main-content">
        <slot />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AdminConsolePanels from '@/components/AdminConsolePanels.vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { Role } from '@/models';
import type { AdminModuleKey, AdminNavItem } from '@/services/admin-console';
import { adminMetrics, adminNavItems } from '@/services/admin-console';
import { useUserStore } from '@/stores/user';
import { repo } from '@/utils/repo';

type ConsolePanelKey = 'notifications' | 'settings' | 'operator' | 'system';

const props = defineProps<{
  active: AdminModuleKey;
}>();

const userStore = useUserStore();
userStore.loginAs(Role.Admin);

const metrics = computed(() => adminMetrics());
const navModules = computed(() => adminNavItems(props.active));
const unreadCount = computed(() => repo.notifications.where((item) => !item.read).length);
const panels = ref<{ open: (panel: ConsolePanelKey) => void } | null>(null);

function openPanel(panel: ConsolePanelKey) {
  panels.value?.open(panel);
}

function openModule(item: AdminNavItem) {
  if (item.active) {
    uni.showToast({ title: `当前：${item.label}`, icon: 'none' });
    return;
  }
  uni.redirectTo({ url: item.route });
}

function switchIdentity() {
  uni.reLaunch({ url: '/pages/login/index' });
}

function showSystemHealth() {
  openPanel('system');
}
</script>

<style lang="scss" scoped>
.admin-console-shell {
  --admin-fs-brand: 30px;
  --admin-fs-title: 40px;
  --admin-fs-metric: 36px;
  --admin-fs-panel-title: 20px;
  --admin-fs-body: 16px;
  --admin-fs-record: 15px;
  --admin-fs-label: 14px;
  --admin-fs-small: 13px;
  --admin-fs-cap: 12px;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: $ink-900;
  background: $bg-page;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar,
.brand-cluster,
.operator-cluster,
.operator-card,
.rail-item,
.system-head {
  display: flex;
  align-items: center;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: $z-sticky;
  height: 72px;
  padding: 0 32px;
  border-bottom: 2rpx solid $line-strong;
  background: $bg-page;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-cluster {
  gap: 20px;
}

.brand-icon,
.brand-title,
.rail-item.active {
  color: $color-primary;
}

.brand-title {
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: var(--admin-fs-brand);
  line-height: 36px;
  font-weight: $fw-bold;
  letter-spacing: 0;
}

.version-chip,
.rail-label,
.rail-item,
.system-head,
.system-line,
.operator-id,
.operator-state,
.rail-badge {
  font-family: "JetBrains Mono", monospace;
}

.version-chip {
  height: 28px;
  padding: 0 11px;
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  background: $bg-card;
  color: $ink-700;
  font-size: var(--admin-fs-label);
  line-height: 28px;
  font-weight: $fw-bold;
  letter-spacing: .16em;
}

.operator-cluster {
  gap: 24px;
}

.role-switch {
  height: 40px;
  padding: 0 12px;
  border: 1px solid $line-strong;
  border-radius: $r-sm;
  color: $ink-700;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--admin-fs-small);
  line-height: 1;
  white-space: nowrap;
}

.role-switch :deep(.stitch-icon) {
  color: $color-primary;
}

.top-icon {
  position: relative;
  width: 40px;
  height: 40px;
  color: $ink-900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-dot {
  position: absolute;
  top: 8px;
  right: 7px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: $danger;
}

.operator-divider {
  width: 2rpx;
  height: 44px;
  background: $line-strong;
}

.operator-card {
  gap: 14px;
}

.operator-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  border: 2rpx solid $color-primary;
  overflow: hidden;
}

.operator-copy text {
  display: block;
}

.operator-id {
  color: $blue-50;
  font-size: var(--admin-fs-body);
  line-height: 22px;
  font-weight: $fw-bold;
  letter-spacing: .08em;
}

.operator-state {
  margin-top: 1px;
  color: $ink-900;
  font-size: var(--admin-fs-label);
  line-height: 18px;
  letter-spacing: .08em;
}

.side-rail {
  position: fixed;
  left: 0;
  top: 72px;
  bottom: 0;
  z-index: $z-sticky;
  width: 296px;
  padding: 28px 20px 20px;
  border-right: 2rpx solid $line-strong;
  background: $bg-card;
  box-sizing: border-box;
}

.rail-label {
  display: block;
  margin: 0 0 18px 10px;
  color: $ink-700;
  font-size: var(--admin-fs-label);
  line-height: 18px;
  font-weight: $fw-bold;
  letter-spacing: .16em;
}

.rail-item {
  position: relative;
  height: 56px;
  padding: 0 20px;
  border-radius: $r-sm;
  color: $ink-700;
  gap: 14px;
  box-sizing: border-box;
}

.rail-item + .rail-item {
  margin-top: 2px;
}

.rail-item text:nth-child(2) {
  font-size: var(--admin-fs-body);
  line-height: 22px;
  font-weight: $fw-bold;
  letter-spacing: .08em;
}

.rail-item.active {
  border: 2rpx solid $glass-line;
  background: $surface-command;
}

.rail-badge {
  position: absolute;
  right: 18px;
  height: 28px;
  min-width: 28px;
  padding: 0 7px;
  border-radius: $r-sm;
  background: $info;
  color: $on-primary;
  font-size: var(--admin-fs-cap);
  line-height: 28px;
  font-weight: $fw-bold;
  text-align: center;
}

.system-card {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 20px;
  height: 124px;
  padding: 20px;
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  background: $surface-panel;
  box-sizing: border-box;
}

.system-head {
  gap: 9px;
  color: $success;
}

.system-head text {
  font-size: var(--admin-fs-small);
  line-height: 16px;
  font-weight: $fw-bold;
  letter-spacing: .18em;
}

.system-line {
  display: block;
  margin-top: 15px;
  color: $ink-900;
  font-size: var(--admin-fs-cap);
  line-height: 12px;
}

.system-line + .system-line {
  margin-top: 12px;
}

.main-scroll {
  position: fixed;
  left: 296px;
  right: 0;
  top: 72px;
  bottom: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: $bg-page;
  -webkit-overflow-scrolling: touch;
}

.grid-layer {
  position: fixed;
  left: 296px;
  right: 0;
  top: 72px;
  bottom: 0;
  pointer-events: none;
  opacity: .18;
  background-image:
    linear-gradient(rgba(58, 73, 75, .25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(58, 73, 75, .25) 1px, transparent 1px);
  background-size: 32px 32px;
}

.main-content {
  position: relative;
  z-index: 1;
  width: calc(100vw - 360px);
  max-width: 1640px;
  min-width: 0;
  margin: 0 32px;
  padding: 32px 0 64px;
  box-sizing: border-box;
}

:deep(.module-head) {
  min-height: 96px;
  border-bottom: 2rpx solid $line-strong;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $sp-4;
}

:deep(.module-kicker),
:deep(.record-meta),
:deep(.field-label),
:deep(.status-pill),
:deep(.action-button),
:deep(.outline-button),
:deep(.danger-button),
:deep(.ghost-button),
:deep(.metric-label),
:deep(.table-head),
:deep(.timeline-time) {
  font-family: "JetBrains Mono", monospace;
}

:deep(.module-kicker) {
  display: block;
  margin-bottom: 6px;
  color: $color-primary;
  font-size: var(--admin-fs-small);
  line-height: 16px;
  font-weight: $fw-bold;
  letter-spacing: .16em;
}

:deep(.module-title) {
  display: block;
  color: $blue-50;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: var(--admin-fs-title);
  line-height: 46px;
  font-weight: $fw-bold;
  letter-spacing: 0;
}

:deep(.module-subtitle) {
  display: block;
  margin-top: 8px;
  color: $ink-700;
  font-size: var(--admin-fs-body);
  line-height: 22px;
}

:deep(.module-actions) {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.summary-grid) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-top: 24px;
}

:deep(.metric-tile),
:deep(.panel) {
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  background: $bg-card;
  box-sizing: border-box;
}

:deep(.metric-tile) {
  min-height: 132px;
  padding: 20px;
}

:deep(.metric-label) {
  display: block;
  color: $ink-700;
  font-size: var(--admin-fs-cap);
  line-height: 16px;
  font-weight: $fw-bold;
  letter-spacing: .12em;
}

:deep(.metric-value) {
  display: block;
  margin-top: 14px;
  color: $blue-50;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: var(--admin-fs-metric);
  line-height: 40px;
  font-weight: $fw-bold;
}

:deep(.metric-note) {
  display: block;
  margin-top: 8px;
  color: $ink-500;
  font-size: var(--admin-fs-small);
  line-height: 18px;
}

:deep(.content-grid) {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr);
  gap: 24px;
  margin-top: 24px;
  align-items: start;
}

:deep(.content-grid.wide) {
  grid-template-columns: 1fr;
}

:deep(.panel) {
  overflow: hidden;
}

:deep(.panel-head) {
  min-height: 56px;
  padding: 0 20px;
  border-bottom: 2rpx solid $line-strong;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

:deep(.panel-title) {
  color: $blue-50;
  font-size: var(--admin-fs-panel-title);
  line-height: 26px;
  font-weight: $fw-bold;
}

:deep(.panel-subtitle) {
  color: $ink-500;
  font-size: var(--admin-fs-small);
  line-height: 18px;
}

:deep(.record-list) {
  display: grid;
}

:deep(.record-row) {
  min-height: 88px;
  padding: 18px;
  border-bottom: 2rpx solid $line;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  box-sizing: border-box;
}

:deep(.record-row:last-child) {
  border-bottom: 0;
}

:deep(.record-row.selected) {
  background: $surface-command;
}

:deep(.record-id) {
  display: block;
  color: $blue-50;
  font-family: "JetBrains Mono", monospace;
  font-size: var(--admin-fs-record);
  line-height: 20px;
  font-weight: $fw-bold;
  letter-spacing: .08em;
}

:deep(.record-title) {
  display: block;
  margin-top: 6px;
  color: $ink-900;
  font-size: var(--admin-fs-record);
  line-height: 21px;
  font-weight: $fw-semibold;
}

:deep(.record-desc),
:deep(.record-meta) {
  display: block;
  margin-top: 6px;
  color: $ink-500;
  font-size: var(--admin-fs-small);
  line-height: 18px;
}

:deep(.record-side) {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

:deep(.status-pill) {
  min-width: 74px;
  height: 28px;
  padding: 0 12px;
  border-radius: $r-sm;
  background: $surface-panel;
  color: $ink-700;
  font-size: var(--admin-fs-cap);
  line-height: 28px;
  font-weight: $fw-bold;
  text-align: center;
  box-sizing: border-box;
}

:deep(.status-pill.success) {
  background: $success-bg;
  color: $success-ink;
}

:deep(.status-pill.warning) {
  background: $warning-bg;
  color: $warning-ink;
}

:deep(.status-pill.danger) {
  background: $danger-bg;
  color: $danger-ink;
}

:deep(.status-pill.normal) {
  background: $info-bg;
  color: $info-ink;
}

:deep(.field-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 18px;
}

:deep(.field-item) {
  min-height: 72px;
  padding: 12px;
  border: 2rpx solid $line;
  border-radius: $r-sm;
  background: $bg-sunken;
  box-sizing: border-box;
}

:deep(.field-item.selected) {
  border-color: $glass-line;
  background: $surface-command;
}

:deep(.field-label) {
  display: block;
  color: $ink-500;
  font-size: var(--admin-fs-cap);
  line-height: 16px;
}

:deep(.field-value) {
  display: block;
  margin-top: 6px;
  color: $ink-900;
  font-size: var(--admin-fs-small);
  line-height: 18px;
  word-break: break-word;
}

:deep(.action-button),
:deep(.outline-button),
:deep(.danger-button),
:deep(.ghost-button) {
  min-height: 38px;
  padding: 0 18px;
  border-radius: $r-sm;
  font-size: var(--admin-fs-small);
  line-height: 38px;
  font-weight: $fw-bold;
  letter-spacing: .06em;
  text-align: center;
  box-sizing: border-box;
}

:deep(.action-button) {
  background: $color-primary;
  color: $on-primary;
}

:deep(.outline-button) {
  border: 2rpx solid $info;
  color: $info-ink;
}

:deep(.danger-button) {
  background: $danger-bg;
  color: $danger-ink;
  border: 2rpx solid $danger-line;
}

:deep(.ghost-button) {
  border: 2rpx solid $line-strong;
  color: $ink-700;
}

:deep(.empty-state) {
  min-height: 180px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: $ink-500;
  text-align: center;
}

:deep(.empty-state text:first-child) {
  color: $blue-50;
  font-size: var(--admin-fs-panel-title);
  line-height: 26px;
  font-weight: $fw-bold;
}

:deep(.empty-state text:last-child) {
  font-size: var(--admin-fs-small);
  line-height: 19px;
}

:deep(.timeline-list) {
  padding: $sp-3;
  display: grid;
  gap: $sp-2;
}

:deep(.timeline-item) {
  padding-left: $sp-3;
  border-left: 2rpx solid $line-strong;
}

:deep(.timeline-time) {
  display: block;
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.2;
  font-weight: $fw-bold;
}

:deep(.timeline-text) {
  display: block;
  margin-top: $sp-1;
  color: $ink-900;
  font-size: $fs-sm;
  line-height: 1.45;
}

:deep(.table-list) {
  display: grid;
}

:deep(.table-row),
:deep(.table-head) {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr 1fr;
  gap: $sp-2;
  align-items: center;
  padding: $sp-3;
  border-bottom: 2rpx solid $line;
}

@media screen and (max-width: 1100px) {
  :deep(.summary-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  :deep(.content-grid) {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 900px) {
  .side-rail {
    width: 220px;
  }

  .main-scroll,
  .grid-layer {
    left: 220px;
  }

  .main-content {
    width: calc(100vw - 252px);
    margin: 0 16px;
  }

  .rail-item {
    padding: 0 $sp-2;
    gap: $sp-1;
  }
}

@media screen and (max-width: 760px) {
  .admin-console-shell {
    --admin-fs-brand: 20px;
    --admin-fs-title: 30px;
    --admin-fs-metric: 30px;
    --admin-fs-panel-title: 18px;
    --admin-fs-body: 15px;
    --admin-fs-record: 14px;
    --admin-fs-label: 13px;
    --admin-fs-small: 12px;
    height: 100dvh;
    overflow: hidden;
  }

  .topbar {
    height: 64px;
    padding: 0 14px;
    gap: 10px;
  }

  .brand-cluster {
    min-width: 0;
    gap: 10px;
  }

  .brand-icon {
    flex: 0 0 auto;
  }

  .brand-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 26px;
  }

  .version-chip,
  .operator-divider,
  .operator-copy {
    display: none;
  }

  .operator-cluster {
    flex: 0 0 auto;
    gap: 6px;
  }

  .top-icon,
  .role-switch,
  .operator-card {
    min-width: 44px;
    height: 44px;
    justify-content: center;
  }

  .top-icon {
    width: 44px;
  }

  .role-switch {
    display: none;
  }

  .operator-card {
    width: 44px;
    gap: 0;
  }

  .operator-avatar {
    width: 34px;
    height: 34px;
    border-radius: 12px;
  }

  .side-rail {
    left: 0;
    right: 0;
    top: 64px;
    bottom: auto;
    width: auto;
    height: 68px;
    padding: 8px 12px;
    border-right: 0;
    border-bottom: 2rpx solid $line-strong;
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .side-rail::-webkit-scrollbar {
    display: none;
  }

  .rail-label,
  .system-card {
    display: none;
  }

  .rail-item {
    flex: 0 0 auto;
    min-width: 104px;
    height: 48px;
    padding: 0 12px;
    gap: 8px;
  }

  .rail-item + .rail-item {
    margin-top: 0;
  }

  .rail-item text:nth-child(2) {
    font-size: var(--admin-fs-small);
    line-height: 16px;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .rail-badge {
    top: 3px;
    right: 5px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    font-size: 10px;
    line-height: 18px;
  }

  .main-scroll {
    left: 0;
    top: 132px;
    bottom: 0;
    overflow-x: hidden;
  }

  .grid-layer {
    left: 0;
    top: 132px;
    background-size: 24px 24px;
  }

  .main-content {
    width: 100%;
    max-width: none;
    margin: 0;
    padding: 14px 14px calc(30px + env(safe-area-inset-bottom));
  }

  :deep(.module-head) {
    min-height: 0;
    padding: 0 0 14px;
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  :deep(.module-kicker) {
    margin-bottom: 4px;
    letter-spacing: .08em;
  }

  :deep(.module-title) {
    font-size: var(--admin-fs-title);
    line-height: 36px;
  }

  :deep(.module-subtitle) {
    margin-top: 5px;
    font-size: var(--admin-fs-label);
    line-height: 20px;
  }

  :deep(.module-actions) {
    width: 100%;
    gap: 8px;
    flex-wrap: wrap;
  }

  :deep(.module-actions > view) {
    min-height: 44px;
    flex: 1 1 136px;
    line-height: 44px;
  }

  :deep(.summary-grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  :deep(.metric-tile) {
    min-height: 112px;
    padding: 14px;
  }

  :deep(.metric-label),
  :deep(.metric-note) {
    letter-spacing: .05em;
  }

  :deep(.metric-value) {
    margin-top: 10px;
    font-size: var(--admin-fs-metric);
    line-height: 34px;
    word-break: break-word;
  }

  :deep(.content-grid) {
    grid-template-columns: 1fr;
    gap: 14px;
    margin-top: 16px;
  }

  :deep(.panel-head) {
    min-height: 52px;
    padding: 0 14px;
    gap: 10px;
  }

  :deep(.record-row) {
    min-height: 0;
    padding: 14px;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  :deep(.record-side) {
    align-items: stretch;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  :deep(.status-pill) {
    min-height: 32px;
    line-height: 32px;
  }

  :deep(.record-side .outline-button),
  :deep(.record-side .danger-button),
  :deep(.record-side .ghost-button),
  :deep(.record-side .action-button) {
    min-height: 40px;
    flex: 1 1 112px;
    line-height: 40px;
  }

  :deep(.field-grid) {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 14px;
  }

  :deep(.field-item) {
    min-height: 64px;
  }

  :deep(.table-list) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  :deep(.table-row),
  :deep(.table-head) {
    min-width: 620px;
  }
}

@media screen and (max-width: 420px) {
  :deep(.summary-grid) {
    grid-template-columns: 1fr;
  }
}

:deep(.table-head) {
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.2;
  font-weight: $fw-bold;
}

:deep(.table-row text) {
  color: $ink-900;
  font-size: $fs-sm;
  line-height: 1.35;
}
</style>
