import { Role } from '@/models';
import type { CreditScore, PilotStats, OwnerStats, ClientStats, Order, Review } from '@/models';
import { repo } from './repo';
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
const level = (t: number): CreditScore['level'] => (t >= 850 ? 'A' : t >= 700 ? 'B' : t >= 550 ? 'C' : 'D');
export function pilotCredit(uid: string, m: PilotStats): CreditScore {
  const base = clamp((m.flightHours >= 500 ? 80 : 40) + Math.min(m.orders / 50, 1) * 60 + 60, 200);
  const service = clamp(300 * (0.4 * m.onTimeRate + 0.4 * (m.completed / Math.max(1, m.orders)) + 0.2 * (1 - m.complaintRate)), 300);
  const safety = clamp(300 * (1 - 0.5 * m.accidentRate - 0.05 * m.violationCount), 300);
  const active = clamp(200 * (0.5 * Math.min(m.orders / 100, 1) + 0.3 * Math.min(m.onlineHours / 200, 1) + 0.2 * (1 - Math.min(m.avgRespSec / 60, 1))), 200);
  const total = base + service + safety + active;
  return { userId: uid, role: Role.Pilot, total, level: level(total), dimensions: [{ name: '基础资质', score: base, max: 200 }, { name: '服务质量', score: service, max: 300 }, { name: '安全记录', score: safety, max: 300 }, { name: '活跃度', score: active, max: 200 }] };
}
export function ownerCredit(uid: string, m: OwnerStats): CreditScore {
  const compliance = clamp(250 * (0.6 * m.deviceUptime + 0.4 * (1 - m.faultRate)), 250);
  const service = clamp(300 * (0.5 * m.maintainTimely + 0.5 * m.completeRate), 300);
  const fulfil = clamp(250 * (1 - m.cancelRate), 250);
  const coop = clamp(200 * (0.6 * m.cooperation + 0.4 * (1 - Math.min(m.respSec / 120, 1))), 200);
  const total = compliance + service + fulfil + coop;
  return { userId: uid, role: Role.Owner, total, level: level(total), dimensions: [{ name: '设备合规', score: compliance, max: 250 }, { name: '服务质量', score: service, max: 300 }, { name: '履约能力', score: fulfil, max: 250 }, { name: '合作态度', score: coop, max: 200 }] };
}
export function clientCredit(uid: string, m: ClientStats): CreditScore {
  const idv = clamp(200 * m.infoTrust, 200);
  const pay = clamp(300 * (m.payTimely - Math.min(m.defaultCount * 0.1, 1)), 300);
  const coop = clamp(300 * (1 - m.complaintRate), 300);
  const quality = clamp(200 * (0.6 * m.orderAccuracy + 0.4 * (1 - m.cancelRate)), 200);
  const total = idv + pay + coop + quality;
  return { userId: uid, role: Role.Client, total, level: level(total), dimensions: [{ name: '身份认证', score: idv, max: 200 }, { name: '支付能力', score: pay, max: 300 }, { name: '合作态度', score: coop, max: 300 }, { name: '订单质量', score: quality, max: 200 }] };
}
function upsert(cs: CreditScore) { const ex = repo.credits.where((c) => c.userId === cs.userId)[0]; if (ex) repo.credits.update(cs.userId, cs); else repo.credits.insert(cs); }
export function computeCredit(userId: string, role: Role): CreditScore {
  let cs: CreditScore | undefined;
  if (role === Role.Pilot) { const p = repo.pilots.find(userId); if (p) cs = pilotCredit(userId, p.stats); }
  else if (role === Role.Owner) { const o = repo.owners.find(userId); if (o) cs = ownerCredit(userId, o.stats); }
  else if (role === Role.Client) { const c = repo.clients.find(userId); if (c) cs = clientCredit(userId, c.stats); }
  if (cs) upsert(cs);
  return cs ?? repo.credits.where((c) => c.userId === userId)[0];
}
export function bumpStatsOnComplete(o: Order) {
  if (!o.pilotId) return;
  const p = repo.pilots.find(o.pilotId); if (!p) return;
  p.stats.orders++; p.stats.completed++;
  repo.pilots.update(p.userId, { stats: { ...p.stats } });
}
export function bumpStatsOnReview(r: Review) {
  const p = repo.pilots.find(r.targetUserId); if (!p) return;
  const n = p.stats.orders || 1;
  p.stats.avgStar = +(((p.stats.avgStar * (n - 1)) + r.star) / n).toFixed(2);
  if (r.star <= 2) p.stats.complaintRate = Math.min(1, p.stats.complaintRate + 0.05);
  repo.pilots.update(p.userId, { stats: { ...p.stats } });
}
export function creditAfterOrder(o: Order) { if (o.pilotId) computeCredit(o.pilotId, Role.Pilot); }
