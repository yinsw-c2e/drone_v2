<template>
  <view class="profile-page">
    <view class="topbar">
      <view class="icon-btn" hover-class="tap-press" @click="back">
        <StitchIcon name="arrow_back" size="24px" />
      </view>
      <text class="page-title">个人中心</text>
      <view class="icon-btn" hover-class="tap-press" @click="refreshMe">
        <StitchIcon name="refresh" size="23px" />
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view class="account-panel">
        <view class="avatar">
          <text>{{ avatarText }}</text>
        </view>
        <view class="account-copy">
          <text class="nickname">{{ user.nickname }}</text>
          <text class="phone">{{ maskedPhone }}</text>
          <view class="role-line">
            <RoleBadge :role="user.currentRole" />
            <text :class="['auth-chip', authTone]">{{ authStatusText }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text>身份管理</text>
          <text>{{ activeRoles.length > 1 ? '可切换' : '单身份' }}</text>
        </view>
        <view class="identity-list">
          <view v-for="item in identityRows" :key="item.role" class="identity-row">
            <view class="identity-main">
              <StitchIcon :name="item.icon" size="24px" />
              <view>
                <text class="identity-title">{{ item.title }}</text>
                <text :class="['identity-status', item.status]">{{ item.statusText }}</text>
              </view>
            </view>
            <view
              v-if="item.action"
              :class="['small-btn', item.actionTone]"
              hover-class="tap-press"
              @click="handleIdentityAction(item)"
            >
              <text>{{ item.action }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text>{{ roleTitle }}功能</text>
          <text>{{ roleSubtitle }}</text>
        </view>
        <view class="entry-grid">
          <view v-for="entry in roleEntries" :key="entry.label" class="entry-card" hover-class="tap-press" @click="openEntry(entry.url)">
            <StitchIcon :name="entry.icon" size="26px" />
            <text>{{ entry.label }}</text>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-head">
          <text>账号与安全</text>
          <text>Account</text>
        </view>
        <view class="setting-list">
          <view class="setting-row" hover-class="tap-press" @click="openAuth">
            <text>实名认证</text>
            <text>{{ authStatusText }}</text>
          </view>
          <view class="setting-row">
            <text>消息通知</text>
            <text>已开启</text>
          </view>
          <view class="setting-row">
            <text>帮助与客服</text>
            <text>工作台在线</text>
          </view>
        </view>
      </view>

      <view class="logout-btn" hover-class="tap-press" @click="logout">
        <StitchIcon name="logout" size="24px" />
        <text>退出登录</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import StitchIcon from '@/components/StitchIcon.vue';
import RoleBadge from '@/components/RoleBadge.vue';
import { AuditStatus, Role, RoleProfileStatus } from '@/models';
import type { UserRoleProfile } from '@/models';
import { ensureAuthenticated } from '@/services/auth-guard';
import { latestCertification, roleHome } from '@/services/app-flow';
import { roleLabel } from '@/services/display-labels';
import { useUserStore } from '@/stores/user';

interface IdentityRow {
  role: Role;
  icon: string;
  title: string;
  status: RoleProfileStatus | 'none';
  statusText: string;
  action: string;
  actionTone: 'primary' | 'muted';
}

const userStore = useUserStore();
const refreshTick = ref(0);

onShow(() => {
  ensureAuthenticated();
  refreshTick.value += 1;
});

const user = computed(() => {
  void refreshTick.value;
  return userStore.user;
});
const profiles = computed(() => {
  void refreshTick.value;
  return userStore.roleProfiles;
});
const activeRoles = computed(() => profiles.value.filter((item) => item.status === RoleProfileStatus.Active));
const avatarText = computed(() => user.value.nickname.slice(0, 1) || '低');
const maskedPhone = computed(() => user.value.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2'));
const latest = computed(() => latestCertification(user.value.currentRole === Role.Admin ? Role.Client : user.value.currentRole, user.value.id));
const authStatusText = computed(() => {
  if (user.value.currentRole === Role.Admin) return '运营账号';
  if (latest.value?.status === AuditStatus.Pending) return '审核中';
  if (latest.value?.status === AuditStatus.Rejected) return '已驳回';
  if (user.value.realNameVerified || latest.value?.status === AuditStatus.Approved) return '已实名';
  return '未实名';
});
const authTone = computed(() => authStatusText.value === '已实名' || authStatusText.value === '运营账号' ? 'success' : authStatusText.value === '已驳回' ? 'danger' : 'warning');
const roleTitle = computed(() => roleLabel(user.value.currentRole));
const roleSubtitle = computed(() => user.value.currentRole === Role.Admin ? '运营权限' : '个人工作台');
const identityRows = computed<IdentityRow[]>(() => [Role.Client, Role.Pilot, Role.Owner].map((role) => buildIdentityRow(role)));
const roleEntries = computed(() => {
  if (user.value.currentRole === Role.Pilot) return [
    { label: '飞手认证', icon: 'verified', url: '/pages/auth/index' },
    { label: '能力与证照', icon: 'badge', url: '/pages/auth/index' },
    { label: '任务偏好', icon: 'tune', url: '/pages-pilot/hall/index' },
    { label: '钱包与结算', icon: 'account_balance_wallet', url: '/pages-pilot/wallet/index' },
    { label: '起飞执行设置', icon: 'flight_takeoff', url: '/pages-pilot/task/index' },
    { label: '紧急联系人', icon: 'contact_phone', url: '/pages/auth/index' },
  ];
  if (user.value.currentRole === Role.Owner) return [
    { label: '机主认证', icon: 'verified_user', url: '/pages/auth/index' },
    { label: '设备与运力', icon: 'precision_manufacturing', url: '/pages-owner/devices/index' },
    { label: '设备保险', icon: 'health_and_safety', url: '/pages/auth/index' },
    { label: '调度设置', icon: 'hub', url: '/pages-owner/dispatch/index' },
    { label: '团队飞手', icon: 'groups', url: '/pages-owner/mission/index' },
    { label: '钱包与收益', icon: 'account_balance_wallet', url: '/pages-owner/wallet/index' },
  ];
  if (user.value.currentRole === Role.Admin) return [
    { label: '运营账号信息', icon: 'admin_panel_settings', url: '/pages-profile/index' },
    { label: '权限范围', icon: 'rule', url: '/pages-admin/audit/index' },
    { label: '审核工作台', icon: 'fact_check', url: '/pages-admin/certifications/index' },
    { label: '系统通知', icon: 'notifications', url: '/pages-admin/dashboard/index' },
  ];
  return [
    { label: '我的订单', icon: 'assignment', url: '/pages-client/home/index' },
    { label: '常用航线', icon: 'route', url: '/pages-client/order/index' },
    { label: '发票与支付', icon: 'receipt_long', url: '/pages-client/order/index' },
    { label: '保险与理赔', icon: 'health_and_safety', url: '/pages-client/insurance/index' },
    { label: '评价记录', icon: 'reviews', url: '/pages-client/review/index' },
    { label: '实名认证', icon: 'verified', url: '/pages/auth/index' },
  ];
});

function buildIdentityRow(role: Role): IdentityRow {
  const profile = profiles.value.find((item) => item.role === role);
  const status = profile?.status ?? 'none';
  const activeCount = activeRoles.value.length;
  const isCurrent = user.value.currentRole === role;
  const action = status === RoleProfileStatus.Active
    ? (!isCurrent && activeCount > 1 ? '切换' : '')
    : status === RoleProfileStatus.Pending
      ? '去认证'
      : status === RoleProfileStatus.Rejected
        ? '重新提交'
        : '申请';
  return {
    role,
    icon: role === Role.Client ? 'home' : role === Role.Pilot ? 'person' : 'hexagon',
    title: roleLabel(role),
    status,
    statusText: statusText(profile),
    action,
    actionTone: status === RoleProfileStatus.Active ? 'primary' : 'muted',
  };
}

function statusText(profile: UserRoleProfile | undefined) {
  if (!profile) return '未开通';
  if (profile.status === RoleProfileStatus.Active) return '已激活';
  if (profile.status === RoleProfileStatus.Pending) return '审核中';
  return '已驳回';
}

async function handleIdentityAction(item: IdentityRow) {
  try {
    if (item.status === RoleProfileStatus.Active) {
      await userStore.switchRole(item.role);
      uni.reLaunch({ url: roleHome(item.role) });
      return;
    }
    if (item.status === 'none') {
      await userStore.requestRole(item.role);
      refreshTick.value += 1;
      if (item.role === Role.Client) {
        uni.showToast({ title: '业主身份已开通，可在个人中心切换', icon: 'none' });
        return;
      }
    }
    refreshTick.value += 1;
    uni.navigateTo({ url: `/pages/auth/index?role=${item.role}` });
  } catch (e) {
    uni.showToast({ title: e instanceof Error ? e.message : '操作失败', icon: 'none' });
  }
}

function openEntry(url: string) {
  if (url === '/pages-profile/index') return;
  uni.navigateTo({ url });
}

function openAuth() {
  if (user.value.currentRole === Role.Admin) return;
  uni.navigateTo({ url: '/pages/auth/index' });
}

function back() {
  uni.navigateBack();
}

function refreshMe() {
  void userStore.loadMe().finally(() => {
    refreshTick.value += 1;
  });
}

async function logout() {
  await userStore.logout();
  uni.reLaunch({ url: '/pages/login/index' });
}
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: $bg-page;
  color: $ink-900;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 50;
  height: 66px;
  padding: 0 18px;
  border-bottom: 2px solid $line-strong;
  background: rgba(11, 14, 20, .96);
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
}

.icon-btn {
  width: 44px;
  height: 44px;
  color: $blue-50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-title {
  text-align: center;
  font-size: $fs-h2;
  font-weight: 800;
}

.content {
  height: 100vh;
  padding: 88px 18px 34px;
  box-sizing: border-box;
}

.account-panel,
.section {
  border: 2px solid rgba(58, 73, 75, .72);
  border-radius: 8px;
  background: rgba(30, 36, 51, .82);
}

.account-panel {
  padding: 20px;
  display: flex;
  gap: 16px;
}

.avatar {
  width: 58px;
  height: 58px;
  border-radius: 12px;
  background: $grad-brand;
  color: $on-primary;
  font-size: $fs-display;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.account-copy {
  min-width: 0;
  flex: 1;
}

.nickname,
.phone {
  display: block;
}

.nickname {
  color: $blue-50;
  font-size: $fs-metric;
  line-height: 28px;
  font-weight: 800;
}

.phone {
  margin-top: 6px;
  color: $ink-700;
  font-family: "JetBrains Mono", monospace;
  font-size: 26rpx;
}

.role-line {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.auth-chip {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: $fs-sm;
}

.auth-chip.success { color: $success-ink; background: $success-bg; }
.auth-chip.warning { color: $warning-ink; background: $warning-bg; }
.auth-chip.danger { color: $danger-ink; background: $danger-bg; }

.section {
  margin-top: 14px;
  padding: 16px;
}

.section-head,
.identity-row,
.identity-main,
.setting-row,
.logout-btn,
.entry-card,
.small-btn {
  display: flex;
  align-items: center;
}

.section-head {
  justify-content: space-between;
  color: $ink-700;
  font-size: 26rpx;
  line-height: 18px;
  margin-bottom: 12px;
}

.section-head text:first-child {
  color: $blue-50;
  font-size: $fs-h2;
  font-weight: 800;
}

.identity-list,
.setting-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.identity-row,
.setting-row {
  min-height: 58px;
  padding: 12px;
  border: 1px solid rgba(58, 73, 75, .72);
  border-radius: 7px;
  background: rgba(11, 14, 20, .44);
  justify-content: space-between;
  gap: 12px;
}

.identity-main {
  gap: 12px;
  min-width: 0;
}

.identity-title,
.identity-status {
  display: block;
}

.identity-title {
  color: $blue-50;
  font-size: 32rpx;
  font-weight: 700;
}

.identity-status {
  margin-top: 3px;
  color: $ink-700;
  font-size: $fs-sm;
}

.identity-status.pending { color: $warning-ink; }
.identity-status.rejected { color: $danger-ink; }
.identity-status.active { color: $success-ink; }

.small-btn {
  min-width: 58px;
  height: 34px;
  border-radius: 6px;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 700;
}

.small-btn.primary {
  color: $on-primary;
  background: $color-primary;
}

.small-btn.muted {
  color: $color-primary;
  border: 1px solid rgba(0, 242, 255, .38);
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.entry-card {
  min-height: 74px;
  padding: 12px;
  border-radius: 7px;
  background: rgba(11, 14, 20, .44);
  color: $ink-900;
  gap: 10px;
  font-size: $fs-body;
}

.setting-row {
  color: $ink-900;
  font-size: $fs-h3;
}

.setting-row text:last-child {
  color: $ink-700;
  font-size: 26rpx;
}

.logout-btn {
  height: 52px;
  margin: 18px 0 8px;
  border-radius: 8px;
  border: 1px solid $danger-line;
  background: $danger-bg;
  color: $danger-ink;
  justify-content: center;
  gap: 8px;
  font-size: $fs-h3;
  font-weight: 800;
}
</style>
