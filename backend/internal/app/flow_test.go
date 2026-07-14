package app

import (
	"strings"
	"testing"
	"time"
)

func TestAirspaceRequiresAdminDecisionBeforePreparing(t *testing.T) {
	state := buildSeed()
	order, err := submitOrder(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoNormal,
		WeightKg:   20,
		ValueCent:  600000,
		BudgetCent: 300000,
		Insured:    true,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498, Address: "普君新城华府2期 · 同济东路41号"},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296, Address: "岭南天地东门临停点"},
	})
	if err != nil {
		t.Fatalf("submitOrder failed: %v", err)
	}
	candidates, err := candidatesForOrder(&state, order.ID, "global")
	if err != nil {
		t.Fatalf("candidatesForOrder failed: %v", err)
	}
	if len(candidates) == 0 {
		t.Fatal("expected at least one candidate")
	}
	confirmed, err := confirmOrder(&state, order.ID, candidates[0].CapacityID)
	if err != nil {
		t.Fatalf("confirmOrder failed: %v", err)
	}
	airspace, err := advanceOrder(&state, confirmed.ID)
	if err != nil {
		t.Fatalf("advance to airspace failed: %v", err)
	}
	if airspace.Status != StatusAirspaceApplying {
		t.Fatalf("expected airspace status, got %s", airspace.Status)
	}
	if got := airspace.Events[len(airspace.Events)-1]; got.Actor != RolePilot || got.Note != "提交空域申请" {
		t.Fatalf("expected pilot airspace submission event, got %#v", got)
	}
	if req := firstAirspace(&state, airspace.ID); req == nil || req.Status != "submitted" {
		t.Fatalf("expected submitted airspace request, got %#v", req)
	}
	if _, err := advanceOrder(&state, airspace.ID); err == nil || err.Error() != "空域尚未审批" {
		t.Fatalf("expected pending approval error, got %v", err)
	}
	if _, _, err := decideAirspace(&state, airspace.ID, "approved"); err != nil {
		t.Fatalf("decideAirspace failed: %v", err)
	}
	airspace = findOrder(&state, airspace.ID)
	if got := airspace.Events[len(airspace.Events)-1]; got.Actor != RoleAdmin || got.Note != "空域审批通过" {
		t.Fatalf("expected admin airspace approval event, got %#v", got)
	}
	preparing, err := advanceOrder(&state, airspace.ID)
	if err != nil {
		t.Fatalf("advance after approval failed: %v", err)
	}
	if preparing.Status != StatusPreparing {
		t.Fatalf("expected preparing after approval, got %s", preparing.Status)
	}
}

func TestCandidatesFilterQualificationAndConfirmRejectsStaleCapacity(t *testing.T) {
	state := buildSeed()
	for i := range state.Pilots {
		if state.Pilots[i].UserID == "u_p1" {
			state.Pilots[i].NoCrimeProof = AuditRejected
		}
	}
	for i := range state.Owners {
		if state.Owners[i].UserID == "u_o1" {
			state.Owners[i].UOMVerified = false
		}
	}
	order, err := submitOrder(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoNormal,
		WeightKg:   8,
		ValueCent:  300000,
		BudgetCent: 300000,
		Insured:    true,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498, Address: "普君新城华府2期 · 同济东路41号"},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296, Address: "岭南天地东门临停点"},
	})
	if err != nil {
		t.Fatalf("submitOrder failed: %v", err)
	}
	candidates, err := candidatesForOrder(&state, order.ID, "global")
	if err != nil {
		t.Fatalf("candidatesForOrder failed: %v", err)
	}
	if len(candidates) == 0 {
		t.Fatal("expected at least one compliant candidate")
	}
	for _, candidate := range candidates {
		if candidate.PilotID == "u_p1" {
			t.Fatalf("rejected pilot leaked into candidates: %#v", candidate)
		}
		if capacity := findCapacity(&state, candidate.CapacityID); capacity != nil && capacity.OwnerID == "u_o1" {
			t.Fatalf("unverified owner leaked into candidates: %#v", candidate)
		}
	}
	if _, err := confirmOrder(&state, order.ID, "cap1"); err == nil || err.Error() != "所选运力已不满足合规条件，请重新匹配" {
		t.Fatalf("expected stale capacity rejection, got %v", err)
	}
}

func TestConfirmOrderRequiresPaidPaymentWhenEnabled(t *testing.T) {
	state := buildSeed()
	order, err := submitOrder(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoNormal,
		WeightKg:   8,
		ValueCent:  300000,
		BudgetCent: 300000,
		Insured:    false,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498, Address: "普君新城华府2期 · 同济东路41号"},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296, Address: "岭南天地东门临停点"},
	})
	if err != nil {
		t.Fatalf("submitOrder failed: %v", err)
	}
	candidates, err := candidatesForOrder(&state, order.ID, "global")
	if err != nil || len(candidates) == 0 {
		t.Fatalf("expected candidates, got %d / %v", len(candidates), err)
	}
	candidate := candidates[0]
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_pending", OrderID: order.ID, AmountCent: candidate.QuoteCent, Mode: "escrow",
		Status: PaymentPending, Provider: "wxpay", ProviderTradeNo: "wx_trade_1", CreatedAt: nowISO(), UpdatedAt: nowISO(),
	})
	if _, err := confirmOrderWithPayment(&state, order.ID, candidate.CapacityID, "pay_pending", true, false); err == nil || err.Error() != "支付尚未完成，不能确认运力" {
		t.Fatalf("expected pending payment rejection, got %v", err)
	}
	state.PaymentOrders[0].Status = PaymentPaid
	confirmed, err := confirmOrderWithPayment(&state, order.ID, candidate.CapacityID, "pay_pending", true, false)
	if err != nil {
		t.Fatalf("confirm with paid payment failed: %v", err)
	}
	if confirmed.Status != StatusConfirmed || confirmed.PaymentID != "pay_pending" {
		t.Fatalf("expected confirmed paid order, got %#v", confirmed)
	}
}

func TestConfirmOrderBlocksFailedOrCancelledPayment(t *testing.T) {
	for _, status := range []PaymentStatus{PaymentFailed, PaymentCancelled} {
		state := buildSeed()
		order, err := submitOrder(&state, submitOrderRequest{
			ClientID:   "u_c1",
			CargoType:  CargoNormal,
			WeightKg:   8,
			ValueCent:  300000,
			BudgetCent: 300000,
			ShockProof: true,
			From:       GeoPoint{Lng: 113.125213, Lat: 23.020498},
			To:         GeoPoint{Lng: 113.13288, Lat: 23.02296},
		})
		if err != nil {
			t.Fatalf("submitOrder failed: %v", err)
		}
		candidates, _ := candidatesForOrder(&state, order.ID, "global")
		state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
			ID: "pay_bad", OrderID: order.ID, AmountCent: candidates[0].QuoteCent, Mode: "escrow",
			Status: status, Provider: "wxpay", ProviderTradeNo: "wx_trade_bad", CreatedAt: nowISO(), UpdatedAt: nowISO(),
		})
		if _, err := confirmOrderWithPayment(&state, order.ID, candidates[0].CapacityID, "pay_bad", true, false); err == nil {
			t.Fatalf("expected %s payment rejection", status)
		}
	}
}

func TestConfirmOrderRejectsPaymentBoundToAnotherCapacity(t *testing.T) {
	state := buildSeed()
	order, err := submitOrder(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoNormal,
		WeightKg:   8,
		ValueCent:  300000,
		BudgetCent: 300000,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296},
	})
	if err != nil {
		t.Fatalf("submitOrder failed: %v", err)
	}
	candidates, err := candidatesForOrder(&state, order.ID, "global")
	if err != nil || len(candidates) == 0 {
		t.Fatalf("expected candidates, got %d / %v", len(candidates), err)
	}
	candidate := candidates[0]
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_wrong_capacity", OrderID: order.ID, CapacityID: "cap_other", AmountCent: candidate.QuoteCent, Mode: "escrow",
		Status: PaymentPaid, Provider: "wxpay", ProviderTradeNo: "wx_trade_other", CreatedAt: nowISO(), UpdatedAt: nowISO(),
	})
	if _, err := confirmOrderWithPayment(&state, order.ID, candidate.CapacityID, "pay_wrong_capacity", true, false); err == nil || err.Error() != "支付单绑定的运力与当前选择不一致" {
		t.Fatalf("expected capacity binding rejection, got %v", err)
	}
}

func TestConfirmOrderRequiresProviderInsuranceReceiptWhenEnabled(t *testing.T) {
	state := buildSeed()
	order, err := submitOrder(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoValuable,
		WeightKg:   8,
		ValueCent:  300000,
		BudgetCent: 300000,
		Insured:    true,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296},
	})
	if err != nil {
		t.Fatalf("submitOrder failed: %v", err)
	}
	candidates, _ := candidatesForOrder(&state, order.ID, "global")
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_paid", OrderID: order.ID, AmountCent: candidates[0].QuoteCent, Mode: "escrow",
		Status: PaymentPaid, Provider: "wxpay", ProviderTradeNo: "wx_trade_paid", CreatedAt: nowISO(), UpdatedAt: nowISO(),
	})
	if _, err := confirmOrderWithPayment(&state, order.ID, candidates[0].CapacityID, "pay_paid", true, true); err == nil || err.Error() != "保险供应商保单回执缺失，不能确认订单" {
		t.Fatalf("expected missing provider policy rejection, got %v", err)
	}
	state.Policies = append(state.Policies, InsurancePolicy{
		ID: "pol_provider", OrderID: order.ID, CargoType: order.Cargo.Type, Coverages: []string{"货物险"},
		InsuredAmountCent: 600000, PremiumCent: 3000, Status: "active", Provider: "real-insurer", ProviderPolicyNo: "P20260628001",
	})
	confirmed, err := confirmOrderWithPayment(&state, order.ID, candidates[0].CapacityID, "pay_paid", true, true)
	if err != nil {
		t.Fatalf("confirm with provider policy failed: %v", err)
	}
	if confirmed.PolicyID != "pol_provider" {
		t.Fatalf("expected provider policy, got %s", confirmed.PolicyID)
	}
}

func TestProductionMatchingDoesNotCreateDemoCapacity(t *testing.T) {
	state := buildSeed()
	order, err := submitOrderWithOptions(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoNormal,
		WeightKg:   8,
		ValueCent:  300000,
		BudgetCent: 300000,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296},
	}, false)
	if err != nil {
		t.Fatalf("submitOrderWithOptions failed: %v", err)
	}
	for _, unit := range state.Capacity {
		if unit.Location.Address != "" {
			t.Fatalf("production submit moved demo capacity: %#v", unit)
		}
	}
	candidates, err := candidatesForOrderWithOptions(&state, order.ID, "global", false)
	if err != nil {
		t.Fatalf("candidatesForOrderWithOptions failed: %v", err)
	}
	if len(candidates) != 0 {
		t.Fatalf("expected no production candidates without real nearby capacity, got %#v", candidates)
	}
}

func TestProductionOrderRejectsImplicitDemoOrigin(t *testing.T) {
	state := buildSeed()
	_, err := submitOrderWithOptions(&state, submitOrderRequest{
		ClientID: "u_c1", CargoType: CargoNormal, WeightKg: 5, ValueCent: 100000, BudgetCent: 200000,
		To: GeoPoint{Lng: 116.42, Lat: 39.92},
	}, false)
	if err == nil || !strings.Contains(err.Error(), "起点") {
		t.Fatalf("expected explicit production origin, got %v", err)
	}
}

func TestProductionMatchingRequiresCurrentProviderCredit(t *testing.T) {
	state := buildSeed()
	order, err := submitOrderWithOptions(&state, submitOrderRequest{
		ClientID: "u_c1", CargoType: CargoNormal, WeightKg: 5, ValueCent: 100000, BudgetCent: 300000,
		From: GeoPoint{Lng: 116.4, Lat: 39.91}, To: GeoPoint{Lng: 116.42, Lat: 39.92},
	}, false)
	if err != nil {
		t.Fatalf("submit order: %v", err)
	}
	items, err := candidatesForOrderWithOptions(&state, order.ID, "global", false)
	if err != nil || len(items) != 0 {
		t.Fatalf("production must reject candidates without provider credit: %#v / %v", items, err)
	}
	state.Credits = append(state.Credits,
		CreditScore{UserID: "u_p1", Role: RolePilot, Total: 860, Provider: "credit", ProviderTraceID: "p1", AuthorizedAt: nowISO(), ExpiresAt: time.Now().Add(time.Hour).Format(time.RFC3339Nano)},
		CreditScore{UserID: "u_o1", Role: RoleOwner, Total: 840, Provider: "credit", ProviderTraceID: "o1", AuthorizedAt: nowISO(), ExpiresAt: time.Now().Add(time.Hour).Format(time.RFC3339Nano)},
	)
	items, err = candidatesForOrderWithOptions(&state, order.ID, "global", false)
	if err != nil || len(items) == 0 {
		t.Fatalf("expected credited production candidate: %#v / %v", items, err)
	}
	if items[0].CreditScore != 840 {
		t.Fatalf("expected conservative pilot/owner credit, got %d", items[0].CreditScore)
	}
}

func TestUnloadingRequiresDestinationTelemetry(t *testing.T) {
	state := buildSeed()
	order, err := submitOrder(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoNormal,
		WeightKg:   20,
		ValueCent:  600000,
		BudgetCent: 300000,
		Insured:    true,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498, Address: "普君新城华府2期 · 同济东路41号"},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296, Address: "岭南天地东门临停点"},
	})
	if err != nil {
		t.Fatalf("submitOrder failed: %v", err)
	}
	candidates, err := candidatesForOrder(&state, order.ID, "global")
	if err != nil || len(candidates) == 0 {
		t.Fatalf("expected candidates, got %d / %v", len(candidates), err)
	}
	order, err = confirmOrder(&state, order.ID, candidates[0].CapacityID)
	if err != nil {
		t.Fatalf("confirmOrder failed: %v", err)
	}
	order, err = advanceOrder(&state, order.ID)
	if err != nil {
		t.Fatalf("advance to airspace failed: %v", err)
	}
	if _, _, err := decideAirspace(&state, order.ID, "approved"); err != nil {
		t.Fatalf("decideAirspace failed: %v", err)
	}
	for _, want := range []OrderStatus{StatusPreparing, StatusLoading, StatusInFlight} {
		order, err = advanceOrder(&state, order.ID)
		if err != nil {
			t.Fatalf("advance to %s failed: %v", want, err)
		}
		if order.Status != want {
			t.Fatalf("expected %s, got %s", want, order.Status)
		}
	}

	if _, err := advanceOrder(&state, order.ID); err == nil || err.Error() != "尚未收到飞行遥测，无法确认卸货" {
		t.Fatalf("expected telemetry missing error, got %v", err)
	}
	upsertTelemetry(&state, order.ID, Telemetry{TS: nowISO(), Pos: order.From, AltM: 30, SpeedMS: 10, BatteryPct: 50, Heading: 0, SwingDeg: 5}, "pilot")
	if _, err := advanceOrder(&state, order.ID); err == nil || err.Error() != "尚未到达卸货点，进入200m围栏后才能确认卸货" {
		t.Fatalf("expected destination gate error, got %v", err)
	}
	upsertTelemetry(&state, order.ID, Telemetry{TS: nowISO(), Pos: order.To, AltM: 5, SpeedMS: 1, BatteryPct: 42, Heading: 0, SwingDeg: 2}, "pilot")
	order, err = advanceOrder(&state, order.ID)
	if err != nil {
		t.Fatalf("advance to unloading failed: %v", err)
	}
	if order.Status != StatusUnloading {
		t.Fatalf("expected unloading, got %s", order.Status)
	}
}

func TestProductionDeliveryRejectsDroneArmSnapshot(t *testing.T) {
	state := buildSeed()
	order := &Order{ID: "o_arm_only", To: GeoPoint{Lng: 116.42, Lat: 39.92}}
	state.Orders = append(state.Orders, *order)
	snapshot := upsertTelemetry(&state, order.ID, Telemetry{TS: nowISO(), Pos: order.To, BatteryPct: 80}, "device-arm")
	snapshot.Provider = "drone-provider"
	snapshot.DeviceSN = "SN-1"
	if err := ensureDestinationReached(&state, order, true); err == nil {
		t.Fatal("drone arm snapshot must not be accepted as delivery telemetry")
	}
}

func TestProductionUnloadingRequiresProviderDeviceTelemetry(t *testing.T) {
	state := buildSeed()
	order, err := submitOrder(&state, submitOrderRequest{
		ClientID:   "u_c1",
		CargoType:  CargoNormal,
		WeightKg:   20,
		ValueCent:  600000,
		BudgetCent: 300000,
		Insured:    true,
		ShockProof: true,
		From:       GeoPoint{Lng: 113.125213, Lat: 23.020498},
		To:         GeoPoint{Lng: 113.13288, Lat: 23.02296},
	})
	if err != nil {
		t.Fatalf("submitOrder failed: %v", err)
	}
	candidates, err := candidatesForOrder(&state, order.ID, "global")
	if err != nil || len(candidates) == 0 {
		t.Fatalf("expected candidates, got %d / %v", len(candidates), err)
	}
	order, err = confirmOrder(&state, order.ID, candidates[0].CapacityID)
	if err != nil {
		t.Fatalf("confirmOrder failed: %v", err)
	}
	order, err = advanceOrder(&state, order.ID)
	if err != nil {
		t.Fatalf("advance to airspace failed: %v", err)
	}
	if _, _, err := decideAirspace(&state, order.ID, "approved"); err != nil {
		t.Fatalf("decideAirspace failed: %v", err)
	}
	for _, want := range []OrderStatus{StatusPreparing, StatusLoading, StatusInFlight} {
		order, err = advanceOrder(&state, order.ID)
		if err != nil {
			t.Fatalf("advance to %s failed: %v", want, err)
		}
	}
	upsertTelemetry(&state, order.ID, Telemetry{TS: nowISO(), Pos: order.To, AltM: 5, SpeedMS: 1, BatteryPct: 42, Heading: 0, SwingDeg: 2}, "pilot")
	if _, err := advanceOrderWithOptions(&state, order.ID, true); err == nil || err.Error() != "请等待设备飞行数据同步后再确认卸货" {
		t.Fatalf("expected production telemetry source rejection, got %v", err)
	}
	snapshot := upsertTelemetry(&state, order.ID, Telemetry{TS: nowISO(), Pos: order.To, AltM: 5, SpeedMS: 1, BatteryPct: 42, Heading: 0, SwingDeg: 2}, "device")
	snapshot.Provider = "drone-sdk"
	snapshot.DeviceSN = "SN-D1"
	order, err = advanceOrderWithOptions(&state, order.ID, true)
	if err != nil {
		t.Fatalf("provider device telemetry should pass: %v", err)
	}
	if order.Status != StatusUnloading {
		t.Fatalf("expected unloading, got %s", order.Status)
	}
}

func TestCertificationSubmissionAndApprovalUseSharedState(t *testing.T) {
	state := buildSeed()

	app, err := submitCertification(&state, RoleClient, "u_c1", map[string]any{
		"realName":         "张建国",
		"idNo":             "110105********1234",
		"cargoDeclaration": []string{"normal"},
		"creditConsent":    "已授权",
		"insuranceAmount":  5000000,
		"trainingCerts":    []string{"应急处置"},
	})
	if err != nil {
		t.Fatalf("submitCertification failed: %v", err)
	}
	if app.Status != AuditPending {
		t.Fatalf("expected pending certification, got %s", app.Status)
	}
	if found := findCertification(&state, app.ID); found == nil || found.UserID != "u_c1" {
		t.Fatalf("expected certification in shared state, got %#v", found)
	}
	if user := findUser(&state, "u_c1"); user == nil || user.RealNameVerified {
		t.Fatalf("expected client verification to become pending, got %#v", user)
	}

	approved, err := approveCertification(&state, app.ID)
	if err != nil {
		t.Fatalf("approveCertification failed: %v", err)
	}
	if approved.Status != AuditApproved || approved.ReviewedAt == "" {
		t.Fatalf("expected approved certification with review time, got %#v", approved)
	}
	if user := findUser(&state, "u_c1"); user == nil || !user.RealNameVerified {
		t.Fatalf("expected client verification to become approved, got %#v", user)
	}
}

func TestPhoneRegistrationLoginAndRoleActivation(t *testing.T) {
	state := buildSeed()

	code, err := issueSMSCode(&state, "13812345678")
	if err != nil {
		t.Fatalf("issueSMSCode failed: %v", err)
	}
	if stored := latestSMSCode(&state, "13812345678"); stored == nil || stored.Code == code.Code {
		t.Fatal("raw SMS code must not be stored")
	}
	registered, err := registerWithCode(&state, "13812345678", code.Code, "新飞手", RolePilot)
	if err != nil {
		t.Fatalf("registerWithCode failed: %v", err)
	}
	if registered.Token.AccessToken == "" || registered.Token.RefreshToken == "" {
		t.Fatalf("expected token pair, got %#v", registered.Token)
	}
	if len(state.AuthSessions) == 0 || state.AuthSessions[len(state.AuthSessions)-1].AccessToken == registered.Token.AccessToken || state.AuthSessions[len(state.AuthSessions)-1].RefreshToken == registered.Token.RefreshToken {
		t.Fatal("raw auth tokens must not be stored")
	}
	if got := findRoleProfile(&state, registered.User.ID, RolePilot); got == nil || got.Status != RoleProfilePending {
		t.Fatalf("expected pending pilot role, got %#v", got)
	}
	if pilotCanOperate(&state, findPilot(&state, registered.User.ID)) {
		t.Fatal("pending pilot should not be operational")
	}

	app, err := submitCertification(&state, RolePilot, registered.User.ID, map[string]any{
		"realName":      "新飞手",
		"caacLevel":     "VLOS",
		"noCrimeProof":  "无犯罪记录证明",
		"healthProof":   "体检报告",
		"trainingCerts": []string{"应急处置"},
	})
	if err != nil {
		t.Fatalf("submitCertification failed: %v", err)
	}
	if _, err := approveCertification(&state, app.ID); err != nil {
		t.Fatalf("approveCertification failed: %v", err)
	}
	if got := findRoleProfile(&state, registered.User.ID, RolePilot); got == nil || got.Status != RoleProfileActive {
		t.Fatalf("expected active pilot role, got %#v", got)
	}
	if !pilotCanOperate(&state, findPilot(&state, registered.User.ID)) {
		t.Fatal("approved pilot should be operational")
	}

	loginCode, err := issueSMSCode(&state, "13812345678")
	if err != nil {
		t.Fatalf("issue login code failed: %v", err)
	}
	login, err := loginWithCode(&state, "13812345678", loginCode.Code)
	if err != nil {
		t.Fatalf("loginWithCode failed: %v", err)
	}
	if login.User.ID != registered.User.ID {
		t.Fatalf("expected same user login, got %s / %s", login.User.ID, registered.User.ID)
	}
	me, err := authMe(&state, login.Token.AccessToken)
	if err != nil {
		t.Fatalf("authMe failed: %v", err)
	}
	if me.Token.AccessToken != "" || me.Token.RefreshToken != "" {
		t.Fatal("authMe must not return stored token hashes")
	}
	refreshed, err := refreshAuthSession(&state, login.Token.RefreshToken)
	if err != nil {
		t.Fatalf("refreshAuthSession failed: %v", err)
	}
	if refreshed.Token.AccessToken == "" || refreshed.Token.AccessToken == login.Token.AccessToken || refreshed.Token.RefreshToken == login.Token.RefreshToken {
		t.Fatalf("expected rotated access token, got %#v -> %#v", login.Token, refreshed.Token)
	}
	if _, err := refreshAuthSession(&state, login.Token.RefreshToken); err == nil {
		t.Fatal("rotated refresh token must not be reusable")
	}
}

func TestPendingRoleCannotSwitchUntilApproved(t *testing.T) {
	state := buildSeed()
	code, err := issueSMSCode(&state, "13822345678")
	if err != nil {
		t.Fatalf("issueSMSCode failed: %v", err)
	}
	registered, err := registerWithCode(&state, "13822345678", code.Code, "多身份业主", RoleClient)
	if err != nil {
		t.Fatalf("registerWithCode failed: %v", err)
	}
	if _, err := requestUserRole(&state, registered.User.ID, RoleOwner); err != nil {
		t.Fatalf("requestUserRole failed: %v", err)
	}
	if _, err := switchUserRole(&state, registered.User.ID, RoleOwner); err == nil || err.Error() != "该身份尚未激活，不能切换" {
		t.Fatalf("expected pending switch rejection, got %v", err)
	}
	app, err := submitCertification(&state, RoleOwner, registered.User.ID, map[string]any{
		"realName":        "多身份业主",
		"droneModel":      "合规吊运机 A30",
		"droneSn":         "SN-AUTH-OWNER",
		"insuranceAmount": 8_000_000,
		"maxPayloadKg":    30,
		"maintenance":     "月度例检正常",
	})
	if err != nil {
		t.Fatalf("submit owner certification failed: %v", err)
	}
	if _, err := approveCertification(&state, app.ID); err != nil {
		t.Fatalf("approve owner certification failed: %v", err)
	}
	switched, err := switchUserRole(&state, registered.User.ID, RoleOwner)
	if err != nil {
		t.Fatalf("switchUserRole after approval failed: %v", err)
	}
	if switched.User.CurrentRole != RoleOwner {
		t.Fatalf("expected owner role after switch, got %#v", switched.User)
	}
	if _, _, err := authUserByAccessToken(&state, registered.Token.AccessToken); err == nil {
		t.Fatal("role switch must revoke the previous session")
	}
	if switched.Token.AccessToken == "" || switched.Token.RefreshToken == "" {
		t.Fatal("role switch must issue a fresh token pair")
	}
}

func TestAuthSessionsAreBoundedPerUser(t *testing.T) {
	state := buildSeed()
	user := findUser(&state, "u_c1")
	for i := 0; i < maxUserSessions+3; i++ {
		payload := createAuthPayload(&state, user, false)
		if payload.Token.AccessToken == "" {
			t.Fatal("expected access token")
		}
	}
	count := 0
	for _, session := range state.AuthSessions {
		if session.UserID == user.ID {
			count++
		}
	}
	if count != maxUserSessions {
		t.Fatalf("expected %d sessions, got %d", maxUserSessions, count)
	}
}
