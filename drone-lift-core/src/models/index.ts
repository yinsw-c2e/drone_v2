export enum Role { Client='client', Pilot='pilot', Owner='owner', Admin='admin' }
export enum CargoType { Normal='normal', Valuable='valuable', Dangerous='dangerous', Agricultural='agricultural' }
export enum AuditStatus { Pending='pending', Approved='approved', Rejected='rejected', Expired='expired' }
export enum OrderStatus { Created='created', Matching='matching', Confirmed='confirmed', AirspaceApplying='airspace', Preparing='preparing', Loading='loading', InFlight='inflight', Unloading='unloading', Completed='completed', Settled='settled', Cancelled='cancelled', Exception='exception' }
export enum DispatchStrategy { Nearest='nearest', MaxProfit='maxProfit', GlobalOptimal='global', Chain='chain' }
export enum CapacityStatus { Online='online', Busy='busy', Offline='offline' }
export enum LedgerType { SettleIn='settle_in', Withdraw='withdraw', Refund='refund', Bonus='bonus' }
export enum LedgerStatus { Pending='pending', Available='available', Paid='paid' }
export enum NotificationType { Dispatch='dispatch', Audit='audit', Settlement='settlement', Alert='alert', System='system' }

export interface GeoPoint { lng: number; lat: number; address?: string }

export interface User { id: string; phone: string; nickname: string; avatar?: string; roles: Role[]; currentRole: Role; realNameVerified: boolean }
export interface PilotStats { orders: number; completed: number; cancelled: number; onTimeRate: number; complaintRate: number; accidentRate: number; violationCount: number; flightHours: number; onlineHours: number; avgRespSec: number; avgStar: number }
export interface PilotProfile { userId: string; caacLevel: 'VLOS'|'BVLOS'|'instructor'; caacExpire: string; noCrimeProof: AuditStatus; healthProof: AuditStatus; trainingCerts: string[]; online: boolean; location: GeoPoint; stats: PilotStats }
export interface OwnerStats { deviceUptime: number; faultRate: number; maintainTimely: number; completeRate: number; cancelRate: number; respSec: number; cooperation: number }
export interface OwnerProfile { userId: string; entityType: 'person'|'company'; drones: string[]; uomVerified: boolean; stats: OwnerStats }
export interface ClientStats { payTimely: number; defaultCount: number; infoTrust: number; complaintRate: number; orderAccuracy: number; cancelRate: number }
export interface ClientProfile { userId: string; entityType: 'person'|'company'; creditBureauScore?: number; stats: ClientStats }

export interface Drone { id: string; brand: 'DJI'|'XAG'|'EHang'|'Autel'|'Other'; model: string; sn: string; maxPayloadKg: number; airworthiness: AuditStatus; insured: { hull: boolean; thirdParty: boolean; thirdPartyAmount: number }; maintenanceLog: { date: string; note: string }[]; ownerId: string; status: 'idle'|'busy'|'maintenance' }
export interface CapacityUnit { id: string; pilotId: string; droneId: string; ownerId: string; location: GeoPoint; status: CapacityStatus; serviceWindow?: { start: string; end: string }; priceFactor?: number }

export interface PriceBreakdown { baseCent: number; mileageCent: number; durationCent: number; weightCent: number; difficultyFactor: number; insuranceCent: number; extraCent: number; totalCent: number }
export interface OrderEvent { at: string; status: OrderStatus; note?: string; actor?: Role }
export interface Order { id: string; clientId: string; cargo: { type: CargoType; weightKg: number; volume?: string; valueCent: number; photos: string[]; remark?: string }; from: GeoPoint; to: GeoPoint; distanceKm?: number; timeMode: 'instant'|'scheduled'; scheduledAt?: string; needs: { tempControl?: boolean; shockProof?: boolean; insurance?: boolean }; budgetCent: number; status: OrderStatus; pilotId?: string; droneId?: string; capacityId?: string; policyId?: string; priceBreakdown?: PriceBreakdown; settlement?: Settlement; events: OrderEvent[]; createdAt: string }
export interface MatchCandidate { pilotId: string; droneId: string; capacityId: string; distanceKm: number; etaMin: number; creditScore: number; quoteCent: number; score: number; reasons: string[]; priceBreakdown: PriceBreakdown }

export interface Settlement { orderId: string; totalCent: number; items: { party: 'platform'|'pilot'|'owner'|'insurance'|'tax'; ratio: number; amountCent: number; cycle: 'realtime'|'T+1'|'T+7'|'-'; note: string }[] }
export interface Wallet { id: string; userId: string; balanceCent: number; pendingCent: number }
export interface LedgerEntry { id: string; userId: string; orderId?: string; type: LedgerType; amountCent: number; cycle: string; status: LedgerStatus; note?: string; createdAt: string }

export interface CreditScore { userId: string; role: Role; total: number; level: 'A'|'B'|'C'|'D'; dimensions: { name: string; score: number; max: number }[] }
export interface InsurancePolicy { id: string; orderId: string; cargoType: CargoType; coverages: string[]; insuredAmountCent: number; premiumCent: number; status: 'active'|'claiming'|'closed' }
export interface Claim { id: string; policyId: string; orderId: string; reportedAt: string; evidence: string[]; liability?: string; payoutCent?: number; status: 'reported'|'investigating'|'assessed'|'paid'|'arbitration' }
export type AirspaceStatus = 'draft'|'submitted'|'approved'|'rejected';
export interface AirspaceRequest { id: string; orderId: string; area: GeoPoint[]; altitudeM: number; window: { start: string; end: string }; status: AirspaceStatus }
export interface Telemetry { ts: string; pos: GeoPoint; altM: number; speedMs: number; batteryPct: number; heading: number; swingDeg: number }
export interface Review { id: string; orderId: string; byRole: Role; targetUserId: string; star: 1|2|3|4|5; tags: string[]; text?: string }
export interface Notification { id: string; userId: string; type: NotificationType; title: string; body: string; read: boolean; createdAt: string; ref?: string }
