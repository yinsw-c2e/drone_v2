import { reactive, watch } from 'vue';
import { AuditStatus, RoleProfileStatus } from '@/models';
import type { User, UserRoleProfile, AuthSession, SMSCode, PilotProfile, OwnerProfile, ClientProfile, Drone, CapacityUnit, Order, PaymentOrder, CreditScore, InsurancePolicy, Claim, AirspaceRequest, TelemetrySnapshot, Review, Wallet, LedgerEntry, Notification, CertificationApplication, AuditLog } from '@/models';
import { buildSeed, buildSeedCertQueue, buildSeedLedger, buildSeedWallets } from '@/mock/seed';
export interface DBShape {
  users: User[]; userRoleProfiles: UserRoleProfile[]; authSessions: AuthSession[]; smsCodes: SMSCode[];
  pilots: PilotProfile[]; owners: OwnerProfile[]; clients: ClientProfile[];
  drones: Drone[]; capacity: CapacityUnit[]; orders: Order[]; paymentOrders: PaymentOrder[]; credits: CreditScore[];
  policies: InsurancePolicy[]; claims: Claim[]; airspace: AirspaceRequest[]; telemetry: TelemetrySnapshot[]; reviews: Review[];
  wallets: Wallet[]; ledger: LedgerEntry[]; notifications: Notification[]; authApplications: CertificationApplication[]; auditLogs: AuditLog[]; _seededAt: string;
}
const KEY = 'drone_mvp_db_v3';
const env = ((import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env ?? {});
const localPersistDisabled = env.VITE_DISABLE_LOCAL_DB_PERSIST === '1' || env.VITE_DISABLE_LOCAL_DB_PERSIST === 'true';
const productionRuntime = env.PROD === true || env.MODE === 'production' || env.VITE_APP_ENV === 'production';
function canUseLocalPersist() {
  return !localPersistDisabled && typeof uni !== 'undefined' && typeof uni.getStorageSync === 'function';
}
function load(): DBShape | null {
  if (!canUseLocalPersist()) return null;
  try { const r = uni.getStorageSync(KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function createEmptyDB(): DBShape {
  return {
    users: [], userRoleProfiles: [], authSessions: [], smsCodes: [], pilots: [], owners: [], clients: [],
    drones: [], capacity: [], orders: [], paymentOrders: [], credits: [], policies: [], claims: [], airspace: [],
    telemetry: [], reviews: [], wallets: [], ledger: [], notifications: [], authApplications: [], auditLogs: [],
    _seededAt: '',
  };
}

export function migrateDB(input: DBShape | null, allowDemoBackfill: boolean): DBShape {
  const next = input ?? (allowDemoBackfill ? buildSeed() : createEmptyDB());
  next.users ??= [];
  next.userRoleProfiles ??= [];
  next.authSessions ??= [];
  next.smsCodes ??= [];
  next.pilots ??= [];
  next.owners ??= [];
  next.clients ??= [];
  next.drones ??= [];
  next.capacity ??= [];
  next.orders ??= [];
  next.paymentOrders ??= [];
  next.credits ??= [];
  next.policies ??= [];
  next.claims ??= [];
  next.authApplications ??= [];
  next.auditLogs ??= [];
  next.telemetry ??= [];
  next.reviews ??= [];
  next.wallets ??= [];
  next.ledger ??= [];
  next.notifications ??= [];
  next.airspace ??= [];
  next._seededAt ??= '';
  // 旧存档回填演示初始数据：仅在对应集合为空时注入，避免覆盖已产生的业务数据
  if (allowDemoBackfill && !next.wallets.length) {
    next.wallets = buildSeedWallets();
    next.ledger = next.ledger.length ? next.ledger : buildSeedLedger();
  }
  if (allowDemoBackfill && !next.authApplications.length) next.authApplications = buildSeedCertQueue();
  next.users?.forEach((u) => {
    u.blacklisted ??= false;
    u.disabled ??= false;
    u.createdAt ??= next._seededAt || new Date().toISOString();
    u.authStatus ??= u.realNameVerified ? AuditStatus.Approved : AuditStatus.Pending;
    u.roles?.forEach((role) => {
      if (!next.userRoleProfiles.some((profile) => profile.userId === u.id && profile.role === role)) {
        next.userRoleProfiles.push({ id: `${u.id}_${role}`, userId: u.id, role, status: RoleProfileStatus.Active, createdAt: u.createdAt!, updatedAt: u.createdAt! });
      }
    });
  });
  next.orders?.forEach((o) => {
    o.paymentMode ??= 'escrow' as any;
    o.timeRequirement ??= '';
    o.needs ??= {};
    o.cargo.photos ??= [];
  });
  return next;
}
export const db = reactive<DBShape>(migrateDB(load(), !productionRuntime));
if (canUseLocalPersist()) {
  watch(db, () => { try { uni.setStorageSync(KEY, JSON.stringify(db)); } catch { /* ignore persist errors */ } }, { deep: true });
}
export const resetDB = () => { Object.assign(db, buildSeed()); };
export const hydrateDB = (next: DBShape) => { Object.assign(db, migrateDB(next, false)); };
