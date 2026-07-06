import { CargoType } from '@/models';
import type { GeoPoint } from '@/models';

export type CommonRouteId = 'tech-shekou' | 'longhua-yantian';

export interface CommonRoutePreset {
  id: CommonRouteId;
  from: GeoPoint;
  to: GeoPoint;
  cargoType: CargoType;
  weightKg: number;
  volume: string;
  valueYuan: number;
  insured: boolean;
  referencePriceCent: number;
  labels: Record<'en' | 'zh', {
    from: string;
    to: string;
    meta: string;
    special: string;
  }>;
}

const COMMON_ROUTE_PRESETS: CommonRoutePreset[] = [
  {
    id: 'tech-shekou',
    from: { lng: 113.946751, lat: 22.544555, address: '深圳科技园 · 科苑路' },
    to: { lng: 113.915881, lat: 22.481992, address: '蛇口港 · 物流闸口' },
    cargoType: CargoType.Normal,
    weightKg: 8,
    volume: '0.50',
    valueYuan: 3000,
    insured: true,
    referencePriceCent: 80000,
    labels: {
      en: {
        from: 'Tech Park',
        to: 'Shekou Port',
        meta: 'Standard cargo | about 15 min | tap to reuse',
        special: 'Reuse common route: Tech Park to Shekou Port',
      },
      zh: {
        from: '科技园',
        to: '蛇口港',
        meta: '标准件 ｜ 约15分钟 ｜ 点击套用',
        special: '套用常用航线：科技园至蛇口港',
      },
    },
  },
  {
    id: 'longhua-yantian',
    from: { lng: 114.023787, lat: 22.659552, address: '龙华中心 · 民治大道' },
    to: { lng: 114.27559, lat: 22.586983, address: '盐田港 · 西闸口' },
    cargoType: CargoType.Valuable,
    weightKg: 18,
    volume: '1.20',
    valueYuan: 12000,
    insured: true,
    referencePriceCent: 185000,
    labels: {
      en: {
        from: 'Longhua Center',
        to: 'Yantian Port',
        meta: 'Heavy cargo | about 32 min | tap to reuse',
        special: 'Reuse common route: Longhua Center to Yantian Port',
      },
      zh: {
        from: '龙华中心',
        to: '盐田港',
        meta: '重型件 ｜ 约32分钟 ｜ 点击套用',
        special: '套用常用航线：龙华中心至盐田港',
      },
    },
  },
];

export function commonRoutePresets() {
  return COMMON_ROUTE_PRESETS;
}

export function findCommonRoutePreset(id: string | undefined) {
  return COMMON_ROUTE_PRESETS.find((route) => route.id === id);
}
