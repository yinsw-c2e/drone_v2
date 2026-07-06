import { Role } from '@/models';
import { roleHome } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';

export function currentPagePath() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  const current = pages[pages.length - 1] as { route?: string; $page?: { fullPath?: string } } | undefined;
  return current?.$page?.fullPath || (current?.route ? `/${current.route}` : '');
}

export function loginURL(redirect = currentPagePath()) {
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
  return `/pages/login/index${query}`;
}

export function ensureAuthenticated() {
  const userStore = useUserStore();
  if (userStore.isAuthenticated) return true;
  uni.reLaunch({ url: loginURL() });
  return false;
}

export function ensureRole(role: Role) {
  const userStore = useUserStore();
  if (!ensureAuthenticated()) return false;
  if (userStore.user.currentRole === role && userStore.hasActiveRole(role)) return true;
  if (userStore.hasActiveRole(role)) {
    void userStore.switchRole(role).then(() => {
      if (roleHome(role) !== currentPagePath()) uni.redirectTo({ url: roleHome(role) });
    });
    return true;
  }
  uni.redirectTo({ url: '/pages/profile/index' });
  return false;
}

export function requireOperationalRole(role: Role) {
  const userStore = useUserStore();
  return userStore.isAuthenticated && userStore.hasActiveRole(role);
}
