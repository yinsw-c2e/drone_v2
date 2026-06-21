import type { GeoPoint } from '@/models';
export interface PriceConfig { mileageTiers: [number, number][]; perMinYuan: number; per10kgYuan: number; cruiseMs: number; prepMin: number; thresholdKm: number; minThirdParty: number }
export const PRICE_CONFIG: PriceConfig = { mileageTiers: [[5, 15], [15, 10], [Infinity, 5]], perMinYuan: 3, per10kgYuan: 20, cruiseMs: 13, prepMin: 3, thresholdKm: 5, minThirdParty: 5_000_000 };
export const SETTLEMENT_RULES = [
  { party: 'platform', ratio: 0.10, cycle: 'T+1', note: '技术服务费' },
  { party: 'pilot', ratio: 0.50, cycle: 'T+1', note: '劳务报酬' },
  { party: 'owner', ratio: 0.30, cycle: 'T+7', note: '设备使用费' },
  { party: 'insurance', ratio: 0.05, cycle: 'realtime', note: '保险费用' },
  { party: 'tax', ratio: 0.05, cycle: '-', note: '代扣代缴' },
] as const;
export const INSURANCE_PLANS: Record<string, { coverages: string[]; suggest: string; mustInsure: boolean; needApproval: boolean }> = {
  normal: { coverages: ['机身险', '第三者责任险'], suggest: '50-100万', mustInsure: false, needApproval: false },
  valuable: { coverages: ['机身险', '第三者责任险', '货物险'], suggest: '货值200%', mustInsure: true, needApproval: false },
  dangerous: { coverages: ['全险种', '特殊附加险'], suggest: '200万以上', mustInsure: false, needApproval: true },
  agricultural: { coverages: ['机身险', '第三者责任险'], suggest: '30-50万', mustInsure: false, needApproval: false },
};
export const NO_FLY_ZONES: GeoPoint[][] = [
  [{ lng: 113.14, lat: 23.03 }, { lng: 113.15, lat: 23.03 }, { lng: 113.15, lat: 23.04 }, { lng: 113.14, lat: 23.04 }],
];
