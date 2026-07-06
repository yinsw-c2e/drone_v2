package app

import (
	"fmt"
	"time"
)

func buildSeed() DBShape {
	future := "2031-12-31T00:00:00.000Z"
	ago := func(d time.Duration) string { return time.Now().Add(-d).Format(time.RFC3339Nano) }
	now := nowISO()

	users := []User{
		{ID: "u_p1", Phone: "13800000001", Nickname: "飞手1", Roles: []Role{RolePilot}, CurrentRole: RolePilot, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
		{ID: "u_p2", Phone: "13800000002", Nickname: "飞手2", Roles: []Role{RolePilot}, CurrentRole: RolePilot, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
		{ID: "u_p3", Phone: "13800000003", Nickname: "飞手3", Roles: []Role{RolePilot}, CurrentRole: RolePilot, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
		{ID: "u_o1", Phone: "13800000004", Nickname: "机主1", Roles: []Role{RoleOwner}, CurrentRole: RoleOwner, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
		{ID: "u_o2", Phone: "13800000005", Nickname: "机主2", Roles: []Role{RoleOwner}, CurrentRole: RoleOwner, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
		{ID: "u_c1", Phone: "13800000006", Nickname: "业主1", Roles: []Role{RoleClient}, CurrentRole: RoleClient, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
		{ID: "u_c2", Phone: "13800000007", Nickname: "业主2", Roles: []Role{RoleClient}, CurrentRole: RoleClient, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
		{ID: "u_admin", Phone: "13900000000", Nickname: "运营管理员", Roles: []Role{RoleAdmin}, CurrentRole: RoleAdmin, AuthStatus: string(AuditApproved), RealNameVerified: true, CreatedAt: now},
	}
	roleProfiles := make([]UserRoleProfile, 0, len(users))
	for _, user := range users {
		for _, role := range user.Roles {
			roleProfiles = append(roleProfiles, UserRoleProfile{ID: roleProfileID(user.ID, role), UserID: user.ID, Role: role, Status: RoleProfileActive, CreatedAt: now, UpdatedAt: now})
		}
	}
	stats := PilotStats{Orders: 120, Completed: 114, Cancelled: 6, OnTimeRate: .94, ComplaintRate: .03, AccidentRate: 0, Violation: 0, FlightHours: 600, OnlineHours: 320, AvgRespSec: 18, AvgStar: 4.7}
	pilots := []PilotProfile{
		{UserID: "u_p1", CAACLevel: "BVLOS", CAACExpire: future, NoCrimeProof: AuditApproved, HealthProof: AuditApproved, TrainingCerts: []string{"应急处置"}, Online: true, Location: GeoPoint{Lng: 116.400, Lat: 39.910}, Stats: stats},
		{UserID: "u_p2", CAACLevel: "VLOS", CAACExpire: future, NoCrimeProof: AuditApproved, HealthProof: AuditApproved, TrainingCerts: []string{"应急处置"}, Online: true, Location: GeoPoint{Lng: 116.390, Lat: 39.905}, Stats: stats},
		{UserID: "u_p3", CAACLevel: "VLOS", CAACExpire: future, NoCrimeProof: AuditApproved, HealthProof: AuditApproved, TrainingCerts: []string{"应急处置"}, Online: true, Location: GeoPoint{Lng: 116.405, Lat: 39.912}, Stats: stats},
	}
	ownerStats := map[string]any{"deviceUptime": .95, "faultRate": .02, "maintainTimely": .9, "completeRate": .93, "cancelRate": .05, "respSec": 40, "cooperation": .9}
	clientStats := map[string]any{"payTimely": .97, "defaultCount": 0, "infoTrust": .9, "complaintRate": .02, "orderAccuracy": .95, "cancelRate": .04}
	owners := []OwnerProfile{
		{UserID: "u_o1", EntityType: "company", Drones: []string{"d1", "d2", "d5"}, UOMVerified: true, Stats: ownerStats},
		{UserID: "u_o2", EntityType: "company", Drones: []string{"d3", "d4"}, UOMVerified: true, Stats: ownerStats},
	}
	clients := []ClientProfile{
		{UserID: "u_c1", EntityType: "person", CreditBureauScore: 720, Stats: clientStats},
		{UserID: "u_c2", EntityType: "person", CreditBureauScore: 720, Stats: clientStats},
	}
	ins := func(amount int) DroneInsurance {
		return DroneInsurance{Hull: true, ThirdParty: true, ThirdPartyAmount: amount}
	}
	drones := []Drone{
		{ID: "d1", Brand: "DJI", Model: "FlyCart 30", SN: "SN-D1", MaxPayloadKg: 30, Airworthiness: AuditApproved, Insured: ins(8_000_000), MaintenanceLog: []MaintenanceLog{{Date: "2026-05-01", Note: "例检"}}, OwnerID: "u_o1", Status: "idle"},
		{ID: "d2", Brand: "XAG", Model: "P100", SN: "SN-D2", MaxPayloadKg: 20, Airworthiness: AuditApproved, Insured: ins(6_000_000), MaintenanceLog: []MaintenanceLog{}, OwnerID: "u_o1", Status: "idle"},
		{ID: "d3", Brand: "EHang", Model: "EH-216", SN: "SN-D3", MaxPayloadKg: 15, Airworthiness: AuditApproved, Insured: ins(5_000_000), MaintenanceLog: []MaintenanceLog{}, OwnerID: "u_o2", Status: "idle"},
		{ID: "d4", Brand: "Autel", Model: "Dragonfish", SN: "SN-D4", MaxPayloadKg: 10, Airworthiness: AuditApproved, Insured: ins(5_000_000), MaintenanceLog: []MaintenanceLog{}, OwnerID: "u_o2", Status: "idle"},
		{ID: "d5", Brand: "Other", Model: "低保额轻载机 A8", SN: "SN-D5", MaxPayloadKg: 8, Airworthiness: AuditApproved, Insured: ins(1_000_000), MaintenanceLog: []MaintenanceLog{}, OwnerID: "u_o1", Status: "idle"},
	}
	capacity := []CapacityUnit{
		{ID: "cap1", PilotID: "u_p1", DroneID: "d1", OwnerID: "u_o1", Location: GeoPoint{Lng: 116.400, Lat: 39.910}, Status: CapacityOnline},
		{ID: "cap2", PilotID: "u_p2", DroneID: "d2", OwnerID: "u_o1", Location: GeoPoint{Lng: 116.390, Lat: 39.905}, Status: CapacityOnline},
		{ID: "cap3", PilotID: "u_p3", DroneID: "d3", OwnerID: "u_o2", Location: GeoPoint{Lng: 116.405, Lat: 39.912}, Status: CapacityOnline},
		{ID: "cap4", PilotID: "u_p1", DroneID: "d4", OwnerID: "u_o2", Location: GeoPoint{Lng: 116.395, Lat: 39.900}, Status: CapacityOnline},
	}
	wallets := []Wallet{
		{ID: "u_p1", UserID: "u_p1", BalanceCent: 452000, PendingCent: 128500},
		{ID: "u_o1", UserID: "u_o1", BalanceCent: 245800, PendingCent: 84500},
		{ID: "u_c1", UserID: "u_c1", BalanceCent: 260000},
		{ID: "platform", UserID: "platform"},
	}
	ledger := []LedgerEntry{
		{ID: "le_seed_p1_settle", UserID: "u_p1", OrderID: "ORD-DEMO-088", Type: LedgerSettleIn, AmountCent: 345000, Cycle: "T+1", Status: LedgerAvail, Note: "历史任务结算（演示初始数据）", CreatedAt: ago(72 * time.Hour)},
		{ID: "le_seed_p1_pending", UserID: "u_p1", OrderID: "ORD-DEMO-091", Type: LedgerSettleIn, AmountCent: 128500, Cycle: "T+1", Status: LedgerPending, Note: "历史任务结算（待释放）", CreatedAt: ago(20 * time.Hour)},
		{ID: "le_seed_o1_settle", UserID: "u_o1", OrderID: "ORD-DEMO-088", Type: LedgerSettleIn, AmountCent: 120000, Cycle: "T+7", Status: LedgerAvail, Note: "设备使用费结算（演示初始数据）", CreatedAt: ago(96 * time.Hour)},
		{ID: "le_seed_o1_pending", UserID: "u_o1", OrderID: "ORD-DEMO-091", Type: LedgerSettleIn, AmountCent: 84500, Cycle: "T+7", Status: LedgerPending, Note: "设备使用费（待释放）", CreatedAt: ago(20 * time.Hour)},
	}
	auth := []CertificationApplication{
		{ID: "cert_seed_pilot", UserID: "u_p2", Role: RolePilot, Status: AuditPending, SubmittedAt: ago(5 * time.Minute), Fields: map[string]any{"realName": "飞手2", "caacLevel": "VLOS", "noCrimeProof": "无犯罪记录证明", "healthProof": "体检报告", "trainingCerts": []string{"应急处置"}}},
		{ID: "cert_seed_owner", UserID: "u_o2", Role: RoleOwner, Status: AuditPending, SubmittedAt: ago(35 * time.Minute), Fields: map[string]any{"realName": "机主2", "droneModel": "EHang EH-216", "droneSn": "SN-D3", "insuranceAmount": 5_000_000, "maintenance": "月度例检正常"}},
		{ID: "cert_seed_client", UserID: "u_c2", Role: RoleClient, Status: AuditPending, SubmittedAt: ago(70 * time.Minute), Fields: map[string]any{"realName": "业主2", "idNo": "110105********5678", "cargoDeclaration": []string{"normal"}}},
	}

	return DBShape{
		Users: users, UserRoleProfiles: roleProfiles, AuthSessions: []AuthSession{}, SMSCodes: []SMSCode{}, Pilots: pilots, Owners: owners, Clients: clients, Drones: drones, Capacity: capacity,
		Orders: []Order{}, PaymentOrders: []PaymentOrder{}, Credits: []CreditScore{}, Policies: []InsurancePolicy{}, Claims: []Claim{}, Airspace: []AirspaceRequest{}, Telemetry: []TelemetrySnapshot{}, Reviews: []Review{},
		Wallets: wallets, Ledger: ledger, Notifications: []Notification{}, AuthApplications: auth, AuditLogs: []AuditLog{}, SeededAt: fmt.Sprintf("%s", nowISO()),
	}
}
