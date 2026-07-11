package app

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type SMSProvider interface {
	SendCode(phone string, code string) error
	ExposeCode() bool
	Name() string
}

type mockSMSProvider struct{}

func (mockSMSProvider) SendCode(phone string, code string) error {
	log.Printf("[MOCK SMS] phone=%s code=%s", phone, code)
	return nil
}

func (mockSMSProvider) ExposeCode() bool {
	return true
}

func (mockSMSProvider) Name() string {
	return "mock"
}

type configErrorSMSProvider struct {
	name string
	err  error
}

func (p configErrorSMSProvider) SendCode(string, string) error {
	return p.err
}

func (p configErrorSMSProvider) ExposeCode() bool {
	return false
}

func (p configErrorSMSProvider) Name() string {
	return p.name
}

type httpSMSProvider struct {
	name         string
	endpoint     string
	authHeader   string
	headerName   string
	templateID   string
	templateSign string
	client       *http.Client
}

type smsHTTPRequest struct {
	Phone        string `json:"phone"`
	Code         string `json:"code"`
	TemplateID   string `json:"templateId,omitempty"`
	TemplateSign string `json:"templateSign,omitempty"`
	Provider     string `json:"provider,omitempty"`
}

type smsHTTPResponse struct {
	OK    *bool  `json:"ok,omitempty"`
	Error string `json:"error,omitempty"`
}

func (p httpSMSProvider) SendCode(phone string, code string) error {
	body, err := json.Marshal(smsHTTPRequest{
		Phone:        phone,
		Code:         code,
		TemplateID:   p.templateID,
		TemplateSign: p.templateSign,
		Provider:     p.name,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, p.endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if p.authHeader != "" {
		req.Header.Set(p.headerName, p.authHeader)
	}
	client := p.client
	if client == nil {
		client = newOutboundHTTPClient(8 * time.Second)
	}
	resp, err := client.Do(req)
	if err != nil {
		return &upstreamError{Service: p.name + " 短信", Err: err}
	}
	defer resp.Body.Close()
	responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return &upstreamError{Service: p.name + " 短信", Err: fmt.Errorf("HTTP %d %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))}
	}
	var parsed smsHTTPResponse
	if len(responseBody) > 0 && json.Unmarshal(responseBody, &parsed) == nil {
		if parsed.OK != nil && !*parsed.OK {
			if parsed.Error == "" {
				parsed.Error = "短信网关返回失败"
			}
			return &upstreamError{Service: p.name + " 短信", Err: errors.New(parsed.Error)}
		}
	}
	log.Printf("[%s SMS] dispatched phone=%s status=%d", p.name, maskPhoneForLog(phone), resp.StatusCode)
	return nil
}

func (p httpSMSProvider) ExposeCode() bool {
	return false
}

func (p httpSMSProvider) Name() string {
	return p.name
}

func newSMSProviderFromEnv() SMSProvider {
	provider := configuredSMSProvider()
	if err := validateSMSProviderEnv(provider, isProductionEnv()); err != nil {
		return configErrorSMSProvider{name: "configuration-error", err: err}
	}
	if provider == "" || provider == "mock" {
		return mockSMSProvider{}
	}
	headerName := firstEnv("SMS_HTTP_AUTH_HEADER_NAME")
	if headerName == "" {
		headerName = "Authorization"
	}
	return httpSMSProvider{
		name:         provider,
		endpoint:     smsEndpointFor(provider),
		authHeader:   smsAuthHeaderFor(provider),
		headerName:   headerName,
		templateID:   smsTemplateIDFor(provider),
		templateSign: smsTemplateSignFor(provider),
	}
}

func ValidateSMSProviderEnv(production bool) error {
	return validateSMSProviderEnv(configuredSMSProvider(), production)
}

func validateSMSProviderEnv(provider string, production bool) error {
	switch provider {
	case "":
		if production {
			return errors.New("生产环境必须设置 SMS_PROVIDER=http/aliyun/tencent，不能默认使用 mock 短信")
		}
		return nil
	case "mock":
		if production {
			return errors.New("生产环境禁止使用 SMS_PROVIDER=mock")
		}
		return nil
	case "http", "aliyun", "tencent":
		endpoint := smsEndpointFor(provider)
		if endpoint == "" {
			return fmt.Errorf("%s短信未配置发送接口，请设置 SMS_HTTP_ENDPOINT 或 provider 专属 HTTP endpoint", provider)
		}
		if production {
			parsed, err := url.Parse(endpoint)
			if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || parsed.Fragment != "" {
				return fmt.Errorf("%s短信发送接口必须是无内嵌凭证的 HTTPS URL", provider)
			}
		}
		return nil
	default:
		return fmt.Errorf("未知短信 provider: %s", provider)
	}
}

func configuredSMSProvider() string {
	return strings.TrimSpace(strings.ToLower(os.Getenv("SMS_PROVIDER")))
}

func isProductionEnv() bool {
	for _, key := range []string{"APP_ENV", "GO_ENV", "DRONE_ENV", "ENV"} {
		value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
		if value == "prod" || value == "production" {
			return true
		}
	}
	return false
}

func smsEndpointFor(provider string) string {
	switch provider {
	case "aliyun":
		return firstEnv("ALIYUN_SMS_HTTP_ENDPOINT", "SMS_HTTP_ENDPOINT")
	case "tencent":
		return firstEnv("TENCENT_SMS_HTTP_ENDPOINT", "SMS_HTTP_ENDPOINT")
	default:
		return firstEnv("SMS_HTTP_ENDPOINT")
	}
}

func smsAuthHeaderFor(provider string) string {
	switch provider {
	case "aliyun":
		if value := firstEnv("ALIYUN_SMS_HTTP_AUTH_HEADER", "SMS_HTTP_AUTH_HEADER"); value != "" {
			return value
		}
	case "tencent":
		if value := firstEnv("TENCENT_SMS_HTTP_AUTH_HEADER", "SMS_HTTP_AUTH_HEADER"); value != "" {
			return value
		}
	default:
		if value := firstEnv("SMS_HTTP_AUTH_HEADER"); value != "" {
			return value
		}
	}
	token := firstEnv("SMS_HTTP_AUTH_TOKEN")
	if token == "" {
		return ""
	}
	return "Bearer " + token
}

func smsTemplateIDFor(provider string) string {
	switch provider {
	case "aliyun":
		return firstEnv("ALIYUN_SMS_TEMPLATE_CODE", "SMS_HTTP_TEMPLATE_ID")
	case "tencent":
		return firstEnv("TENCENT_SMS_TEMPLATE_ID", "SMS_HTTP_TEMPLATE_ID")
	default:
		return firstEnv("SMS_HTTP_TEMPLATE_ID")
	}
}

func smsTemplateSignFor(provider string) string {
	switch provider {
	case "aliyun":
		return firstEnv("ALIYUN_SMS_SIGN_NAME", "SMS_HTTP_TEMPLATE_SIGN")
	case "tencent":
		return firstEnv("TENCENT_SMS_SIGN_NAME", "SMS_HTTP_TEMPLATE_SIGN")
	default:
		return firstEnv("SMS_HTTP_TEMPLATE_SIGN")
	}
}

func firstEnv(keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return ""
}

func maskPhoneForLog(phone string) string {
	trimmed := strings.TrimSpace(phone)
	if len(trimmed) <= 7 {
		return "***"
	}
	return trimmed[:3] + "****" + trimmed[len(trimmed)-4:]
}
