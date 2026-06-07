import type { Order, Drone, PriceBreakdown } from '@/models';
import { CargoType } from '@/models';
import { distanceKm } from './geo';
import { PRICE_CONFIG } from '@/stores/config-data';
const Y = 100;
const baseFee = (kg: number) => (kg <= 5 ? 50 : kg <= 15 ? 100 : kg <= 30 ? 150 : 200) * Y;
function mileageFee(km: number): number {
  let f = 0, r = km;
  for (const [span, rate] of PRICE_CONFIG.mileageTiers) { const s = Math.min(r, span); f += s * rate; r -= s; if (r <= 0) break; }
  return Math.round(f * Y);
}
const durationFee = (min: number) => Math.round(min * PRICE_CONFIG.perMinYuan * Y);
const weightFee = (kg: number) => Math.ceil(kg / 10) * PRICE_CONFIG.per10kgYuan * Y;
function difficulty(o: Order): number {
  let f = 1;
  if (o.scheduledAt && new Date(o.scheduledAt).getHours() >= 19) f += 0.3;
  if (o.needs.shockProof) f += 0.2;
  if (o.needs.tempControl) f += 0.2;
  return Math.min(2, +f.toFixed(2));
}
const insuranceFee = (t: CargoType, v: number) => Math.round(v * (t === CargoType.Valuable || t === CargoType.Dangerous ? 0.03 : 0.01));
export function etaMinutes(distKm: number): number {
  const kmh = PRICE_CONFIG.cruiseMs * 3.6;
  return Math.max(3, Math.round((distKm / kmh) * 60) + PRICE_CONFIG.prepMin);
}
// 难度系数作用于"运营小计"（说明书未明确，取业内通行口径并在此标注）
export function priceOrder(o: Order, drone: Drone, etaMin: number, km: number = distanceKm(o.from, o.to)): PriceBreakdown {
  const base = baseFee(drone.maxPayloadKg), mil = mileageFee(km), dur = durationFee(etaMin), wt = weightFee(o.cargo.weightKg);
  const df = difficulty(o), op = Math.round((base + mil + dur + wt) * df);
  const insv = o.needs.insurance ? insuranceFee(o.cargo.type, o.cargo.valueCent) : 0, extra = 0;
  return { baseCent: base, mileageCent: mil, durationCent: dur, weightCent: wt, difficultyFactor: df, insuranceCent: insv, extraCent: extra, totalCent: op + insv + extra };
}
