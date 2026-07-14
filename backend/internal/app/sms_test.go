package app

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	dypnsapi "github.com/alibabacloud-go/dypnsapi-20170525/v3/client"
	"github.com/alibabacloud-go/tea/dara"
	"github.com/alibabacloud-go/tea/tea"
)

type fakeAliyunSMSClient struct {
	request  *dypnsapi.SendSmsVerifyCodeRequest
	response *dypnsapi.SendSmsVerifyCodeResponse
	err      error
}

func (f *fakeAliyunSMSClient) SendSmsVerifyCodeWithOptions(request *dypnsapi.SendSmsVerifyCodeRequest, _ *dara.RuntimeOptions) (*dypnsapi.SendSmsVerifyCodeResponse, error) {
	f.request = request
	return f.response, f.err
}

func TestMockSMSProviderExposesCode(t *testing.T) {
	provider := mockSMSProvider{}
	if !provider.ExposeCode() {
		t.Fatal("mock provider should expose code for local tests")
	}
	if err := provider.SendCode("13800138000", "123456"); err != nil {
		t.Fatalf("mock send failed: %v", err)
	}
}

func TestAliyunDirectProviderDispatchesLocalCode(t *testing.T) {
	fake := &fakeAliyunSMSClient{response: &dypnsapi.SendSmsVerifyCodeResponse{
		Body: &dypnsapi.SendSmsVerifyCodeResponseBody{Code: tea.String("OK")},
	}}
	provider := aliyunSMSProvider{
		signName:     "测试签名",
		templateCode: "100001",
		client:       fake,
	}
	if provider.ExposeCode() {
		t.Fatal("aliyun provider must not expose code")
	}
	if err := provider.SendCode("13800138000", "654321"); err != nil {
		t.Fatalf("aliyun send failed: %v", err)
	}
	if fake.request == nil {
		t.Fatal("expected aliyun request")
	}
	if got := tea.StringValue(fake.request.PhoneNumber); got != "13800138000" {
		t.Fatalf("unexpected phone: %s", got)
	}
	if got := tea.StringValue(fake.request.SignName); got != "测试签名" {
		t.Fatalf("unexpected sign name: %s", got)
	}
	if got := tea.StringValue(fake.request.TemplateCode); got != "100001" {
		t.Fatalf("unexpected template code: %s", got)
	}
	var templateParam map[string]string
	if err := json.Unmarshal([]byte(tea.StringValue(fake.request.TemplateParam)), &templateParam); err != nil {
		t.Fatalf("decode template param: %v", err)
	}
	if templateParam["code"] != "654321" || templateParam["min"] != "5" {
		t.Fatalf("unexpected template params: %+v", templateParam)
	}
}

func TestAliyunDirectProviderReturnsSanitizedError(t *testing.T) {
	provider := aliyunSMSProvider{client: &fakeAliyunSMSClient{err: errors.New("secret-bearing raw upstream failure")}}
	err := provider.SendCode("13800138000", "123456")
	if err == nil {
		t.Fatal("expected aliyun error")
	}
	if strings.Contains(err.Error(), "secret-bearing") {
		t.Fatalf("raw upstream error must not be exposed: %v", err)
	}
}

func TestAliyunDirectConfigDoesNotRequireHTTPGateway(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "aliyun")
	t.Setenv("ALIYUN_SMS_ACCESS_KEY_ID", "test-access-key-id")
	t.Setenv("ALIYUN_SMS_ACCESS_KEY_SECRET", "test-access-key-secret")
	t.Setenv("ALIYUN_SMS_SIGN_NAME", "测试签名")
	t.Setenv("ALIYUN_SMS_TEMPLATE_CODE", "100001")
	t.Setenv("ALIYUN_SMS_HTTP_ENDPOINT", "")
	t.Setenv("SMS_HTTP_ENDPOINT", "")

	if err := ValidateSMSProviderEnv(true); err != nil {
		t.Fatalf("expected direct aliyun config to pass: %v", err)
	}
	if _, ok := newSMSProviderFromEnv().(aliyunSMSProvider); !ok {
		t.Fatalf("expected direct aliyun provider, got %T", newSMSProviderFromEnv())
	}
}

func TestAliyunDirectConfigMustBeComplete(t *testing.T) {
	t.Setenv("SMS_PROVIDER", "aliyun")
	t.Setenv("ALIYUN_SMS_ACCESS_KEY_ID", "test-access-key-id")
	t.Setenv("ALIYUN_SMS_ACCESS_KEY_SECRET", "")
	t.Setenv("ALIBABA_CLOUD_ACCESS_KEY_SECRET", "")
	t.Setenv("ALIYUN_SMS_SIGN_NAME", "测试签名")
	t.Setenv("ALIYUN_SMS_TEMPLATE_CODE", "100001")

	err := ValidateSMSProviderEnv(true)
	if err == nil || !strings.Contains(err.Error(), "ALIYUN_SMS_ACCESS_KEY_SECRET") {
		t.Fatalf("expected missing secret error, got %v", err)
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
