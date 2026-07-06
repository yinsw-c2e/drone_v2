import { Role, AuditStatus, CapacityStatus, LedgerStatus, LedgerType, RoleProfileStatus } from '@/models';
import type { DBShape } from '@/utils/db';
import type { User, UserRoleProfile, PilotProfile, OwnerProfile, ClientProfile, Drone, CapacityUnit, Wallet, LedgerEntry, CertificationApplication } from '@/models';

const future = '2031-12-31T00:00:00.000Z';

function isoAgo(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}

export function buildSeedWallets(): Wallet[] {
  return [
    { id: 'u_p1', userId: 'u_p1', balanceCent: 452000, pendingCent: 128500 },
    { id: 'u_o1', userId: 'u_o1', balanceCent: 245800, pendingCent: 84500 },
    { id: 'u_c1', userId: 'u_c1', balanceCent: 260000, pendingCent: 0 },
  ];
}

export function buildSeedLedger(): LedgerEntry[] {
  return [
    { id: 'le_seed_p1_settle', userId: 'u_p1', orderId: 'ORD-DEMO-088', type: LedgerType.SettleIn, amountCent: 345000, cycle: 'T+1', status: LedgerStatus.Available, note: '历史任务结算（演示初始数据）', createdAt: isoAgo(3 * 24 * 3600 * 1000) },
    { id: 'le_seed_p1_pending', userId: 'u_p1', orderId: 'ORD-DEMO-091', type: LedgerType.SettleIn, amountCent: 128500, cycle: 'T+1', status: LedgerStatus.Pending, note: '历史任务结算（待释放）', createdAt: isoAgo(20 * 3600 * 1000) },
    { id: 'le_seed_p1_withdraw', userId: 'u_p1', type: LedgerType.Withdraw, amountCent: -50000, cycle: '-', status: LedgerStatus.Paid, note: '提现', createdAt: isoAgo(2 * 24 * 3600 * 1000) },
    { id: 'le_seed_o1_settle', userId: 'u_o1', orderId: 'ORD-DEMO-088', type: LedgerType.SettleIn, amountCent: 120000, cycle: 'T+7', status: LedgerStatus.Available, note: '设备使用费结算（演示初始数据）', createdAt: isoAgo(4 * 24 * 3600 * 1000) },
    { id: 'le_seed_o1_pending', userId: 'u_o1', orderId: 'ORD-DEMO-091', type: LedgerType.SettleIn, amountCent: 84500, cycle: 'T+7', status: LedgerStatus.Pending, note: '设备使用费（待释放）', createdAt: isoAgo(20 * 3600 * 1000) },
  ];
}

export function buildSeedCertQueue(): CertificationApplication[] {
  return [
    {
      id: 'cert_seed_pilot',
      userId: 'u_p2',
      role: Role.Pilot,
      status: AuditStatus.Pending,
      submittedAt: isoAgo(5 * 60 * 1000),
      fields: { realName: '飞手2', caacLevel: 'VLOS', noCrimeProof: '无犯罪记录证明', healthProof: '体检报告', trainingCerts: ['应急处置'] },
    },
    {
      id: 'cert_seed_owner',
      userId: 'u_o2',
      role: Role.Owner,
      status: AuditStatus.Pending,
      submittedAt: isoAgo(35 * 60 * 1000),
      fields: { realName: '机主2', droneModel: 'EHang EH-216', droneSn: 'SN-D3', insuranceAmount: 5_000_000, maintenance: '月度例检正常' },
    },
    {
      id: 'cert_seed_client',
      userId: 'u_c2',
      role: Role.Client,
      status: AuditStatus.Pending,
      submittedAt: isoAgo(70 * 60 * 1000),
      fields: { realName: '业主2', idNo: '110105********5678', cargoDeclaration: ['normal'] },
    },
  ];
}

export function buildSeed(): DBShape {
  const now = new Date().toISOString();
  const pilotIds = ['u_p1', 'u_p2', 'u_p3'];
  const ownerIds = ['u_o1', 'u_o2'];
  const clientIds = ['u_c1', 'u_c2'];

  const seedPhones: Record<string, string> = {
    u_p1: '13800000001',
    u_p2: '13800000002',
    u_p3: '13800000003',
    u_o1: '13800000004',
    u_o2: '13800000005',
    u_c1: '13800000006',
    u_c2: '13800000007',
    u_admin: '13900000000',
  };
  const mkUser = (id: string, role: Role, nick: string): User => ({ id, phone: seedPhones[id], nickname: nick, roles: [role], currentRole: role, authStatus: AuditStatus.Approved, realNameVerified: true, createdAt: now, blacklisted: false, disabled: false });
  const users: User[] = [
    ...pilotIds.map((id, i) => mkUser(id, Role.Pilot, `飞手${i + 1}`)),
    ...ownerIds.map((id, i) => mkUser(id, Role.Owner, `机主${i + 1}`)),
    ...clientIds.map((id, i) => mkUser(id, Role.Client, `业主${i + 1}`)),
    mkUser('u_admin', Role.Admin, '运营管理员'),
  ];
  const userRoleProfiles: UserRoleProfile[] = users.flatMap((user) => user.roles.map((role) => ({ id: `${user.id}_${role}`, userId: user.id, role, status: RoleProfileStatus.Active, createdAt: now, updatedAt: now })));

  const pStats = () => ({ orders: 120, completed: 114, cancelled: 6, onTimeRate: 0.94, complaintRate: 0.03, accidentRate: 0, violationCount: 0, flightHours: 600, onlineHours: 320, avgRespSec: 18, avgStar: 4.7 });
  const pilots: PilotProfile[] = pilotIds.map((userId, i) => ({ userId, caacLevel: i === 0 ? 'BVLOS' : 'VLOS', caacExpire: future, noCrimeProof: AuditStatus.Approved, healthProof: AuditStatus.Approved, trainingCerts: ['应急处置'], online: true, location: [{ lng: 116.400, lat: 39.910 }, { lng: 116.390, lat: 39.905 }, { lng: 116.405, lat: 39.912 }][i], stats: pStats() }));

  const owners: OwnerProfile[] = ownerIds.map((userId) => ({ userId, entityType: 'company', drones: [], uomVerified: true, stats: { deviceUptime: 0.95, faultRate: 0.02, maintainTimely: 0.9, completeRate: 0.93, cancelRate: 0.05, respSec: 40, cooperation: 0.9 } }));
  const clients: ClientProfile[] = clientIds.map((userId) => ({ userId, entityType: 'person', creditBureauScore: 720, stats: { payTimely: 0.97, defaultCount: 0, infoTrust: 0.9, complaintRate: 0.02, orderAccuracy: 0.95, cancelRate: 0.04 } }));

  const ins = (amt: number) => ({ hull: true, thirdParty: true, thirdPartyAmount: amt });
  const drones: Drone[] = [
    { id: 'd1', brand: 'DJI', model: 'FlyCart 30', sn: 'SN-D1', maxPayloadKg: 30, airworthiness: AuditStatus.Approved, insured: ins(8_000_000), maintenanceLog: [{ date: '2026-05-01', note: '例检' }], ownerId: 'u_o1', status: 'idle' },
    { id: 'd2', brand: 'XAG', model: 'P100', sn: 'SN-D2', maxPayloadKg: 20, airworthiness: AuditStatus.Approved, insured: ins(6_000_000), maintenanceLog: [], ownerId: 'u_o1', status: 'idle' },
    { id: 'd3', brand: 'EHang', model: 'EH-216', sn: 'SN-D3', maxPayloadKg: 15, airworthiness: AuditStatus.Approved, insured: ins(5_000_000), maintenanceLog: [], ownerId: 'u_o2', status: 'idle' },
    { id: 'd4', brand: 'Autel', model: 'Dragonfish', sn: 'SN-D4', maxPayloadKg: 10, airworthiness: AuditStatus.Approved, insured: ins(5_000_000), maintenanceLog: [], ownerId: 'u_o2', status: 'idle' },
    // 非合规设备（三者险<500万），故意不投放到运力池，用于 UI 端测试合规拦截
    { id: 'd5', brand: 'Other', model: '低保额轻载机 A8', sn: 'SN-D5', maxPayloadKg: 8, airworthiness: AuditStatus.Approved, insured: ins(1_000_000), maintenanceLog: [], ownerId: 'u_o1', status: 'idle' },
  ];
  owners[0].drones = ['d1', 'd2', 'd5'];
  owners[1].drones = ['d3', 'd4'];

  const capLoc = [{ lng: 116.400, lat: 39.910 }, { lng: 116.390, lat: 39.905 }, { lng: 116.405, lat: 39.912 }, { lng: 116.395, lat: 39.900 }];
  const capacity: CapacityUnit[] = [
    { id: 'cap1', pilotId: 'u_p1', droneId: 'd1', ownerId: 'u_o1', location: capLoc[0], status: CapacityStatus.Online },
    { id: 'cap2', pilotId: 'u_p2', droneId: 'd2', ownerId: 'u_o1', location: capLoc[1], status: CapacityStatus.Online },
    { id: 'cap3', pilotId: 'u_p3', droneId: 'd3', ownerId: 'u_o2', location: capLoc[2], status: CapacityStatus.Online },
    { id: 'cap4', pilotId: 'u_p1', droneId: 'd4', ownerId: 'u_o2', location: capLoc[3], status: CapacityStatus.Online },
  ];

  return { users, userRoleProfiles, authSessions: [], smsCodes: [], pilots, owners, clients, drones, capacity, orders: [], paymentOrders: [], credits: [], policies: [], claims: [], airspace: [], telemetry: [], reviews: [], wallets: buildSeedWallets(), ledger: buildSeedLedger(), notifications: [], authApplications: buildSeedCertQueue(), auditLogs: [], _seededAt: now };
}
