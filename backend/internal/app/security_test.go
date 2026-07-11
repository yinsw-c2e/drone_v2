package app

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
)

func TestProductionSnapshotIsNotPublic(t *testing.T) {
	req := &http.Request{Method: http.MethodGet, URL: &url.URL{Path: "/api/v1/snapshot"}}
	if isPublicRequest(req, true) {
		t.Fatal("production snapshot must not be public")
	}
}

func TestProductionSnapshotHandlerReturnsNotFoundWithoutLoadingStore(t *testing.T) {
	server := &Server{production: true}
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/snapshot", nil)
	server.snapshot(recorder, req)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}

func TestProductionResetHandlerReturnsNotFoundWithoutLoadingStore(t *testing.T) {
	server := &Server{production: true, resetEnabled: true}
	recorder := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/reset", nil)
	server.reset(recorder, req)
	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}

func TestOrderAuthorizationUsesRoleAndOwnership(t *testing.T) {
	state := buildSeed()
	state.Orders = []Order{{ID: "o_1", ClientID: "u_c1", PilotID: "u_p1", CapacityID: "cap1"}}

	client := findUser(&state, "u_c1")
	pilot := findUser(&state, "u_p1")
	other := findUser(&state, "u_c2")
	owner := findUser(&state, "u_o1")

	request := func(action string) *http.Request {
		return &http.Request{Method: http.MethodPost, URL: &url.URL{Path: "/api/v1/orders/o_1/" + action}}
	}
	if err := authorizeRoute(&state, client, request("confirm")); err != nil {
		t.Fatalf("owning client should confirm: %v", err)
	}
	if err := authorizeRoute(&state, pilot, request("advance")); err != nil {
		t.Fatalf("assigned pilot should advance: %v", err)
	}
	if err := authorizeRoute(&state, owner, request("telemetry")); err != nil {
		t.Fatalf("related owner should read telemetry: %v", err)
	}
	if err := authorizeRoute(&state, other, request("confirm")); err == nil {
		t.Fatal("another client must not access the order")
	}
}

func TestCertificationReviewRequiresAdmin(t *testing.T) {
	state := buildSeed()
	client := findUser(&state, "u_c1")
	admin := findUser(&state, "u_admin")
	req := &http.Request{Method: http.MethodPost, URL: &url.URL{Path: "/api/v1/certifications/cert_1/approve"}}
	if err := authorizeRoute(&state, client, req); err == nil {
		t.Fatal("client must not review certifications")
	}
	if err := authorizeRoute(&state, admin, req); err != nil {
		t.Fatalf("admin should review certifications: %v", err)
	}
}

func TestSnapshotForUserMasksPhonesAndScopesSensitiveCollections(t *testing.T) {
	state := buildSeed()
	state.Orders = []Order{{ID: "o_own", ClientID: "u_c1"}, {ID: "o_other", ClientID: "u_c2"}}
	state.Wallets = append(state.Wallets, Wallet{ID: "u_c2", UserID: "u_c2", BalanceCent: 999999})
	state.AuthApplications = append(state.AuthApplications, CertificationApplication{ID: "cert_other", UserID: "u_c2", Role: RoleClient})
	client := findUser(&state, "u_c1")

	snapshot := snapshotForUser(&state, client)
	if len(snapshot.Orders) != 1 || snapshot.Orders[0].ID != "o_own" {
		t.Fatalf("unexpected client orders: %#v", snapshot.Orders)
	}
	for _, item := range snapshot.Users {
		if item.ID != client.ID && item.Phone != "" {
			t.Fatalf("another user's phone leaked: %s", item.ID)
		}
	}
	for _, wallet := range snapshot.Wallets {
		if wallet.UserID != client.ID {
			t.Fatalf("another wallet leaked: %s", wallet.UserID)
		}
	}
	for _, application := range snapshot.AuthApplications {
		if application.UserID != client.ID {
			t.Fatalf("another certification leaked: %s", application.ID)
		}
	}
}

func TestSMSIPRateLimit(t *testing.T) {
	server := &Server{smsIPAttempts: map[string][]time.Time{}}
	for i := 0; i < 20; i++ {
		if !server.allowSMSRequest("203.0.113.8") {
			t.Fatalf("request %d should be allowed", i+1)
		}
	}
	if server.allowSMSRequest("203.0.113.8") {
		t.Fatal("21st request in an hour must be blocked")
	}
}
