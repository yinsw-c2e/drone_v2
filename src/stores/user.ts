import { defineStore } from 'pinia';
import { Role } from '@/models';
import type { User } from '@/models';
import { defaultUserForRole, ensureDemoCredit, roleHome } from '@/services/app-flow';
import { repo } from '@/utils/repo';

const USER_KEY = 'drone_mvp_user_id';

interface UserState {
  userId: string;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    userId: uni.getStorageSync(USER_KEY) || '',
  }),
  getters: {
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
  },
  actions: {
    loginAs(role: Role) {
      ensureDemoCredit();
      const user = defaultUserForRole(role);
      repo.users.update(user.id, { currentRole: role });
      this.userId = user.id;
      uni.setStorageSync(USER_KEY, user.id);
      return user;
    },
    switchRole(role: Role) {
      return this.loginAs(role);
    },
    logout() {
      this.userId = '';
      uni.removeStorageSync(USER_KEY);
    },
  },
});
