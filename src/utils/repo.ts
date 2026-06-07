import { db, DBShape } from './db';
import type { User, PilotProfile, OwnerProfile, ClientProfile, Drone, CapacityUnit, Order, CreditScore, InsurancePolicy, Claim, AirspaceRequest, Review, Wallet, LedgerEntry, Notification, CertificationApplication, AuditLog } from '@/models';
function makeRepo<T extends object>(coll: keyof DBShape, key: keyof T = 'id' as keyof T) {
  const arr = () => db[coll] as unknown as T[];
  const idOf = (x: T) => (x as any)[key];
  return {
    all: () => arr().slice(),
    find: (id: string) => arr().find((x) => idOf(x) === id),
    where: (p: (x: T) => boolean) => arr().filter(p),
    insert: (x: T) => { arr().push(x); return x; },
    update: (id: string, patch: Partial<T>) => { const it = arr().find((x) => idOf(x) === id); if (!it) throw new Error(`${String(coll)} 不存在: ${id}`); Object.assign(it, patch); return it; },
    remove: (id: string) => { const a = arr(); const i = a.findIndex((x) => idOf(x) === id); if (i >= 0) a.splice(i, 1); },
  };
}
export const repo = {
  users: makeRepo<User>('users'),
  pilots: makeRepo<PilotProfile>('pilots', 'userId'),
  owners: makeRepo<OwnerProfile>('owners', 'userId'),
  clients: makeRepo<ClientProfile>('clients', 'userId'),
  drones: makeRepo<Drone>('drones'),
  capacity: makeRepo<CapacityUnit>('capacity'),
  orders: makeRepo<Order>('orders'),
  credits: makeRepo<CreditScore>('credits', 'userId'),
  policies: makeRepo<InsurancePolicy>('policies'),
  claims: makeRepo<Claim>('claims'),
  airspace: makeRepo<AirspaceRequest>('airspace'),
  reviews: makeRepo<Review>('reviews'),
  wallets: makeRepo<Wallet>('wallets'),
  ledger: makeRepo<LedgerEntry>('ledger'),
  notifications: makeRepo<Notification>('notifications'),
  authApplications: makeRepo<CertificationApplication>('authApplications'),
  auditLogs: makeRepo<AuditLog>('auditLogs'),
};
