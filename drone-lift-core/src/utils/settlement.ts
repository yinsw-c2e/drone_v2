import type { Order, Settlement } from '@/models';
import { SETTLEMENT_RULES } from '@/stores/config-data';
import { repo } from './repo';
import { walletCredit } from './wallet';
export function computeSettlement(totalCent: number): Settlement['items'] {
  const items: Settlement['items'] = SETTLEMENT_RULES.map((r) => ({ party: r.party, ratio: r.ratio, amountCent: Math.round(totalCent * r.ratio), cycle: r.cycle, note: r.note }));
  const diff = totalCent - items.reduce((s, i) => s + i.amountCent, 0);
  const platform = items.find((i) => i.party === 'platform'); if (platform) platform.amountCent += diff;
  return items;
}
export function settleOrder(o: Order): Settlement {
  const total = o.priceBreakdown!.totalCent;
  const items = computeSettlement(total);
  const s: Settlement = { orderId: o.id, totalCent: total, items };
  const pilotItem = items.find((i) => i.party === 'pilot')!;
  const ownerItem = items.find((i) => i.party === 'owner')!;
  if (o.pilotId) walletCredit(o.pilotId, o.id, pilotItem.amountCent, pilotItem.cycle, '飞手劳务');
  const ownerId = o.droneId ? repo.drones.find(o.droneId)?.ownerId : undefined;
  if (ownerId) walletCredit(ownerId, o.id, ownerItem.amountCent, ownerItem.cycle, '设备使用费');
  return s;
}
