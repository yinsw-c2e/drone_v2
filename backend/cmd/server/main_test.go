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

func TestValidateRuntimeConfigBlocksMockSMS(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "mock")
	setProviderBridgeEnv(t)

	err := validateRuntimeConfig(true, "https://h5.example.test")
	if err == nil || !strings.Contains(err.Error(), "禁止使用 SMS_PROVIDER=mock") {
		t.Fatalf("expected production SMS config failure, got %v", err)
	}
}

func TestValidateSMSProviderEnvBlocksProductionMockSMS(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "mock")

	err := app.ValidateSMSProviderEnv(true)
	if err == nil || !strings.Contains(err.Error(), "禁止使用 SMS_PROVIDER=mock") {
		t.Fatalf("expected mock SMS error, got %v", err)
	}
}

func TestValidateSMSProviderEnvBlocksInsecureEndpoint(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "http://sms.example.test/send")

	err := app.ValidateSMSProviderEnv(true)
	if err == nil || !strings.Contains(err.Error(), "HTTPS URL") {
		t.Fatalf("expected HTTPS SMS error, got %v", err)
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

func TestValidateRuntimeConfigBlocksMissingLiveProviderBridgeAtStartup(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "https://sms.example.test/send")
	t.Setenv("INTEGRATION_MODE", "live")
	t.Setenv("SMS_CODE_PEPPER", "test-sms-code-pepper-with-32-chars")
	t.Setenv("OBJECT_STORAGE_ALLOWED_HOSTS", "private.example.test")

	err := validateRuntimeConfig(true, "https://h5.example.test")
	if err == nil || !strings.Contains(err.Error(), "provider bridge 配置缺失") {
		t.Fatalf("expected provider bridge startup failure, got %v", err)
	}
}

func TestValidateRuntimeConfigAllowsExplicitSandboxForClosedBeta(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "https://sms.example.test/send")
	t.Setenv("INTEGRATION_MODE", "sandbox")
	t.Setenv("SMS_CODE_PEPPER", "test-sms-code-pepper-with-32-chars")
	t.Setenv("OBJECT_STORAGE_ALLOWED_HOSTS", "private.example.test")

	if err := validateRuntimeConfig(true, "https://h5.example.test"); err != nil {
		t.Fatalf("explicit closed-beta sandbox should pass: %v", err)
	}
}

func TestValidateRuntimeConfigBlocksMissingSMSCodePepper(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "https://sms.example.test/send")
	t.Setenv("INTEGRATION_MODE", "sandbox")

	err := validateRuntimeConfig(true, "https://h5.example.test")
	if err == nil || !strings.Contains(err.Error(), "SMS_CODE_PEPPER") {
		t.Fatalf("expected SMS code pepper failure, got %v", err)
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
	t.Setenv("SMS_CODE_PEPPER", "test-sms-code-pepper-with-32-chars")
	t.Setenv("OBJECT_STORAGE_ALLOWED_HOSTS", "private.example.test")
	t.Setenv("INTEGRATION_MODE", "live")
	t.Setenv("PROVIDER_PAYMENT_PREPAY_URL", "https://provider.example.test/payment")
	t.Setenv("PROVIDER_PAYMENT_NOTIFY_SECRET", "notify-secret-with-at-least-32-chars")
	t.Setenv("PROVIDER_AIRSPACE_APPLY_URL", "https://provider.example.test/airspace")
	t.Setenv("PROVIDER_INSURANCE_QUOTE_URL", "https://provider.example.test/insurance")
	t.Setenv("PROVIDER_CREDIT_SCORE_URL", "https://provider.example.test/credit")
	t.Setenv("PROVIDER_DRONE_ARM_URL", "https://provider.example.test/drone")
}
