import { db, DBShape } from './db';
import type { User, UserRoleProfile, AuthSession, SMSCode, PilotProfile, OwnerProfile, ClientProfile, Drone, CapacityUnit, Order, PaymentOrder, CreditScore, InsurancePolicy, Claim, AirspaceRequest, TelemetrySnapshot, Review, Wallet, LedgerEntry, Notification, CertificationApplication, AuditLog } from '@/models';
const runtimeEnv = ((import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env ?? {});
export function allowsLocalBusinessMutation(env: Record<string, string | boolean | undefined> = runtimeEnv) {
  return !(env.PROD === true || env.MODE === 'production' || env.VITE_APP_ENV === 'production');
}
export function assertLocalBusinessMutationAllowed() {
  if (!allowsLocalBusinessMutation()) throw new Error('生产环境禁止本地业务数据变更，请使用对应的服务端接口');
}
function makeRepo<T extends object>(coll: keyof DBShape, key: keyof T = 'id' as keyof T) {
  const arr = () => db[coll] as unknown as T[];
  const idOf = (x: T) => (x as any)[key];
  return {
    all: () => arr().slice(),
    find: (id: string) => arr().find((x) => idOf(x) === id),
    where: (p: (x: T) => boolean) => arr().filter(p),
    insert: (x: T) => { assertLocalBusinessMutationAllowed(); arr().push(x); return x; },
    update: (id: string, patch: Partial<T>) => { assertLocalBusinessMutationAllowed(); const it = arr().find((x) => idOf(x) === id); if (!it) throw new Error(`${String(coll)} 不存在: ${id}`); Object.assign(it, patch); return it; },
    remove: (id: string) => { assertLocalBusinessMutationAllowed(); const a = arr(); const i = a.findIndex((x) => idOf(x) === id); if (i >= 0) a.splice(i, 1); },
  };
}
export const repo = {
  users: makeRepo<User>('users'),
  userRoleProfiles: makeRepo<UserRoleProfile>('userRoleProfiles'),
  authSessions: makeRepo<AuthSession>('authSessions', 'accessToken'),
  smsCodes: makeRepo<SMSCode>('smsCodes'),
  pilots: makeRepo<PilotProfile>('pilots', 'userId'),
  owners: makeRepo<OwnerProfile>('owners', 'userId'),
  clients: makeRepo<ClientProfile>('clients', 'userId'),
  drones: makeRepo<Drone>('drones'),
  capacity: makeRepo<CapacityUnit>('capacity'),
  orders: makeRepo<Order>('orders'),
  paymentOrders: makeRepo<PaymentOrder>('paymentOrders'),
  credits: makeRepo<CreditScore>('credits', 'userId'),
  policies: makeRepo<InsurancePolicy>('policies'),
  claims: makeRepo<Claim>('claims'),
  airspace: makeRepo<AirspaceRequest>('airspace'),
  telemetry: makeRepo<TelemetrySnapshot>('telemetry'),
  reviews: makeRepo<Review>('reviews'),
  wallets: makeRepo<Wallet>('wallets'),
  ledger: makeRepo<LedgerEntry>('ledger'),
  notifications: makeRepo<Notification>('notifications'),
  authApplications: makeRepo<CertificationApplication>('authApplications'),
  auditLogs: makeRepo<AuditLog>('auditLogs'),
};
