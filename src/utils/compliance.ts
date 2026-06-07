import type { Order } from '@/models';
import { CargoType, AuditStatus } from '@/models';
import { repo } from './repo';
export function checkCompliance(o: Order): { pass: boolean; failed: string[] } {
  const f: string[] = [];
  if (!repo.users.find(o.clientId)?.realNameVerified) f.push('业主未实名');
  const pilot = o.pilotId ? repo.pilots.find(o.pilotId) : null;
  if (!pilot) f.push('未指派飞手'); else if (pilot.caacExpire && new Date(pilot.caacExpire) < new Date()) f.push('飞手执照过期');
  const drone = o.droneId ? repo.drones.find(o.droneId) : null;
  if (!drone) f.push('未指派设备');
  else { if (drone.airworthiness !== AuditStatus.Approved) f.push('设备适航不通过'); if (drone.insured.thirdPartyAmount < 5_000_000) f.push('三者险<500万'); if (drone.maxPayloadKg < o.cargo.weightKg) f.push('载荷超限'); }
  if (o.cargo.type === CargoType.Valuable && !o.policyId) f.push('贵重货物未投保');
  return { pass: f.length === 0, failed: f };
}
