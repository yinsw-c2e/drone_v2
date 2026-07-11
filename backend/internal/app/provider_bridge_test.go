package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestPaymentPrepayIdempotencyHelpers(t *testing.T) {
	state := DBShape{}
	firstKey := paymentIdempotencyKey(&state, "o_1", "cap_1")
	if firstKey == "" || firstKey != paymentIdempotencyKey(&state, "o_1", "cap_1") {
		t.Fatalf("expected stable first-attempt key, got %q", firstKey)
	}
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_failed", OrderID: "o_1", CapacityID: "cap_1", AmountCent: 1000, Mode: "escrow", Status: PaymentFailed,
	})
	if retryKey := paymentIdempotencyKey(&state, "o_1", "cap_1"); retryKey == firstKey {
		t.Fatalf("expected retry key to change after a recorded failed attempt")
	}
	if payment := reusablePaymentForPrepay(&state, "o_1", "cap_1", 1000, "escrow"); payment != nil {
		t.Fatalf("failed payment must not be reused: %#v", payment)
	}
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_pending", OrderID: "o_1", CapacityID: "cap_1", AmountCent: 1000, Mode: "escrow", Status: PaymentPending,
	})
	if payment := reusablePaymentForPrepay(&state, "o_1", "cap_1", 1000, "escrow"); payment == nil || payment.ID != "pay_pending" {
		t.Fatalf("expected latest pending payment reuse, got %#v", payment)
	}
	if payment := reusablePaymentForPrepay(&state, "o_1", "cap_other", 1000, "escrow"); payment != nil {
		t.Fatalf("payment bound to another capacity must not be reused: %#v", payment)
	}
}

func TestPaymentNotifySignatureMarksPaid(t *testing.T) {
	state := buildSeed()
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_1", OrderID: "o_1", AmountCent: 12345, Mode: "escrow",
		Status: PaymentPending, Provider: "wxpay", ProviderTradeNo: "wx_trade_1", CreatedAt: nowISO(), UpdatedAt: nowISO(),
	})
	body := []byte(`{"paymentId":"pay_1","status":"paid","paidCent":12345,"provider":"wxpay"}`)
	bridge := &ProviderBridge{notifySecret: "secret"}
	if err := bridge.VerifyPaymentNotification(body, "sha256="+signProviderWebhook("secret", body)); err != nil {
		t.Fatalf("verify signature failed: %v", err)
	}
	note, err := decodePaymentNotification(body)
	if err != nil {
		t.Fatalf("decode notification: %v", err)
	}
	payment, changed, err := applyPaymentNotification(&state, note)
	if err != nil {
		t.Fatalf("apply notification: %v", err)
	}
	if payment.Status != PaymentPaid || payment.PaidAt == "" {
		t.Fatalf("expected paid payment, got %#v", payment)
	}
	if !changed {
		t.Fatal("first payment callback must change state")
	}
}

func TestPaymentNotifyRejectsBadSignature(t *testing.T) {
	bridge := &ProviderBridge{notifySecret: "secret"}
	body := []byte(`{"paymentId":"pay_1","status":"paid"}`)
	if err := bridge.VerifyPaymentNotification(body, "bad-signature"); err == nil || err.Error() != "支付回调验签失败" {
		t.Fatalf("expected signature error, got %v", err)
	}
}

func TestPaymentNotifyRejectsAmountMismatchAndPaidRegression(t *testing.T) {
	state := buildSeed()
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_strict", OrderID: "o_1", AmountCent: 12345, Mode: "escrow",
		Status: PaymentPending, Provider: "wxpay", ProviderTradeNo: "wx_trade_strict", CreatedAt: nowISO(), UpdatedAt: nowISO(),
	})
	if _, _, err := applyPaymentNotification(&state, &PaymentNotification{PaymentID: "pay_strict", TradeNo: "wx_trade_strict", Status: "paid", PaidCent: 1, Provider: "wxpay"}); err == nil || !strings.Contains(err.Error(), "金额") {
		t.Fatalf("expected amount mismatch, got %v", err)
	}
	payment, _, err := applyPaymentNotification(&state, &PaymentNotification{PaymentID: "pay_strict", TradeNo: "wx_trade_strict", Status: "paid", PaidCent: 12345, Provider: "wxpay"})
	if err != nil || payment.Status != PaymentPaid {
		t.Fatalf("expected exact payment to pass: %#v / %v", payment, err)
	}
	if _, _, err := applyPaymentNotification(&state, &PaymentNotification{PaymentID: "pay_strict", TradeNo: "wx_trade_strict", Status: "failed", Provider: "wxpay"}); err == nil || !strings.Contains(err.Error(), "不能回退") {
		t.Fatalf("expected paid regression to be rejected, got %v", err)
	}
}

func TestPaymentNotifyRejectsMismatchedTradeNumber(t *testing.T) {
	state := buildSeed()
	state.PaymentOrders = append(state.PaymentOrders, PaymentOrder{
		ID: "pay_trade", OrderID: "o_1", AmountCent: 12345, Mode: "escrow",
		Status: PaymentPending, Provider: "wxpay", ProviderTradeNo: "wx_trade_expected", CreatedAt: nowISO(), UpdatedAt: nowISO(),
	})
	_, _, err := applyPaymentNotification(&state, &PaymentNotification{PaymentID: "pay_trade", TradeNo: "wx_trade_other", Status: "paid", PaidCent: 12345, Provider: "wxpay"})
	if err == nil || !strings.Contains(err.Error(), "交易号") {
		t.Fatalf("expected trade mismatch, got %v", err)
	}
}

func TestProductionPrepayUsesServerCandidateQuote(t *testing.T) {
	state := buildSeed()
	state.Credits = append(state.Credits,
		CreditScore{UserID: "u_p1", Role: RolePilot, Total: 860, Provider: "credit", ProviderTraceID: "p1_trace", AuthorizedAt: nowISO(), ExpiresAt: time.Now().Add(time.Hour).Format(time.RFC3339Nano)},
		CreditScore{UserID: "u_o1", Role: RoleOwner, Total: 840, Provider: "credit", ProviderTraceID: "o1_trace", AuthorizedAt: nowISO(), ExpiresAt: time.Now().Add(time.Hour).Format(time.RFC3339Nano)},
	)
	order, err := submitOrderWithOptions(&state, submitOrderRequest{
		ClientID: "u_c1", CargoType: CargoNormal, WeightKg: 5, ValueCent: 100000, BudgetCent: 200000,
		From: GeoPoint{Lng: 116.4, Lat: 39.91}, To: GeoPoint{Lng: 116.42, Lat: 39.92},
	}, false)
	if err != nil {
		t.Fatalf("submit order: %v", err)
	}
	candidates, err := candidatesForOrderWithOptions(&state, order.ID, "global", false)
	if err != nil || len(candidates) == 0 {
		t.Fatalf("candidates: %#v / %v", candidates, err)
	}
	req := ProviderPaymentPrepayRequest{OrderID: order.ID, CapacityID: candidates[0].CapacityID, AmountCent: 1, Mode: "escrow"}
	if err := preparePaymentPrepayRequest(&state, order, &req, true); err != nil {
		t.Fatalf("prepare payment: %v", err)
	}
	if req.AmountCent != candidates[0].QuoteCent {
		t.Fatalf("client amount must be replaced by server quote: %d != %d", req.AmountCent, candidates[0].QuoteCent)
	}
}

func TestProviderBridgePrepayRequiresSDKParamsInProduction(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"tradeNo": "wx_trade_1", "paidCent": 1000, "provider": "wxpay"})
	}))
	defer server.Close()

	bridge := &ProviderBridge{
		client:     server.Client(),
		production: true,
		endpoints:  providerEndpoints{PaymentPrepay: server.URL},
	}
	_, err := bridge.PaymentPrepay(context.Background(), ProviderPaymentPrepayRequest{OrderID: "o_1", AmountCent: 1000, Mode: "escrow"})
	if err == nil || !strings.Contains(err.Error(), "支付 SDK 参数") {
		t.Fatalf("expected sdk params error, got %v", err)
	}
}

func TestProviderBridgeAdaptersDecodeEnvelopeResponses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/payment":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": map[string]any{
				"tradeNo": "wx_trade_2", "paidCent": 2000, "provider": "wxpay", "prepayId": "wx_prepay",
				"sdkParams": map[string]any{"provider": "wxpay", "timeStamp": "1710000000", "nonceStr": "nonce", "package": "prepay_id=wx_prepay", "signType": "RSA", "paySign": "signature"},
			}})
		case "/airspace":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": map[string]any{"requestId": "uom_1", "status": "submitted", "provider": "uom"}})
		case "/insurance":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": map[string]any{"quoteId": "q_1", "policyNo": "P20260628001", "premiumCent": 3000, "insuredAmountCent": 600000, "provider": "insurer", "activatedAt": "2026-07-11T12:00:00Z"}})
		case "/credit":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": map[string]any{"userId": "u_c1", "score": 820, "providerTraceId": "cr_1", "provider": "credit", "authorizedAt": "2026-07-11T12:00:00Z", "expiresAt": "2030-07-11T12:00:00Z"}})
		case "/drone":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": map[string]any{"droneId": "d1", "ready": true, "provider": "drone-sdk", "deviceSn": "SN-D1"}})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	bridge := &ProviderBridge{
		client:     server.Client(),
		production: true,
		endpoints: providerEndpoints{
			PaymentPrepay:  server.URL + "/payment",
			AirspaceApply:  server.URL + "/airspace",
			InsuranceQuote: server.URL + "/insurance",
			CreditScore:    server.URL + "/credit",
			DroneArm:       server.URL + "/drone",
		},
	}
	if pay, err := bridge.PaymentPrepay(context.Background(), ProviderPaymentPrepayRequest{OrderID: "o_1", AmountCent: 2000, Mode: "escrow"}); err != nil || pay.PrepayID != "wx_prepay" {
		t.Fatalf("payment adapter failed: %#v / %v", pay, err)
	}
	if air, err := bridge.AirspaceApply(context.Background(), ProviderAirspaceApplyRequest{OrderID: "o_1"}); err != nil || air.RequestID != "uom_1" {
		t.Fatalf("airspace adapter failed: %#v / %v", air, err)
	}
	if ins, err := bridge.InsuranceQuote(context.Background(), ProviderInsuranceQuoteRequest{OrderID: "o_1", ValueCent: 300000}); err != nil || ins.PolicyNo != "P20260628001" {
		t.Fatalf("insurance adapter failed: %#v / %v", ins, err)
	}
	if credit, err := bridge.CreditScore(context.Background(), ProviderCreditScoreRequest{UserID: "u_c1"}); err != nil || credit.ProviderTraceID != "cr_1" {
		t.Fatalf("credit adapter failed: %#v / %v", credit, err)
	}
	if drone, err := bridge.DroneArm(context.Background(), ProviderDroneArmRequest{DroneID: "d1"}); err != nil || !drone.Ready {
		t.Fatalf("drone adapter failed: %#v / %v", drone, err)
	}
}

func TestProviderBridgeRejectsMismatchedProductionSubjects(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/credit":
			_ = json.NewEncoder(w).Encode(map[string]any{"userId": "u_other", "score": 800, "providerTraceId": "trace_1"})
		case "/drone":
			_ = json.NewEncoder(w).Encode(map[string]any{"droneId": "d_other", "ready": true, "deviceSn": "SN-OTHER"})
		}
	}))
	defer server.Close()
	bridge := &ProviderBridge{
		client: server.Client(), production: true,
		endpoints: providerEndpoints{CreditScore: server.URL + "/credit", DroneArm: server.URL + "/drone"},
	}
	if _, err := bridge.CreditScore(context.Background(), ProviderCreditScoreRequest{UserID: "u_expected"}); err == nil || !strings.Contains(err.Error(), "用户") {
		t.Fatalf("expected credit subject mismatch, got %v", err)
	}
	if _, err := bridge.DroneArm(context.Background(), ProviderDroneArmRequest{DroneID: "d_expected"}); err == nil || !strings.Contains(err.Error(), "无人机") {
		t.Fatalf("expected drone subject mismatch, got %v", err)
	}
}
