import { Role, AuditStatus, CapacityStatus } from '@/models';
import type { DBShape } from '@/utils/db';
import type { User, PilotProfile, OwnerProfile, ClientProfile, Drone, CapacityUnit } from '@/models';

const future = '2031-12-31T00:00:00.000Z';

export function buildSeed(): DBShape {
  const pilotIds = ['u_p1', 'u_p2', 'u_p3'];
  const ownerIds = ['u_o1', 'u_o2'];
  const clientIds = ['u_c1', 'u_c2'];

  const mkUser = (id: string, role: Role, nick: string): User => ({ id, phone: '138' + id, nickname: nick, roles: [role], currentRole: role, realNameVerified: true, blacklisted: false });
  const users: User[] = [
    ...pilotIds.map((id, i) => mkUser(id, Role.Pilot, `飞手${i + 1}`)),
    ...ownerIds.map((id, i) => mkUser(id, Role.Owner, `机主${i + 1}`)),
    ...clientIds.map((id, i) => mkUser(id, Role.Client, `业主${i + 1}`)),
  ];

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

  return { users, pilots, owners, clients, drones, capacity, orders: [], credits: [], policies: [], claims: [], airspace: [], reviews: [], wallets: [], ledger: [], notifications: [], authApplications: [], auditLogs: [], _seededAt: new Date().toISOString() };
}
