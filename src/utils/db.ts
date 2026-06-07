import { reactive, watch } from 'vue';
import type { User, PilotProfile, OwnerProfile, ClientProfile, Drone, CapacityUnit, Order, CreditScore, InsurancePolicy, Claim, AirspaceRequest, Review, Wallet, LedgerEntry, Notification, CertificationApplication, AuditLog } from '@/models';
import { buildSeed } from '@/mock/seed';
export interface DBShape {
  users: User[]; pilots: PilotProfile[]; owners: OwnerProfile[]; clients: ClientProfile[];
  drones: Drone[]; capacity: CapacityUnit[]; orders: Order[]; credits: CreditScore[];
  policies: InsurancePolicy[]; claims: Claim[]; airspace: AirspaceRequest[]; reviews: Review[];
  wallets: Wallet[]; ledger: LedgerEntry[]; notifications: Notification[]; authApplications: CertificationApplication[]; auditLogs: AuditLog[]; _seededAt: string;
}
const KEY = 'drone_mvp_db_v3';
function load(): DBShape | null { try { const r = uni.getStorageSync(KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function migrate(input: DBShape | null): DBShape {
  const next = input ?? buildSeed();
  next.authApplications ??= [];
  next.auditLogs ??= [];
  next.users?.forEach((u) => { u.blacklisted ??= false; });
  next.orders?.forEach((o) => {
    o.paymentMode ??= 'escrow' as any;
    o.timeRequirement ??= '';
    o.needs ??= {};
    o.cargo.photos ??= [];
  });
  return next;
}
export const db = reactive<DBShape>(migrate(load()));
watch(db, () => { try { uni.setStorageSync(KEY, JSON.stringify(db)); } catch { /* ignore persist errors */ } }, { deep: true });
export const resetDB = () => { Object.assign(db, buildSeed()); };
