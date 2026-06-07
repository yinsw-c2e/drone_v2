import type { Order, MatchCandidate, DispatchStrategy } from '@/models';
import { AuditStatus } from '@/models';
import { distanceKm } from './geo';
import { etaMinutes, priceOrder } from './price';
import { availableCapacityViews, CapacityView } from './selectors';
import { minutesUntil } from './time';
import { PRICE_CONFIG } from '@/stores/config-data';
const r4 = (n: number) => +n.toFixed(4);
export function matchPure(o: Order, views: CapacityView[], strategy: DispatchStrategy): MatchCandidate[] {
  const out: MatchCandidate[] = [];
  for (const v of views) {
    const reasons: string[] = [];
    const dist = distanceKm(o.from, v.unit.location); if (dist > PRICE_CONFIG.thresholdKm) continue; reasons.push(`距离${dist}km`);
    if (v.drone.maxPayloadKg < o.cargo.weightKg) continue; reasons.push('载重满足');
    if (v.drone.airworthiness !== AuditStatus.Approved || v.drone.insured.thirdPartyAmount < PRICE_CONFIG.minThirdParty) continue; reasons.push('设备合规');
    const eta = etaMinutes(dist);
    if (o.timeMode === 'scheduled' && o.scheduledAt && eta > minutesUntil(o.scheduledAt)) continue; reasons.push(`ETA${eta}分`);
    const price = priceOrder(o, v.drone, eta, dist); if (price.totalCent > o.budgetCent) continue; reasons.push('在预算内');
    reasons.push(`信用${v.credit}`);
    out.push({ pilotId: v.pilot.userId, droneId: v.drone.id, capacityId: v.unit.id, distanceKm: dist, etaMin: eta, creditScore: v.credit, quoteCent: price.totalCent, score: 0, reasons, priceBreakdown: price });
  }
  const maxD = Math.max(1, ...out.map((c) => c.distanceKm)), maxQ = Math.max(1, ...out.map((c) => c.quoteCent));
  const ratingOf = (pid: string) => views.find((v) => v.pilot.userId === pid)?.rating ?? 5;
  for (const c of out) {
    const dS = 1 - c.distanceKm / maxD, cS = c.creditScore / 1000, rS = ratingOf(c.pilotId) / 5;
    c.score = strategy === 'maxProfit' ? r4(c.quoteCent / maxQ) : strategy === 'global' ? r4(0.5 * dS + 0.5 * cS) : strategy === 'chain' ? r4(0.7 * dS + 0.3 * cS) : r4(0.6 * dS + 0.25 * cS + 0.15 * rS);
  }
  return out.sort((a, b) => b.score - a.score);
}
// 'global' 采用打分贪心近似；完整版可改为二分图最优匹配（匈牙利算法）
export const match = (o: Order, strategy: DispatchStrategy = 'nearest' as DispatchStrategy) => matchPure(o, availableCapacityViews(), strategy);
