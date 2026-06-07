import { reactive, watch } from 'vue';
import type { User, PilotProfile, OwnerProfile, ClientProfile, Drone, CapacityUnit, Order, CreditScore, InsurancePolicy, Claim, AirspaceRequest, Review, Wallet, LedgerEntry, Notification } from '@/models';
import { buildSeed } from '@/mock/seed';
export interface DBShape {
  users: User[]; pilots: PilotProfile[]; owners: OwnerProfile[]; clients: ClientProfile[];
  drones: Drone[]; capacity: CapacityUnit[]; orders: Order[]; credits: CreditScore[];
  policies: InsurancePolicy[]; claims: Claim[]; airspace: AirspaceRequest[]; reviews: Review[];
  wallets: Wallet[]; ledger: LedgerEntry[]; notifications: Notification[]; _seededAt: string;
}
const KEY = 'drone_mvp_db_v3';
function load(): DBShape | null { try { const r = uni.getStorageSync(KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
export const db = reactive<DBShape>(load() ?? buildSeed());
watch(db, () => { try { uni.setStorageSync(KEY, JSON.stringify(db)); } catch { /* ignore persist errors */ } }, { deep: true });
export const resetDB = () => { Object.assign(db, buildSeed()); };
