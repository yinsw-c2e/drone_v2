package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMockSMSProviderExposesCode(t *testing.T) {
	provider := mockSMSProvider{}
	if !provider.ExposeCode() {
		t.Fatal("mock provider should expose code for local tests")
	}
	if err := provider.SendCode("13800138000", "123456"); err != nil {
		t.Fatalf("mock send failed: %v", err)
	}
}

func TestHTTPSMSProviderDispatchesAndDoesNotExposeCode(t *testing.T) {
	var payload smsHTTPRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer secret" {
			t.Fatalf("expected auth header, got %q", got)
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	provider := httpSMSProvider{
		name:       "http",
		endpoint:   server.URL,
		authHeader: "Bearer secret",
		headerName: "Authorization",
		templateID: "tpl_1",
		client:     server.Client(),
	}
	if provider.ExposeCode() {
		t.Fatal("http provider must not expose mock code")
	}
	if err := provider.SendCode("13800138000", "123456"); err != nil {
		t.Fatalf("http send failed: %v", err)
	}
	if payload.Phone != "13800138000" || payload.Code != "123456" || payload.TemplateID != "tpl_1" {
		t.Fatalf("unexpected payload: %+v", payload)
	}
}

func TestHTTPSMSProviderReturnsUpstreamError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte("gateway down"))
	}))
	defer server.Close()

	provider := httpSMSProvider{name: "http", endpoint: server.URL, headerName: "Authorization", client: server.Client()}
	err := provider.SendCode("13800138000", "123456")
	if err == nil || !strings.Contains(err.Error(), "HTTP 502") {
		t.Fatalf("expected upstream HTTP error, got %v", err)
	}
}

func TestSMSProviderMissingEndpointFails(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "http")
	t.Setenv("SMS_HTTP_ENDPOINT", "")

	err := ValidateSMSProviderEnv(false)
	if err == nil || !strings.Contains(err.Error(), "未配置发送接口") {
		t.Fatalf("expected missing endpoint error, got %v", err)
	}
}

func TestProductionDoesNotDefaultToMockSMS(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("SMS_PROVIDER", "")

	provider := newSMSProviderFromEnv()
	if provider.ExposeCode() {
		t.Fatal("production provider must not expose mock code")
	}
	err := provider.SendCode("13800138000", "123456")
	if err == nil || !strings.Contains(err.Error(), "生产环境必须设置 SMS_PROVIDER") {
		t.Fatalf("expected production configuration error, got %v", err)
	}
}

func TestUnknownSMSProviderDoesNotFallbackToMock(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "sandbox")

	provider := newSMSProviderFromEnv()
	if provider.Name() != "configuration-error" {
		t.Fatalf("expected configuration-error provider, got %s", provider.Name())
	}
	if provider.ExposeCode() {
		t.Fatal("unknown provider must not expose mock code")
	}
	if err := provider.SendCode("13800138000", "123456"); err == nil {
		t.Fatal("expected configuration error")
	}
}
