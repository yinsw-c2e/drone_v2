package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

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
	payment, err := applyPaymentNotification(&state, note)
	if err != nil {
		t.Fatalf("apply notification: %v", err)
	}
	if payment.Status != PaymentPaid || payment.PaidAt == "" {
		t.Fatalf("expected paid payment, got %#v", payment)
	}
}

func TestPaymentNotifyRejectsBadSignature(t *testing.T) {
	bridge := &ProviderBridge{notifySecret: "secret"}
	body := []byte(`{"paymentId":"pay_1","status":"paid"}`)
	if err := bridge.VerifyPaymentNotification(body, "bad-signature"); err == nil || err.Error() != "支付回调验签失败" {
		t.Fatalf("expected signature error, got %v", err)
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
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": map[string]any{"quoteId": "q_1", "policyNo": "P20260628001", "premiumCent": 3000, "insuredAmountCent": 600000, "provider": "insurer"}})
		case "/credit":
			_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "data": map[string]any{"userId": "u_c1", "score": 820, "providerTraceId": "cr_1", "provider": "credit"}})
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

func TestProviderBridgeIngressRequiresTokenInProduction(t *testing.T) {
	server := &Server{providerBridgeAuthToken: "bridge-token", requirePaidPayment: true}
	req := httptest.NewRequest(http.MethodPost, "/api/v1/provider/payment/prepay", nil)
	rec := httptest.NewRecorder()
	if server.authorizeProviderBridge(rec, req) {
		t.Fatal("expected missing token to be rejected")
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}

	req = httptest.NewRequest(http.MethodPost, "/api/v1/provider/payment/prepay", nil)
	req.Header.Set("Authorization", "Bearer bridge-token")
	rec = httptest.NewRecorder()
	if !server.authorizeProviderBridge(rec, req) {
		t.Fatal("expected valid bridge token to pass")
	}
}
