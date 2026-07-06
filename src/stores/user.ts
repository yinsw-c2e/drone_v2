import { defineStore } from 'pinia';
import { AuditStatus, Role, RoleProfileStatus } from '@/models';
import type { TokenPair, User, UserRoleProfile } from '@/models';
import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  loadMeRemote,
  loginRemote,
  logoutRemote,
  registerRemote,
  requestRoleRemote,
  saveAuthTokens,
  sendCodeRemote,
  switchRoleRemote,
} from '@/api/backend';
import { defaultUserForRole, ensureDemoCredit, roleHome } from '@/services/app-flow';
import { repo } from '@/utils/repo';

const USER_KEY = 'drone_auth_user_id';
const LEGACY_USER_KEY = 'drone_mvp_user_id';
const LOCAL_SMS_KEY = 'drone_auth_local_sms_codes';

interface LocalCode {
  code: string;
  expiresAt: string;
}

interface UserState {
  userId: string;
  accessToken: string;
  refreshToken: string;
  initialized: boolean;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    userId: readStorage(USER_KEY),
    accessToken: getStoredAccessToken(),
    refreshToken: getStoredRefreshToken(),
    initialized: false,
  }),
  getters: {
    isAuthenticated(state): boolean {
      return Boolean(state.accessToken && state.userId && repo.users.find(state.userId));
    },
    user(state): User {
      const user = state.userId ? repo.users.find(state.userId) : undefined;
      return user ?? defaultUserForRole(Role.Client);
    },
    role(): Role {
      return this.user.currentRole;
    },
    home(): string {
      return roleHome(this.role);
    },
    roleProfiles(state): UserRoleProfile[] {
      return state.userId ? repo.userRoleProfiles.where((profile) => profile.userId === state.userId) : [];
    },
    activeRoles(): Role[] {
      return this.roleProfiles.filter((profile) => profile.status === RoleProfileStatus.Active).map((profile) => profile.role);
    },
    canSwitchRole(): boolean {
      return this.activeRoles.length > 1;
    },
  },
  actions: {
    async loadMe() {
      if (!this.accessToken) {
        this.initialized = true;
        return false;
      }
      try {
        const payload = await loadMeRemote();
        if (payload) {
          this.applyAuth(payload.user, payload.token);
          this.initialized = true;
          return true;
        }
      } catch {
        this.clearAuth();
      }
      this.initialized = true;
      return this.isAuthenticated;
    },
    async sendCode(phone: string) {
      const remote = await sendCodeRemote(phone);
      if (remote) return remote;
      const normalized = normalizePhone(phone);
      const code = '123456';
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const codes = readLocalCodes();
      codes[normalized] = { code, expiresAt };
      writeStorage(LOCAL_SMS_KEY, JSON.stringify(codes));
      return { phone: normalized, expiresAt, provider: 'local-mock', mockCode: code };
    },
    async loginWithCode(phone: string, code: string) {
      const remote = await loginRemote(phone, code);
      if (remote) {
        this.applyAuth(remote.user, remote.token);
        return remote.user;
      }
      return this.loginLocal(phone, code);
    },
    async registerWithCode(phone: string, code: string, nickname: string, initialRole: Role) {
      const remote = await registerRemote(phone, code, nickname, initialRole);
      if (remote) {
        this.applyAuth(remote.user, remote.token);
        return remote.user;
      }
      return this.registerLocal(phone, code, nickname, initialRole);
    },
    async requestRole(role: Role) {
      const remote = await requestRoleRemote(role);
      if (remote?.user) {
        this.userId = remote.user.id;
        writeStorage(USER_KEY, remote.user.id);
        return remote.role;
      }
      return requestLocalRole(this.user.id, role);
    },
    async switchRole(role: Role) {
      const remote = await switchRoleRemote(role);
      if (remote) {
        this.applyAuth(remote.user, remote.token);
        return remote.user;
      }
      const profile = repo.userRoleProfiles.where((item) => item.userId === this.user.id && item.role === role)[0];
      if (!profile || profile.status !== RoleProfileStatus.Active) throw new Error('该身份尚未激活，不能切换');
      const user = repo.users.update(this.user.id, { currentRole: role });
      return user;
    },
    hasActiveRole(role: Role) {
      return this.roleProfiles.some((profile) => profile.role === role && profile.status === RoleProfileStatus.Active);
    },
    loginAs(role: Role) {
      if (!demoLoginEnabled()) throw new Error('演示身份直进未开启');
      ensureDemoCredit();
      const user = defaultUserForRole(role);
      repo.users.update(user.id, { currentRole: role });
      this.userId = user.id;
      this.accessToken = `demo-${role}`;
      this.refreshToken = '';
      writeStorage(USER_KEY, user.id);
      writeStorage(LEGACY_USER_KEY, user.id);
      return user;
    },
    async logout() {
      const refreshToken = this.refreshToken;
      try {
        if (refreshToken) await logoutRemote(refreshToken);
      } finally {
        this.clearAuth();
      }
    },
    clearAuth() {
      this.userId = '';
      this.accessToken = '';
      this.refreshToken = '';
      clearStoredAuthTokens();
      removeStorage(USER_KEY);
      removeStorage(LEGACY_USER_KEY);
    },
    applyAuth(user: User, token: TokenPair) {
      this.userId = user.id;
      this.accessToken = token.accessToken;
      this.refreshToken = token.refreshToken;
      saveAuthTokens(token);
      writeStorage(USER_KEY, user.id);
    },
    loginLocal(phone: string, code: string) {
      const normalized = normalizePhone(phone);
      verifyLocalCode(normalized, code);
      const user = repo.users.where((item) => normalizePhone(item.phone) === normalized)[0];
      if (!user) throw new Error('手机号未注册，请先补全注册信息');
      const token = localTokenPair();
      this.applyAuth(user, token);
      repo.users.update(user.id, { lastLoginAt: new Date().toISOString() });
      return user;
    },
    registerLocal(phone: string, code: string, nickname: string, initialRole: Role) {
      const normalized = normalizePhone(phone);
      verifyLocalCode(normalized, code);
      if (![Role.Client, Role.Pilot, Role.Owner].includes(initialRole)) throw new Error('该身份不支持自助注册');
      if (repo.users.where((item) => normalizePhone(item.phone) === normalized).length) throw new Error('手机号已注册，请直接登录');
      const now = new Date().toISOString();
      const user: User = {
        id: `u_${Date.now().toString(36)}`,
        phone: normalized,
        nickname: nickname.trim() || `用户${normalized.slice(-4)}`,
        roles: [initialRole],
        currentRole: initialRole,
        authStatus: AuditStatus.Pending,
        realNameVerified: false,
        createdAt: now,
        disabled: false,
        blacklisted: false,
      };
      repo.users.insert(user);
      requestLocalRole(user.id, initialRole);
      if (initialRole === Role.Pilot || initialRole === Role.Owner) {
        repo.userRoleProfiles.update(`${user.id}_${initialRole}`, { status: RoleProfileStatus.Pending });
      }
      if (!repo.wallets.find(user.id)) repo.wallets.insert({ id: user.id, userId: user.id, balanceCent: 0, pendingCent: 0 });
      const token = localTokenPair();
      this.applyAuth(user, token);
      return user;
    },
  },
});

function requestLocalRole(userId: string, role: Role) {
  if (![Role.Client, Role.Pilot, Role.Owner].includes(role)) throw new Error('该身份不支持自助申请');
  const now = new Date().toISOString();
  const existing = repo.userRoleProfiles.find(`${userId}_${role}`);
  const status = role === Role.Client ? RoleProfileStatus.Active : RoleProfileStatus.Pending;
  if (existing) {
    if (existing.status === RoleProfileStatus.Rejected) repo.userRoleProfiles.update(existing.id, { status: RoleProfileStatus.Pending, updatedAt: now });
    return repo.userRoleProfiles.find(existing.id)!;
  }
  const user = repo.users.find(userId);
  if (user && !user.roles.includes(role)) repo.users.update(userId, { roles: [...user.roles, role] });
  ensureLocalRoleData(userId, role);
  return repo.userRoleProfiles.insert({ id: `${userId}_${role}`, userId, role, status, createdAt: now, updatedAt: now });
}

function ensureLocalRoleData(userId: string, role: Role) {
  if (role === Role.Client && !repo.clients.find(userId)) {
    repo.clients.insert({ userId, entityType: 'person', creditBureauScore: 0, stats: { payTimely: 1, defaultCount: 0, infoTrust: .8, complaintRate: 0, orderAccuracy: .9, cancelRate: 0 } });
  }
  if (role === Role.Pilot && !repo.pilots.find(userId)) {
    repo.pilots.insert({ userId, caacLevel: 'VLOS', caacExpire: '', noCrimeProof: AuditStatus.Pending, healthProof: AuditStatus.Pending, trainingCerts: [], online: false, location: { lng: 116.4, lat: 39.9 }, stats: { orders: 0, completed: 0, cancelled: 0, onTimeRate: 0, complaintRate: 0, accidentRate: 0, violationCount: 0, flightHours: 0, onlineHours: 0, avgRespSec: 0, avgStar: 0 } });
  }
  if (role === Role.Owner && !repo.owners.find(userId)) {
    repo.owners.insert({ userId, entityType: 'person', drones: [], uomVerified: false, stats: { deviceUptime: 0, faultRate: 0, maintainTimely: 0, completeRate: 0, cancelRate: 0, respSec: 0, cooperation: 0 } });
  }
}

function verifyLocalCode(phone: string, code: string) {
  const item = readLocalCodes()[phone];
  if (!item) throw new Error('请先获取验证码');
  if (Date.now() > Date.parse(item.expiresAt)) throw new Error('验证码已过期');
  if (item.code !== code.trim()) throw new Error('验证码错误');
}

function localTokenPair(): TokenPair {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  return { accessToken: `local_at_${Date.now()}`, refreshToken: `local_rt_${Date.now()}`, expiresAt };
}

function demoLoginEnabled() {
  const env = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
  return env.DEV || env.VITE_DEMO_LOGIN === '1' || env.VITE_DEMO_LOGIN === 'true';
}

function normalizePhone(phone: string) {
  return `${phone}`.replace(/\D/g, '');
}

function readLocalCodes(): Record<string, LocalCode> {
  try {
    const raw = uni.getStorageSync(LOCAL_SMS_KEY);
    return raw ? JSON.parse(raw) as Record<string, LocalCode> : {};
  } catch {
    return {};
  }
}

function readStorage(key: string) {
  try {
    return uni.getStorageSync(key) || '';
  } catch {
    return '';
  }
}

function writeStorage(key: string, value: string) {
  try {
    uni.setStorageSync(key, value);
  } catch {
    // storage is unavailable in some test shims
  }
}

function removeStorage(key: string) {
  try {
    uni.removeStorageSync(key);
  } catch {
    // storage is unavailable in some test shims
  }
}
