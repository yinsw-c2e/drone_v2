<template>
  <view class="login-page">
    <view class="tech-grid" />
    <view class="login-main">
      <view class="top-row">
        <view class="brand-wrap">
          <view class="brand-mark">
            <StitchIcon name="flight_takeoff" size="49rpx" fill />
          </view>
          <view class="brand-copy">
            <text class="brand-title">低空指挥中心</text>
            <text class="brand-sub">LOW-ALTITUDE COMMAND CENTER</text>
          </view>
        </view>
        <view :class="['env-pill', demoEnabled ? 'demo' : 'secure']">
          <view class="env-dot" />
          <text>{{ demoEnabled ? '开发演示' : '账号登录' }}</text>
        </view>
      </view>

      <view class="hero-section">
        <text class="hero-title">手机号验证码登录</text>
        <text class="hero-desc">一个账号可管理业主、飞手、机主等多重业务身份；运营账号需后台开通。</text>
      </view>

      <view class="auth-card">
        <view class="mode-row">
          <view :class="['mode-tab', mode === 'login' ? 'active' : '']" @click="mode = 'login'">登录</view>
          <view :class="['mode-tab', mode === 'register' ? 'active' : '']" @click="mode = 'register'">注册补全</view>
        </view>

        <view class="field">
          <text class="field-label">手机号</text>
          <input v-model="phone" class="field-input" type="number" maxlength="11" placeholder="输入 11 位手机号" />
        </view>

        <view class="field code-field">
          <view class="code-input-wrap">
            <text class="field-label">验证码</text>
            <input v-model="code" class="field-input" type="number" maxlength="6" placeholder="6 位验证码" />
          </view>
          <view :class="['send-btn', sending || countdown > 0 ? 'disabled' : '']" hover-class="tap-press" @click="sendCode">
            <text>{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
          </view>
        </view>

        <view v-if="mode === 'register'" class="register-block">
          <view class="field">
            <text class="field-label">昵称</text>
            <input v-model="nickname" class="field-input" placeholder="用于个人中心展示" />
          </view>
          <text class="section-label">初始身份</text>
          <view class="role-grid">
            <view
              v-for="item in registerRoles"
              :key="item.role"
              :class="['role-option', item.key, initialRole === item.role ? 'selected' : '']"
              hover-class="tap-press"
              @click="initialRole = item.role"
            >
              <StitchIcon :name="item.icon" size="31rpx" />
              <view>
                <text class="role-title">{{ item.title }}</text>
                <text class="role-desc">{{ item.desc }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="feedback" :class="['feedback', feedbackTone]">
          <text>{{ feedback }}</text>
        </view>

        <view :class="['primary-btn', submitting ? 'disabled' : '']" hover-class="tap-press" @click="submit">
          <text>{{ mode === 'register' ? '完成注册并进入系统' : '登录' }}</text>
          <StitchIcon name="login" size="31rpx" />
        </view>
      </view>

      <view v-if="demoEnabled" class="demo-block">
        <view class="demo-head">
          <StitchIcon name="developer_mode" size="28rpx" />
          <text>演示直进，仅开发或 VITE_DEMO_LOGIN=1 可见</text>
        </view>
        <view class="demo-grid">
          <view v-for="item in demoRoles" :key="item.role" :class="['demo-card', item.key]" hover-class="tap-press" @click="demoLogin(item.role)">
            <StitchIcon :name="item.icon" size="34rpx" />
            <text>{{ item.title }}</text>
          </view>
        </view>
      </view>

      <view class="login-foot">
        <StitchIcon name="lock" size="26rpx" />
        <text>验证码、token、角色权限与认证审核已接入账号体系</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import StitchIcon from '@/components/StitchIcon.vue';
import { Role } from '@/models';
import { roleHome } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';

type LoginMode = 'login' | 'register';
type Tone = 'success' | 'danger' | 'warning';

interface RoleItem {
  role: Role;
  key: 'client' | 'pilot' | 'owner' | 'admin';
  icon: string;
  title: string;
  desc: string;
}

const userStore = useUserStore();
const mode = ref<LoginMode>('login');
const phone = ref('');
const code = ref('');
const nickname = ref('');
const initialRole = ref<Role>(Role.Client);
const feedback = ref('');
const feedbackTone = ref<Tone>('success');
const sending = ref(false);
const submitting = ref(false);
const countdown = ref(0);
const redirect = ref('');
let timer: ReturnType<typeof setInterval> | undefined;

const demoEnabled = computed(() => {
  const env = ((import.meta as ImportMeta & { env?: Record<string, string | undefined>; DEV?: boolean }).env ?? {});
  return Boolean(env.DEV || env.VITE_DEMO_LOGIN === '1' || env.VITE_DEMO_LOGIN === 'true');
});

const registerRoles: RoleItem[] = [
  { role: Role.Client, key: 'client', icon: 'home', title: '业主', desc: '我要发货、追踪订单、处理理赔评价' },
  { role: Role.Pilot, key: 'pilot', icon: 'person', title: '飞手', desc: '我要接单、执行任务、管理结算' },
  { role: Role.Owner, key: 'owner', icon: 'hexagon', title: '机主', desc: '我要管理设备、运力、调度和收益' },
];

const demoRoles: RoleItem[] = [
  ...registerRoles,
  { role: Role.Admin, key: 'admin', icon: 'speed', title: '后台', desc: '运营审核与风控' },
];

onLoad((query) => {
  redirect.value = typeof query?.redirect === 'string' ? decodeURIComponent(query.redirect) : '';
});

async function sendCode() {
  if (sending.value || countdown.value > 0) return;
  if (!validPhone(phone.value)) {
    showFeedback('请输入有效的 11 位手机号', 'danger');
    return;
  }
  sending.value = true;
  try {
    const result = await userStore.sendCode(phone.value);
    if (result.mockCode) {
      code.value = result.mockCode;
      showFeedback(`Mock 验证码：${result.mockCode}`, 'warning');
    } else {
      showFeedback('验证码已发送', 'success');
    }
    startCountdown();
  } catch (e) {
    showFeedback(e instanceof Error ? e.message : '验证码发送失败', 'danger');
  } finally {
    sending.value = false;
  }
}

async function submit() {
  if (submitting.value) return;
  if (!validPhone(phone.value) || code.value.trim().length !== 6) {
    showFeedback('请填写手机号和 6 位验证码', 'danger');
    return;
  }
  submitting.value = true;
  try {
    if (mode.value === 'register') {
      await userStore.registerWithCode(phone.value, code.value, nickname.value, initialRole.value);
    } else {
      await userStore.loginWithCode(phone.value, code.value);
    }
    enterAfterAuth();
  } catch (e) {
    const message = e instanceof Error ? e.message : '登录失败';
    if (mode.value === 'login' && message.includes('未注册')) {
      mode.value = 'register';
      showFeedback('该手机号未注册，请补充昵称并选择初始身份', 'warning');
    } else {
      showFeedback(message, 'danger');
    }
  } finally {
    submitting.value = false;
  }
}

function demoLogin(role: Role) {
  try {
    userStore.loginAs(role);
    uni.reLaunch({ url: roleHome(role) });
  } catch (e) {
    showFeedback(e instanceof Error ? e.message : '演示入口不可用', 'danger');
  }
}

function enterAfterAuth() {
  const url = redirect.value || roleHome(userStore.user.currentRole);
  uni.reLaunch({ url });
}

function showFeedback(message: string, tone: Tone) {
  feedback.value = message;
  feedbackTone.value = tone;
}

function startCountdown() {
  countdown.value = 60;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  }, 1000);
}

function validPhone(value: string) {
  return /^1\d{10}$/.test(value.replace(/\D/g, ''));
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<style lang="scss" scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: $bg-page;
  color: $ink-900;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.tech-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(72% 36% at 50% -8%, rgba(0, 242, 255, .18), transparent 68%),
    linear-gradient(90deg, rgba(58, 73, 75, .16) 1rpx, transparent 1rpx),
    linear-gradient(0deg, rgba(58, 73, 75, .16) 1rpx, transparent 1rpx),
    $bg-page;
  background-size: auto, 80rpx 80rpx, 80rpx 80rpx, auto;
}

.login-main {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding: 96rpx 31rpx 61rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.top-row,
.brand-wrap,
.env-pill,
.mode-row,
.code-field,
.primary-btn,
.demo-head,
.demo-card,
.login-foot {
  display: flex;
  align-items: center;
}

.top-row {
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 72rpx;
}

.brand-wrap {
  min-width: 0;
  gap: 24rpx;
}

.brand-mark {
  width: 77rpx;
  height: 77rpx;
  border-radius: 16rpx;
  background: $info;
  color: $blue-50;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  box-shadow: 0 0 29rpx rgba(59, 130, 246, .50);
}

.brand-copy {
  min-width: 0;
}

.brand-title,
.brand-sub,
.hero-title,
.hero-desc,
.field-label,
.role-title,
.role-desc {
  display: block;
}

.brand-title {
  color: $blue-50;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 35rpx;
  line-height: 42rpx;
  font-weight: 700;
  white-space: nowrap;
}

.brand-sub {
  margin-top: 8rpx;
  color: $ink-700;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 27rpx;
  letter-spacing: 0;
  white-space: nowrap;
}

.env-pill {
  height: 39rpx;
  padding: 0 23rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(58, 73, 75, .50);
  background: rgba(27, 31, 42, .72);
  color: $ink-900;
  font-size: 23rpx;
  line-height: 39rpx;
  gap: 11rpx;
  flex: 0 0 auto;
}

.env-dot {
  width: 15rpx;
  height: 15rpx;
  border-radius: 999rpx;
  background: $success;
}

.hero-section {
  margin-bottom: 42rpx;
}

.hero-title {
  color: $blue-50;
  font-family: "Hanken Grotesk", Inter, sans-serif;
  font-size: 52rpx;
  line-height: 64rpx;
  font-weight: 800;
  letter-spacing: 0;
}

.hero-desc {
  margin-top: 22rpx;
  color: $ink-700;
  font-size: 27rpx;
  line-height: 40rpx;
}

.auth-card,
.demo-block {
  border: 2rpx solid rgba(58, 73, 75, .72);
  border-radius: 16rpx;
  background: rgba(30, 36, 51, .86);
  box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, .28);
}

.auth-card {
  padding: 28rpx;
}

.mode-row {
  height: 72rpx;
  padding: 6rpx;
  border: 2rpx solid rgba(58, 73, 75, .72);
  border-radius: 10rpx;
  background: rgba(11, 14, 20, .54);
  gap: 6rpx;
}

.mode-tab {
  flex: 1;
  height: 56rpx;
  border-radius: 7rpx;
  color: $ink-700;
  font-size: 25rpx;
  line-height: 56rpx;
  text-align: center;
}

.mode-tab.active {
  background: $color-primary;
  color: $blue-50;
  font-weight: 700;
}

.field {
  margin-top: 26rpx;
}

.field-label,
.section-label {
  color: $ink-700;
  font-size: 23rpx;
  line-height: 31rpx;
  margin-bottom: 12rpx;
}

.field-input {
  width: 100%;
  height: 78rpx;
  padding: 0 22rpx;
  border: 2rpx solid rgba(58, 73, 75, .82);
  border-radius: 8rpx;
  background: rgba(11, 14, 20, .64);
  color: $blue-50;
  font-size: 29rpx;
  box-sizing: border-box;
}

.code-field {
  align-items: flex-end;
  gap: 16rpx;
}

.code-input-wrap {
  flex: 1;
  min-width: 0;
}

.send-btn {
  height: 78rpx;
  min-width: 176rpx;
  padding: 0 20rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(0, 242, 255, .46);
  color: $color-primary;
  font-size: 25rpx;
  line-height: 74rpx;
  text-align: center;
  justify-content: center;
}

.send-btn.disabled,
.primary-btn.disabled {
  opacity: .55;
}

.register-block {
  margin-top: 8rpx;
}

.role-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16rpx;
}

.role-option {
  min-height: 94rpx;
  padding: 18rpx;
  border: 2rpx solid rgba(58, 73, 75, .72);
  border-radius: 10rpx;
  background: rgba(11, 14, 20, .46);
  color: $ink-900;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.role-option.selected {
  border-color: rgba(0, 242, 255, .82);
  background: rgba(0, 242, 255, .11);
}

.role-title {
  color: $blue-50;
  font-size: 28rpx;
  line-height: 34rpx;
  font-weight: 700;
}

.role-desc {
  margin-top: 6rpx;
  color: $ink-700;
  font-size: 22rpx;
  line-height: 31rpx;
}

.feedback {
  margin-top: 22rpx;
  padding: 16rpx 18rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
}

.feedback.success {
  color: $success;
  background: rgba(16, 185, 129, .12);
}

.feedback.warning {
  color: $warning;
  background: rgba(245, 158, 11, .12);
}

.feedback.danger {
  color: $danger;
  background: rgba(239, 68, 68, .12);
}

.primary-btn {
  height: 88rpx;
  margin-top: 28rpx;
  border-radius: 8rpx;
  background: $color-primary;
  color: $blue-50;
  font-size: 29rpx;
  line-height: 88rpx;
  font-weight: 800;
  justify-content: center;
  gap: 12rpx;
}

.demo-block {
  margin-top: 28rpx;
  padding: 22rpx;
}

.demo-head {
  gap: 10rpx;
  color: $ink-700;
  font-size: 22rpx;
  line-height: 31rpx;
}

.demo-grid {
  margin-top: 18rpx;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
}

.demo-card {
  min-height: 94rpx;
  border: 2rpx solid rgba(58, 73, 75, .64);
  border-radius: 10rpx;
  background: rgba(11, 14, 20, .48);
  color: $ink-900;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;
  font-size: 22rpx;
}

.login-foot {
  margin-top: auto;
  padding-top: 46rpx;
  justify-content: center;
  gap: 12rpx;
  color: rgba(185, 202, 203, .60);
  font-size: 23rpx;
  line-height: 32rpx;
  text-align: center;
}

@media (min-width: 768px) {
  .login-page {
    width: 390px;
    min-height: 884px;
    margin: 0 auto;
    box-shadow: 0 0 0 1px rgba(58, 73, 75, .45);
  }
}
</style>
