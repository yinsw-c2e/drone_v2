import { defineStore } from 'pinia';
import { INSURANCE_PLANS, PRICE_CONFIG, SETTLEMENT_RULES } from '@/stores/config-data';

export const useConfigStore = defineStore('config', {
  state: () => ({
    price: PRICE_CONFIG,
    insurance: INSURANCE_PLANS,
    settlement: SETTLEMENT_RULES,
  }),
});
