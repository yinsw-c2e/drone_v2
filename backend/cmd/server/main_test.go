package main

import (
	"strings"
	"testing"

	"drone-v2-backend/internal/app"
)

func TestValidateRuntimeConfigAllowsLocalDefaults(t *testing.T) {
	if err := validateRuntimeConfig(false, "*"); err != nil {
		t.Fatalf("local defaults should pass: %v", err)
	}
}

func TestValidateRuntimeConfigBlocksProductionWildcardCORS(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "https://sms.example.test/send")
	setProviderBridgeEnv(t)

	err := validateRuntimeConfig(true, "*")
	if err == nil || !strings.Contains(err.Error(), "禁止 CORS_ALLOW_ORIGIN=*") {
		t.Fatalf("expected wildcard CORS error, got %v", err)
	}
}

func TestValidateRuntimeConfigBlocksMissingProductionCORS(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "https://sms.example.test/send")
	setProviderBridgeEnv(t)

	err := validateRuntimeConfig(true, "")
	if err == nil || !strings.Contains(err.Error(), "必须显式设置 CORS_ALLOW_ORIGIN") {
		t.Fatalf("expected missing CORS error, got %v", err)
	}
}

func TestValidateRuntimeConfigDefersSMSConfigToAuthSendCode(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "mock")
	setProviderBridgeEnv(t)

	err := validateRuntimeConfig(true, "https://h5.example.test")
	if err != nil {
		t.Fatalf("sms rollout should not block backend startup: %v", err)
	}
}

func TestValidateSMSProviderEnvBlocksProductionMockSMS(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "mock")

	err := app.ValidateSMSProviderEnv(true)
	if err == nil || !strings.Contains(err.Error(), "禁止使用 SMS_PROVIDER=mock") {
		t.Fatalf("expected mock SMS error, got %v", err)
	}
}

func TestValidateRuntimeConfigAllowsProductionWhitelistAndHTTPSMS(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "https://sms.example.test/send")
	setProviderBridgeEnv(t)

	if err := validateRuntimeConfig(true, "https://h5.example.test,https://admin.example.test"); err != nil {
		t.Fatalf("production config should pass: %v", err)
	}
}

func TestValidateRuntimeConfigAllowsMissingProviderBridgeAtStartup(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "https://sms.example.test/send")

	err := validateRuntimeConfig(true, "https://h5.example.test")
	if err != nil {
		t.Fatalf("provider endpoint rollout should not block backend startup: %v", err)
	}
}

func TestValidateProviderBridgeEnvBlocksMissingProductionProviderBridge(t *testing.T) {
	err := app.ValidateProviderBridgeEnv(true)
	if err == nil || !strings.Contains(err.Error(), "provider bridge 配置缺失") {
		t.Fatalf("expected provider bridge error, got %v", err)
	}
}

func setProviderBridgeEnv(t *testing.T) {
	t.Helper()
	t.Setenv("PROVIDER_BRIDGE_AUTH_TOKEN", "bridge-token")
	t.Setenv("PROVIDER_PAYMENT_PREPAY_URL", "https://provider.example.test/payment")
	t.Setenv("PROVIDER_PAYMENT_NOTIFY_SECRET", "notify-secret")
	t.Setenv("PROVIDER_AIRSPACE_APPLY_URL", "https://provider.example.test/airspace")
	t.Setenv("PROVIDER_INSURANCE_QUOTE_URL", "https://provider.example.test/insurance")
	t.Setenv("PROVIDER_CREDIT_SCORE_URL", "https://provider.example.test/credit")
	t.Setenv("PROVIDER_DRONE_ARM_URL", "https://provider.example.test/drone")
}
