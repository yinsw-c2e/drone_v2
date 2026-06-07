import { OrderStatus as S, Role, CapacityStatus } from '@/models';
import type { Order } from '@/models';
import { repo } from './repo';
import { nowISO } from './time';
import { checkCompliance } from './compliance';
import { settleOrder } from './settlement';
import { creditAfterOrder, bumpStatsOnComplete } from './credit';
export const NEXT: Record<S, S[]> = {
  [S.Created]: [S.Matching, S.Cancelled],
  [S.Matching]: [S.Confirmed, S.Cancelled],
  [S.Confirmed]: [S.AirspaceApplying, S.Cancelled],
  [S.AirspaceApplying]: [S.Preparing, S.Cancelled, S.Exception],
  [S.Preparing]: [S.Loading, S.Cancelled, S.Exception],
  [S.Loading]: [S.InFlight, S.Exception],
  [S.InFlight]: [S.Unloading, S.Exception],
  [S.Unloading]: [S.Completed, S.Exception],
  [S.Completed]: [S.Settled],
  [S.Settled]: [],
  [S.Cancelled]: [],
  [S.Exception]: [S.Preparing, S.Cancelled],
};
export const canTransition = (from: S, to: S) => NEXT[from]?.includes(to) ?? false;
export function transition(orderId: string, to: S, ctx: { actor: Role; note?: string }): Order {
  const o = repo.orders.find(orderId) as Order | undefined; if (!o) throw new Error('订单不存在');
  if (!canTransition(o.status, to)) throw new Error(`非法流转：${o.status} → ${to}`);
  if (to === S.Preparing) { const c = checkCompliance(o); if (!c.pass) throw new Error('合规不通过：' + c.failed.join('、')); }
  if (to === S.Confirmed) { if (o.capacityId) repo.capacity.update(o.capacityId, { status: CapacityStatus.Busy }); if (o.droneId) repo.drones.update(o.droneId, { status: 'busy' }); }
  if (to === S.Completed) { if (o.capacityId) repo.capacity.update(o.capacityId, { status: CapacityStatus.Online }); if (o.droneId) repo.drones.update(o.droneId, { status: 'idle' }); bumpStatsOnComplete(o); }
  if (to === S.Settled) { o.settlement = settleOrder(o); creditAfterOrder(o); }
  o.status = to;
  o.events.push({ at: nowISO(), status: to, actor: ctx.actor, note: ctx.note });
  repo.orders.update(o.id, { status: o.status, events: o.events, settlement: o.settlement });
  return o;
}
