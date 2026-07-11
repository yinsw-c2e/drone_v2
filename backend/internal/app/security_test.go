package app

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
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
	state.Credits = append(state.Credits, CreditScore{UserID: "u_p1", Role: RolePilot, Total: 800, Level: "B", Dimensions: []CreditDimension{{Name: "secret", Score: 1, Max: 1}}, ProviderTraceID: "trace-secret"})
	client := findUser(&state, "u_c1")

	snapshot := snapshotForUser(&state, client)
	if len(snapshot.Orders) != 1 || snapshot.Orders[0].ID != "o_own" {
		t.Fatalf("unexpected client orders: %#v", snapshot.Orders)
	}
	for _, item := range snapshot.Users {
		if item.ID != client.ID && item.Phone != "" {
			t.Fatalf("another user's phone leaked: %s", item.ID)
		}
		if item.ID != client.ID && (item.CreatedAt != "" || item.Blacklisted || item.Disabled) {
			t.Fatalf("another user's internal state leaked: %#v", item)
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
	for _, pilot := range snapshot.Pilots {
		if pilot.UserID != client.ID && (pilot.Location.Lng != 0 || len(pilot.TrainingCerts) != 0) {
			t.Fatalf("pilot private profile leaked: %#v", pilot)
		}
	}
	for _, drone := range snapshot.Drones {
		if drone.OwnerID != client.ID && (!strings.HasPrefix(drone.SN, "****") || len(drone.MaintenanceLog) != 0) {
			t.Fatalf("drone private data leaked: %#v", drone)
		}
	}
	for _, capacity := range snapshot.Capacity {
		if capacity.OwnerID != client.ID && capacity.PilotID != client.ID && (capacity.Location.Lng != 0 || capacity.Location.Lat != 0) {
			t.Fatalf("capacity location leaked: %#v", capacity)
		}
	}
	for _, credit := range snapshot.Credits {
		if credit.UserID != client.ID && (len(credit.Dimensions) != 0 || credit.ProviderTraceID != "") {
			t.Fatalf("credit trace leaked: %#v", credit)
		}
	}
}

func TestRevokedRoleCannotKeepOrderAccess(t *testing.T) {
	state := buildSeed()
	state.Orders = []Order{{ID: "o_revoked", ClientID: "u_c1", PilotID: "u_p1"}}
	client := findUser(&state, "u_c1")
	profile := findRoleProfile(&state, client.ID, RoleClient)
	profile.Status = RoleProfileRejected
	req := &http.Request{Method: http.MethodGet, URL: &url.URL{Path: "/api/v1/orders/o_revoked/telemetry"}}
	if err := authorizeRoute(&state, client, req); err == nil {
		t.Fatal("revoked client role must not retain order access")
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

func TestClientIPUsesProxyAppendedAddress(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/send-code", nil)
	req.Header.Set("X-Forwarded-For", "198.51.100.9, 203.0.113.8")
	if got := clientIP(req); got != "203.0.113.8" {
		t.Fatalf("expected right-most proxy address, got %q", got)
	}
}

func TestProductionCertificationRequiresHTTPSObjectStorage(t *testing.T) {
	if err := validateProductionCertificationFiles(map[string]any{"idPhotos": []any{"wxfile://temp/id.jpg"}}); err == nil {
		t.Fatal("local temporary files must be rejected")
	}
	if err := validateProductionCertificationFiles(map[string]any{"idPhotos": []any{"https://private.example.test/id/signed"}}); err != nil {
		t.Fatalf("HTTPS object reference should pass: %v", err)
	}
}

func TestProductionOrderRejectsLocalPhotoReferences(t *testing.T) {
	if err := validateProductionOrderFiles([]string{"_doc/temp/cargo.jpg"}); err == nil {
		t.Fatal("local cargo photo must be rejected")
	}
	if err := validateProductionOrderFiles([]string{"https://private.example.test/cargo/signed"}); err != nil {
		t.Fatalf("HTTPS cargo reference should pass: %v", err)
	}
}

func TestProductionUpstreamErrorsAreSanitized(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	recorder := httptest.NewRecorder()
	writeError(recorder, &upstreamError{Service: "sms", Err: errors.New("secret provider response")})
	if recorder.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d", recorder.Code)
	}
	if strings.Contains(recorder.Body.String(), "secret provider response") {
		t.Fatal("upstream response leaked to client")
	}
}

func TestRequestSafetyRecoversPanicsAndAddsRequestID(t *testing.T) {
	handler := requestSafety(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") }))
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/test", nil))
	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}
	if recorder.Header().Get("X-Request-ID") == "" {
		t.Fatal("missing request id")
	}
	if recorder.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("API error responses must not be cached")
	}
}
