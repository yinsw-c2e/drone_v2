import { defineStore } from 'pinia';

export type LocaleCode = 'en' | 'zh';

const LOCALE_KEY = 'drone_mvp_locale';
const DEFAULT_LOCALE: LocaleCode = 'zh';

function readLocale(): LocaleCode {
  try {
    const saved = uni.getStorageSync(LOCALE_KEY);
    return saved === 'en' || saved === 'zh' ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function persistLocale(locale: LocaleCode) {
  try {
    uni.setStorageSync(LOCALE_KEY, locale);
  } catch {
    // Storage can be unavailable in some preview runtimes.
  }
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: readLocale() as LocaleCode,
  }),
  getters: {
    isZh: (state) => state.locale === 'zh',
    toggleLabel: (state) => (state.locale === 'zh' ? 'EN' : '中文'),
  },
  actions: {
    setLocale(locale: LocaleCode) {
      this.locale = locale;
      persistLocale(locale);
    },
    toggleLocale() {
      this.setLocale(this.locale === 'zh' ? 'en' : 'zh');
    },
  },
});
