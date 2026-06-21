package app

import "testing"

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
