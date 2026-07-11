package app

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ProviderBridge struct {
	client       *http.Client
	production   bool
	endpoints    providerEndpoints
	authHeader   string
	headerName   string
	notifySecret string
	sandbox      bool
}

type providerEndpoints struct {
	PaymentPrepay  string
	AirspaceApply  string
	InsuranceQuote string
	CreditScore    string
	DroneArm       string
}

type ProviderPaymentPrepayRequest struct {
	OrderID    string `json:"orderId"`
	CapacityID string `json:"capacityId,omitempty"`
	AmountCent int    `json:"amountCent"`
	Mode       string `json:"mode"`
	NotifyURL  string `json:"notifyUrl,omitempty"`
}

type ProviderPaymentPrepayResult struct {
	TradeNo   string            `json:"tradeNo"`
	PaidCent  int               `json:"paidCent"`
	Mode      string            `json:"mode"`
	Provider  string            `json:"provider,omitempty"`
	PrepayID  string            `json:"prepayId,omitempty"`
	SDKParams *PaymentSDKParams `json:"sdkParams,omitempty"`
}

type PaymentPrepayResponse struct {
	PaymentID string            `json:"paymentId"`
	TradeNo   string            `json:"tradeNo"`
	PaidCent  int               `json:"paidCent"`
	Mode      string            `json:"mode"`
	Status    PaymentStatus     `json:"status"`
	Provider  string            `json:"provider,omitempty"`
	SDKParams *PaymentSDKParams `json:"sdkParams,omitempty"`
}

type PaymentNotification struct {
	PaymentID string `json:"paymentId"`
	TradeNo   string `json:"tradeNo"`
	Status    string `json:"status"`
	PaidCent  int    `json:"paidCent"`
	Provider  string `json:"provider,omitempty"`
	PaidAt    string `json:"paidAt,omitempty"`
	Error     string `json:"error,omitempty"`
}

type ProviderAirspaceApplyRequest struct {
	OrderID   string     `json:"orderId"`
	Area      []GeoPoint `json:"area"`
	AltitudeM int        `json:"altitudeM"`
	Window    TimeWindow `json:"window"`
}

type ProviderAirspaceApplyResult struct {
	RequestID     string     `json:"requestId"`
	Status        string     `json:"status"`
	Provider      string     `json:"provider,omitempty"`
	ApprovalNo    string     `json:"approvalNo,omitempty"`
	ValidFrom     string     `json:"validFrom,omitempty"`
	ValidTo       string     `json:"validTo,omitempty"`
	RouteGeometry []GeoPoint `json:"routeGeometry,omitempty"`
}

type ProviderInsuranceQuoteRequest struct {
	OrderID   string    `json:"orderId"`
	CargoType CargoType `json:"cargoType"`
	ValueCent int       `json:"valueCent"`
}

type ProviderInsuranceQuoteResult struct {
	QuoteID           string   `json:"quoteId,omitempty"`
	PolicyNo          string   `json:"policyNo,omitempty"`
	Provider          string   `json:"provider,omitempty"`
	PremiumCent       int      `json:"premiumCent"`
	InsuredAmountCent int      `json:"insuredAmountCent"`
	Coverages         []string `json:"coverages,omitempty"`
	ActivatedAt       string   `json:"activatedAt,omitempty"`
}

type ProviderCreditScoreRequest struct {
	UserID string `json:"userId"`
	Role   Role   `json:"role,omitempty"`
}

type ProviderCreditScoreResult struct {
	UserID          string `json:"userId"`
	Score           int    `json:"score"`
	Provider        string `json:"provider,omitempty"`
	ProviderTraceID string `json:"providerTraceId,omitempty"`
	AuthorizedAt    string `json:"authorizedAt,omitempty"`
	ExpiresAt       string `json:"expiresAt,omitempty"`
}

type ProviderDroneArmRequest struct {
	DroneID string `json:"droneId"`
	OrderID string `json:"orderId,omitempty"`
}

type ProviderDroneArmResult struct {
	DroneID  string     `json:"droneId"`
	Ready    bool       `json:"ready"`
	Provider string     `json:"provider,omitempty"`
	DeviceSN string     `json:"deviceSn,omitempty"`
	Frame    *Telemetry `json:"frame,omitempty"`
}

type providerEnvelope struct {
	OK    *bool           `json:"ok,omitempty"`
	Data  json.RawMessage `json:"data,omitempty"`
	Error string          `json:"error,omitempty"`
}

func NewProviderBridgeFromEnv(production bool) *ProviderBridge {
	headerName := firstEnv("PROVIDER_HTTP_AUTH_HEADER_NAME")
	if headerName == "" {
		headerName = "Authorization"
	}
	timeout := 8 * time.Second
	return &ProviderBridge{
		client:     &http.Client{Timeout: timeout},
		production: production,
		endpoints: providerEndpoints{
			PaymentPrepay:  firstEnv("PROVIDER_PAYMENT_PREPAY_URL"),
			AirspaceApply:  firstEnv("PROVIDER_AIRSPACE_APPLY_URL"),
			InsuranceQuote: firstEnv("PROVIDER_INSURANCE_QUOTE_URL"),
			CreditScore:    firstEnv("PROVIDER_CREDIT_SCORE_URL"),
			DroneArm:       firstEnv("PROVIDER_DRONE_ARM_URL"),
		},
		authHeader:   providerAuthHeader(),
		headerName:   headerName,
		notifySecret: firstEnv("PROVIDER_PAYMENT_NOTIFY_SECRET"),
		sandbox:      integrationMode(production) == "sandbox",
	}
}

func ValidateProviderBridgeEnv(production bool) error {
	if !production {
		return nil
	}
	mode := integrationMode(production)
	if mode == "sandbox" {
		return nil
	}
	if mode != "live" {
		return fmt.Errorf("未知 INTEGRATION_MODE: %s", mode)
	}
	required := map[string]string{
		"PROVIDER_PAYMENT_PREPAY_URL":    firstEnv("PROVIDER_PAYMENT_PREPAY_URL"),
		"PROVIDER_PAYMENT_NOTIFY_SECRET": firstEnv("PROVIDER_PAYMENT_NOTIFY_SECRET"),
		"PROVIDER_AIRSPACE_APPLY_URL":    firstEnv("PROVIDER_AIRSPACE_APPLY_URL"),
		"PROVIDER_INSURANCE_QUOTE_URL":   firstEnv("PROVIDER_INSURANCE_QUOTE_URL"),
		"PROVIDER_CREDIT_SCORE_URL":      firstEnv("PROVIDER_CREDIT_SCORE_URL"),
		"PROVIDER_DRONE_ARM_URL":         firstEnv("PROVIDER_DRONE_ARM_URL"),
	}
	missing := make([]string, 0)
	for key, value := range required {
		if strings.TrimSpace(value) == "" {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("生产 provider bridge 配置缺失: %s", strings.Join(missing, ", "))
	}
	for key, value := range map[string]string{
		"PROVIDER_PAYMENT_PREPAY_URL":  required["PROVIDER_PAYMENT_PREPAY_URL"],
		"PROVIDER_AIRSPACE_APPLY_URL":  required["PROVIDER_AIRSPACE_APPLY_URL"],
		"PROVIDER_INSURANCE_QUOTE_URL": required["PROVIDER_INSURANCE_QUOTE_URL"],
		"PROVIDER_CREDIT_SCORE_URL":    required["PROVIDER_CREDIT_SCORE_URL"],
		"PROVIDER_DRONE_ARM_URL":       required["PROVIDER_DRONE_ARM_URL"],
	} {
		parsed, err := url.Parse(value)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
			return fmt.Errorf("%s 必须是无内嵌凭证的 HTTPS URL", key)
		}
	}
	return nil
}

func integrationMode(production bool) string {
	mode := strings.TrimSpace(strings.ToLower(firstEnv("INTEGRATION_MODE")))
	if mode != "" {
		return mode
	}
	if production {
		return "live"
	}
	return "sandbox"
}

func providerAuthHeader() string {
	if value := firstEnv("PROVIDER_HTTP_AUTH_HEADER"); value != "" {
		return value
	}
	token := firstEnv("PROVIDER_HTTP_AUTH_TOKEN")
	if token == "" {
		return ""
	}
	return "Bearer " + token
}

func (b *ProviderBridge) PaymentPrepay(ctx context.Context, req ProviderPaymentPrepayRequest) (*ProviderPaymentPrepayResult, error) {
	if b.sandbox {
		return &ProviderPaymentPrepayResult{
			TradeNo:  genID("sandbox_trade"),
			PaidCent: req.AmountCent,
			Mode:     req.Mode,
			Provider: "sandbox",
			PrepayID: genID("sandbox_prepay"),
		}, nil
	}
	var out ProviderPaymentPrepayResult
	if err := b.postJSON(ctx, "payment prepay", b.endpoints.PaymentPrepay, req, &out); err != nil {
		return nil, err
	}
	if out.PaidCent == 0 {
		out.PaidCent = req.AmountCent
	}
	if out.Mode == "" {
		out.Mode = req.Mode
	}
	if out.Provider == "" {
		out.Provider = "provider-bridge"
	}
	if out.TradeNo == "" {
		return nil, errors.New("payment provider 未返回 tradeNo")
	}
	if b.production && !paymentSDKParamsReady(out.SDKParams) {
		return nil, errors.New("payment provider 未返回微信/平台支付 SDK 参数")
	}
	return &out, nil
}

func (b *ProviderBridge) AirspaceApply(ctx context.Context, req ProviderAirspaceApplyRequest) (*ProviderAirspaceApplyResult, error) {
	if b.sandbox {
		now := time.Now()
		return &ProviderAirspaceApplyResult{
			RequestID:  genID("sandbox_air"),
			Status:     "approved",
			Provider:   "sandbox",
			ApprovalNo: genID("sandbox_approval"),
			ValidFrom:  now.Format(time.RFC3339Nano),
			ValidTo:    now.Add(90 * time.Minute).Format(time.RFC3339Nano),
		}, nil
	}
	var out ProviderAirspaceApplyResult
	if err := b.postJSON(ctx, "airspace apply", b.endpoints.AirspaceApply, req, &out); err != nil {
		return nil, err
	}
	if out.Provider == "" {
		out.Provider = "provider-bridge"
	}
	if out.RequestID == "" {
		return nil, errors.New("airspace provider 未返回 requestId")
	}
	if out.Status == "" {
		out.Status = "submitted"
	}
	return &out, nil
}

func (b *ProviderBridge) InsuranceQuote(ctx context.Context, req ProviderInsuranceQuoteRequest) (*ProviderInsuranceQuoteResult, error) {
	if b.sandbox {
		premium := int(float64(req.ValueCent) * 0.03)
		if premium <= 0 {
			premium = 1
		}
		return &ProviderInsuranceQuoteResult{
			QuoteID:           genID("sandbox_quote"),
			PolicyNo:          genID("sandbox_policy"),
			Provider:          "sandbox",
			PremiumCent:       premium,
			InsuredAmountCent: req.ValueCent * 2,
			Coverages:         []string{"封闭内测沙箱保障"},
			ActivatedAt:       nowISO(),
		}, nil
	}
	var out ProviderInsuranceQuoteResult
	if err := b.postJSON(ctx, "insurance quote", b.endpoints.InsuranceQuote, req, &out); err != nil {
		return nil, err
	}
	if out.Provider == "" {
		out.Provider = "provider-bridge"
	}
	if out.PremiumCent <= 0 {
		return nil, errors.New("insurance provider 未返回有效保费")
	}
	if out.InsuredAmountCent <= 0 {
		out.InsuredAmountCent = req.ValueCent
	}
	if b.production && out.PolicyNo == "" {
		return nil, errors.New("insurance provider 未返回保单号")
	}
	return &out, nil
}

func (b *ProviderBridge) CreditScore(ctx context.Context, req ProviderCreditScoreRequest) (*ProviderCreditScoreResult, error) {
	if b.sandbox {
		now := time.Now()
		return &ProviderCreditScoreResult{
			UserID:          req.UserID,
			Score:           720,
			Provider:        "sandbox",
			ProviderTraceID: genID("sandbox_credit"),
			AuthorizedAt:    now.Format(time.RFC3339Nano),
			ExpiresAt:       now.Add(24 * time.Hour).Format(time.RFC3339Nano),
		}, nil
	}
	var out ProviderCreditScoreResult
	if err := b.postJSON(ctx, "credit score", b.endpoints.CreditScore, req, &out); err != nil {
		return nil, err
	}
	if out.UserID == "" {
		out.UserID = req.UserID
	}
	if out.Provider == "" {
		out.Provider = "provider-bridge"
	}
	if out.Score <= 0 {
		return nil, errors.New("credit provider 未返回有效分数")
	}
	if b.production && out.ProviderTraceID == "" {
		return nil, errors.New("credit provider 未返回供应商流水号")
	}
	return &out, nil
}

func (b *ProviderBridge) DroneArm(ctx context.Context, req ProviderDroneArmRequest) (*ProviderDroneArmResult, error) {
	if b.sandbox {
		return &ProviderDroneArmResult{
			DroneID:  req.DroneID,
			Ready:    true,
			Provider: "sandbox",
			DeviceSN: "sandbox-" + req.DroneID,
		}, nil
	}
	var out ProviderDroneArmResult
	if err := b.postJSON(ctx, "drone arm", b.endpoints.DroneArm, req, &out); err != nil {
		return nil, err
	}
	if out.DroneID == "" {
		out.DroneID = req.DroneID
	}
	if out.Provider == "" {
		out.Provider = "provider-bridge"
	}
	return &out, nil
}

func (b *ProviderBridge) postJSON(ctx context.Context, name string, endpoint string, payload any, out any) error {
	if strings.TrimSpace(endpoint) == "" {
		return fmt.Errorf("%s provider endpoint 未配置", name)
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if b.authHeader != "" {
		req.Header.Set(b.headerName, b.authHeader)
	}
	client := b.client
	if client == nil {
		client = &http.Client{Timeout: 8 * time.Second}
	}
	resp, err := client.Do(req)
	if err != nil {
		return &upstreamError{Service: name + " provider", Err: err}
	}
	defer resp.Body.Close()
	responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return &upstreamError{Service: name + " provider", Err: fmt.Errorf("HTTP %d %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))}
	}
	if err := decodeProviderResponse(responseBody, out); err != nil {
		return &upstreamError{Service: name + " provider", Err: err}
	}
	return nil
}

func decodeProviderResponse(body []byte, out any) error {
	var envelope providerEnvelope
	if err := json.Unmarshal(body, &envelope); err == nil && (envelope.OK != nil || envelope.Data != nil || envelope.Error != "") {
		if envelope.OK != nil && !*envelope.OK {
			if envelope.Error == "" {
				envelope.Error = "provider 返回失败"
			}
			return errors.New(envelope.Error)
		}
		if len(envelope.Data) > 0 {
			return json.Unmarshal(envelope.Data, out)
		}
	}
	return json.Unmarshal(body, out)
}

func paymentSDKParamsReady(params *PaymentSDKParams) bool {
	return params != nil && params.TimeStamp != "" && params.NonceStr != "" && params.Package != "" && params.SignType != "" && params.PaySign != ""
}

func (b *ProviderBridge) VerifyPaymentNotification(body []byte, signature string) error {
	if strings.TrimSpace(b.notifySecret) == "" {
		return errors.New("PROVIDER_PAYMENT_NOTIFY_SECRET 未配置，不能验签支付回调")
	}
	expected := signProviderWebhook(b.notifySecret, body)
	actual := strings.TrimSpace(strings.TrimPrefix(signature, "sha256="))
	if !hmac.Equal([]byte(expected), []byte(actual)) {
		return errors.New("支付回调验签失败")
	}
	return nil
}

func signProviderWebhook(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}

func decodePaymentNotification(body []byte) (*PaymentNotification, error) {
	var note PaymentNotification
	if err := json.Unmarshal(body, &note); err != nil {
		return nil, err
	}
	if note.PaymentID == "" && note.TradeNo == "" {
		return nil, errors.New("支付回调缺少 paymentId 或 tradeNo")
	}
	return &note, nil
}

func applyPaymentNotification(state *DBShape, note *PaymentNotification) (*PaymentOrder, bool, error) {
	payment := findPaymentOrder(state, note.PaymentID)
	if payment == nil && note.TradeNo != "" {
		for i := range state.PaymentOrders {
			if state.PaymentOrders[i].ProviderTradeNo == note.TradeNo {
				payment = &state.PaymentOrders[i]
				break
			}
		}
	}
	if payment == nil {
		return nil, false, errors.New("支付单不存在")
	}
	if note.PaymentID != "" && note.PaymentID != payment.ID {
		return nil, false, errors.New("支付回调 paymentId 与交易号不匹配")
	}
	if note.TradeNo != "" && note.TradeNo != payment.ProviderTradeNo {
		return nil, false, errors.New("支付回调交易号不匹配")
	}
	if note.Provider != "" && payment.Provider != "" && payment.Provider != "provider-bridge" && note.Provider != payment.Provider {
		return nil, false, errors.New("支付回调 provider 不匹配")
	}
	now := nowISO()
	status := strings.ToLower(strings.TrimSpace(note.Status))
	switch status {
	case "paid", "success", "succeeded":
		if note.PaidCent <= 0 || note.PaidCent != payment.AmountCent {
			return nil, false, errors.New("支付回调金额与支付单不一致")
		}
		if payment.Status == PaymentPaid {
			return payment, false, nil
		}
		payment.Status = PaymentPaid
		payment.PaidAt = fallback(note.PaidAt, now)
		payment.FailedReason = ""
	case "failed", "fail":
		if payment.Status == PaymentPaid {
			return nil, false, errors.New("已支付订单不能回退为失败")
		}
		if payment.Status == PaymentFailed {
			return payment, false, nil
		}
		payment.Status = PaymentFailed
		payment.FailedReason = fallback(note.Error, "provider reported payment failed")
	case "cancelled", "canceled", "cancel":
		if payment.Status == PaymentPaid {
			return nil, false, errors.New("已支付订单不能回退为取消")
		}
		if payment.Status == PaymentCancelled {
			return payment, false, nil
		}
		payment.Status = PaymentCancelled
		payment.FailedReason = fallback(note.Error, "provider reported payment cancelled")
	default:
		return nil, false, errors.New("支付回调状态不支持")
	}
	if note.Provider != "" && payment.Provider == "provider-bridge" {
		payment.Provider = note.Provider
	}
	payment.UpdatedAt = now
	return payment, true, nil
}
