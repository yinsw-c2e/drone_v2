package app

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-sql-driver/mysql"
)

type Server struct {
	store                   *Store
	resetEnabled            bool
	snapshotWriteEnabled    bool
	corsAllowOrigin         string
	smsProvider             SMSProvider
	providerBridge          *ProviderBridge
	requirePaidPayment      bool
	requireProviderReceipts bool
	production              bool
	mutationMu              sync.Mutex
	smsRateMu               sync.Mutex
	smsIPAttempts           map[string][]time.Time
}

type ServerOptions struct {
	ResetEnabled            bool
	SnapshotWriteEnabled    bool
	CORSAllowOrigin         string
	SMSProvider             SMSProvider
	ProviderBridge          *ProviderBridge
	RequirePaidPayment      bool
	RequireProviderReceipts bool
	Production              bool
}

func NewServer(store *Store) *Server {
	return NewServerWithOptions(store, ServerOptions{
		ResetEnabled:         true,
		SnapshotWriteEnabled: true,
		CORSAllowOrigin:      "*",
	})
}

func NewServerWithOptions(store *Store, options ServerOptions) *Server {
	origin := strings.TrimSpace(options.CORSAllowOrigin)
	if origin == "" {
		origin = "*"
	}
	smsProvider := options.SMSProvider
	if smsProvider == nil {
		smsProvider = newSMSProviderFromEnv()
	}
	providerBridge := options.ProviderBridge
	if providerBridge == nil {
		providerBridge = NewProviderBridgeFromEnv(options.RequirePaidPayment || options.RequireProviderReceipts)
	}
	return &Server{
		store:                   store,
		resetEnabled:            options.ResetEnabled,
		snapshotWriteEnabled:    options.SnapshotWriteEnabled,
		corsAllowOrigin:         origin,
		smsProvider:             smsProvider,
		providerBridge:          providerBridge,
		requirePaidPayment:      options.RequirePaidPayment,
		requireProviderReceipts: options.RequireProviderReceipts,
		production:              options.Production,
		smsIPAttempts:           map[string][]time.Time{},
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", s.health)
	mux.HandleFunc("/api/v1/ready", s.ready)
	mux.HandleFunc("/api/v1/snapshot", s.snapshot)
	mux.HandleFunc("/api/v1/reset", s.reset)
	mux.HandleFunc("/api/v1/auth/send-code", s.authSendCode)
	mux.HandleFunc("/api/v1/auth/register", s.authRegister)
	mux.HandleFunc("/api/v1/auth/login", s.authLogin)
	mux.HandleFunc("/api/v1/auth/logout", s.authLogout)
	mux.HandleFunc("/api/v1/auth/refresh", s.authRefresh)
	mux.HandleFunc("/api/v1/auth/me", s.authMe)
	mux.HandleFunc("/api/v1/auth/roles", s.authRoles)
	mux.HandleFunc("/api/v1/auth/switch-role", s.authSwitchRole)
	mux.HandleFunc("/api/v1/orders", s.orders)
	mux.HandleFunc("/api/v1/orders/", s.orderSubroutes)
	mux.HandleFunc("/api/v1/payments/", s.paymentSubroutes)
	mux.HandleFunc("/api/v1/provider/payment/prepay", s.providerPaymentPrepay)
	mux.HandleFunc("/api/v1/provider/payment/notify", s.providerPaymentNotify)
	mux.HandleFunc("/api/v1/provider/airspace/apply", s.providerAirspaceApply)
	mux.HandleFunc("/api/v1/provider/insurance/quote", s.providerInsuranceQuote)
	mux.HandleFunc("/api/v1/provider/credit/bureau-score", s.providerCreditScore)
	mux.HandleFunc("/api/v1/provider/drone/arm", s.providerDroneArm)
	mux.HandleFunc("/api/v1/certifications", s.certifications)
	mux.HandleFunc("/api/v1/certifications/", s.certificationSubroutes)
	return cors(requestSafety(s.limitRequestBodies(s.serializeMutations(s.authorizeRequests(mux)))), s.corsAllowOrigin)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "data": map[string]string{"status": "ok"}})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	if _, err := s.store.Load(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, envelope{OK: false, Error: "database is not ready"})
		return
	}
	if s.production {
		if err := ValidateSMSProviderEnv(true); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, envelope{OK: false, Error: "sms provider is not ready"})
			return
		}
		if err := ValidateProviderBridgeEnv(true); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, envelope{OK: false, Error: "integration provider is not ready"})
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "data": map[string]string{"status": "ready"}})
}

func (s *Server) snapshot(w http.ResponseWriter, r *http.Request) {
	if s.production {
		writeJSON(w, http.StatusNotFound, envelope{OK: false, Error: "snapshot endpoint is not available in production"})
		return
	}
	if r.Method == http.MethodPost {
		if !s.snapshotWriteEnabled {
			writeJSON(w, http.StatusForbidden, envelope{OK: false, Error: "snapshot write endpoint disabled"})
			return
		}
		s.saveSnapshot(w, r)
		return
	}
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"snapshot": publicSnapshot(state)}})
}

func (s *Server) saveSnapshot(w http.ResponseWriter, r *http.Request) {
	var raw json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeError(w, err)
		return
	}
	var wrapped snapshotRequest
	if err := json.Unmarshal(raw, &wrapped); err != nil {
		writeError(w, err)
		return
	}
	state := wrapped.Snapshot
	if state == nil {
		var direct DBShape
		if err := json.Unmarshal(raw, &direct); err != nil {
			writeError(w, err)
			return
		}
		state = &direct
	}
	if current, err := s.store.Load(r.Context()); err == nil {
		state.AuthSessions = current.AuthSessions
		state.SMSCodes = current.SMSCodes
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"snapshot": publicSnapshot(state)}})
}

func (s *Server) reset(w http.ResponseWriter, r *http.Request) {
	if s.production {
		writeJSON(w, http.StatusNotFound, envelope{OK: false, Error: "reset endpoint is not available in production"})
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if !s.resetEnabled {
		writeJSON(w, http.StatusForbidden, envelope{OK: false, Error: "reset endpoint disabled"})
		return
	}
	state, err := s.store.Reset(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"snapshot": publicSnapshot(state)}})
}

func (s *Server) authSendCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if !s.allowSMSRequest(clientIP(r)) {
		writeJSON(w, http.StatusTooManyRequests, envelope{OK: false, Error: "验证码请求过于频繁，请稍后再试"})
		return
	}
	var req authPhoneRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	code, err := issueSMSCode(state, req.Phone)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.smsProvider.SendCode(code.Phone, code.Code); err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	data := map[string]any{"phone": code.Phone, "expiresAt": code.ExpiresAt, "provider": s.smsProvider.Name()}
	if s.smsProvider.ExposeCode() {
		data["mockCode"] = code.Code
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: data})
}

func (s *Server) authRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req authRegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	payload, err := registerWithCode(state, req.Phone, req.Code, req.Nickname, req.InitialRole)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	payload.Snapshot = snapshotForUser(state, payload.User)
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: payload})
}

func (s *Server) authLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req authLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	payload, err := loginWithCode(state, req.Phone, req.Code)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	payload.Snapshot = snapshotForUser(state, payload.User)
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: payload})
}

func (s *Server) authRefresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req authRefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	payload, err := refreshAuthSession(state, req.token())
	if err != nil {
		writeUnauthorized(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: payload})
}

func (s *Server) authMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	payload, err := authMe(state, bearerToken(r))
	if err != nil {
		writeUnauthorized(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: payload})
}

func (s *Server) authLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req authRefreshRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	logoutAuthSession(state, bearerToken(r), req.token())
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) authRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req authRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	user, _, err := authUserByAccessToken(state, bearerToken(r))
	if err != nil {
		writeUnauthorized(w, err)
		return
	}
	profile, err := requestUserRole(state, user.ID, req.Role)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"role": profile, "user": user, "roles": rolesForUser(state, user.ID), "snapshot": snapshotForUser(state, user)}})
}

func (s *Server) authSwitchRole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req authRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	user, _, err := authUserByAccessToken(state, bearerToken(r))
	if err != nil {
		writeUnauthorized(w, err)
		return
	}
	payload, err := switchUserRole(state, user.ID, req.Role)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	payload.Snapshot = snapshotForUser(state, payload.User)
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: payload})
}

func (s *Server) orders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req submitOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	actor := actorFromRequest(r)
	if actor == nil || actor.User == nil {
		writeUnauthorized(w, errors.New("缺少登录 token"))
		return
	}
	req.ClientID = actor.User.ID
	if s.production {
		if err := validateProductionOrderFiles(req.Photos); err != nil {
			writeError(w, err)
			return
		}
	}
	order, err := submitOrderWithOptions(state, req, !s.requireProviderReceipts)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) certifications(w http.ResponseWriter, r *http.Request) {
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	if r.Method == http.MethodGet {
		status := AuditStatus(r.URL.Query().Get("status"))
		items := state.AuthApplications
		if status != "" {
			items = make([]CertificationApplication, 0, len(state.AuthApplications))
			for _, app := range state.AuthApplications {
				if app.Status == status {
					items = append(items, app)
				}
			}
		}
		writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"applications": items, "snapshot": snapshotForRequest(state, r)}})
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req certificationSubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	actor := actorFromRequest(r)
	if actor == nil || actor.User == nil {
		writeUnauthorized(w, errors.New("缺少登录 token"))
		return
	}
	req.UserID = actor.User.ID
	if findRoleProfile(state, req.UserID, req.Role) == nil {
		writeAccessError(w, forbidden("请先申请该业务身份，再提交认证材料"))
		return
	}
	if s.production {
		if err := validateProductionCertificationFiles(req.Fields); err != nil {
			writeError(w, err)
			return
		}
	}
	app, err := submitCertification(state, req.Role, req.UserID, req.Fields)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"application": app, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) certificationSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/certifications/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 || parts[0] == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	appID := parts[0]
	action := parts[1]
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	var app *CertificationApplication
	switch action {
	case "approve":
		app, err = approveCertification(state, appID)
	case "reject":
		app, err = rejectCertification(state, appID)
	default:
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"application": app, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) orderSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/orders/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	orderID := parts[0]
	action := ""
	if len(parts) > 1 {
		action = parts[1]
	}
	switch action {
	case "candidates":
		s.candidates(w, r, orderID)
	case "confirm":
		s.confirm(w, r, orderID)
	case "advance":
		s.advance(w, r, orderID)
	case "airspace":
		s.decideAirspace(w, r, orderID)
	case "telemetry":
		s.telemetry(w, r, orderID)
	case "finish":
		s.finish(w, r, orderID)
	case "review":
		s.review(w, r, orderID)
	default:
		w.WriteHeader(http.StatusNotFound)
	}
}

func (s *Server) paymentSubroutes(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/payments/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] != "sync" {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	payment := findPaymentOrder(state, parts[0])
	if payment == nil {
		writeError(w, errors.New("支付单不存在"))
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"payment": payment, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) candidates(w http.ResponseWriter, r *http.Request, orderID string) {
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	strategy := r.URL.Query().Get("strategy")
	items, err := candidatesForOrderWithOptions(state, orderID, strategy, !s.requireProviderReceipts)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"candidates": items, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) confirm(w http.ResponseWriter, r *http.Request, orderID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req confirmRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	order, err := confirmOrderWithPaymentOptions(state, orderID, req.CapacityID, req.PaymentID, s.requirePaidPayment, s.requireProviderReceipts, !s.requireProviderReceipts)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "payment": findPaymentOrder(state, req.PaymentID), "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) advance(w http.ResponseWriter, r *http.Request, orderID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	if s.requireProviderReceipts {
		current := findOrder(state, orderID)
		if current != nil && current.Status == StatusConfirmed {
			req := ProviderAirspaceApplyRequest{OrderID: current.ID, Area: airspaceAreaForOrder(current), AltitudeM: 120}
			now := time.Now()
			req.Window = TimeWindow{Start: now.Format(time.RFC3339Nano), End: now.Add(90 * time.Minute).Format(time.RFC3339Nano)}
			result, err := s.providerBridge.AirspaceApply(r.Context(), req)
			if err != nil {
				writeError(w, err)
				return
			}
			airspace := upsertProviderAirspace(state, current.ID, req, result)
			order, err := transition(state, current.ID, StatusAirspaceApplying, RolePilot, "提交空域申请")
			if err != nil {
				writeError(w, err)
				return
			}
			recordAudit(state, ActionAirspace, "provider-bridge", RoleAdmin, "airspace", airspace.ID, "空域平台申请已提交："+airspace.ProviderRequestID)
			if err := s.store.Save(r.Context(), state); err != nil {
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "airspace": airspace, "snapshot": snapshotForRequest(state, r)}})
			return
		}
	}
	order, err := advanceOrderWithOptions(state, orderID, s.requireProviderReceipts)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) decideAirspace(w http.ResponseWriter, r *http.Request, orderID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if s.requireProviderReceipts {
		writeJSON(w, http.StatusForbidden, envelope{OK: false, Error: "生产环境禁用本地空域审批，请使用空域 provider 回执"})
		return
	}
	var req airspaceDecisionRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	order, airspace, err := decideAirspace(state, orderID, req.Status)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "airspace": airspace, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) telemetry(w http.ResponseWriter, r *http.Request, orderID string) {
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	if findOrder(state, orderID) == nil {
		writeError(w, errors.New("订单不存在"))
		return
	}
	if r.Method == http.MethodGet {
		writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"telemetry": latestTelemetry(state, orderID), "snapshot": snapshotForRequest(state, r)}})
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if s.requireProviderReceipts {
		writeJSON(w, http.StatusForbidden, envelope{OK: false, Error: "生产环境禁用普通遥测写入，请使用设备/provider遥测入口"})
		return
	}
	var req telemetryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	snapshot := upsertTelemetry(state, orderID, req.Frame, req.Source)
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"telemetry": snapshot, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) finish(w http.ResponseWriter, r *http.Request, orderID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	order, err := finishOrderWithOptions(state, orderID, s.requireProviderReceipts)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) review(w http.ResponseWriter, r *http.Request, orderID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req reviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	review, err := reviewOrder(state, orderID, req.Star, req.Text)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"review": review, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) providerPaymentPrepay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req ProviderPaymentPrepayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	order := findOrder(state, req.OrderID)
	if order == nil {
		writeError(w, errors.New("订单不存在"))
		return
	}
	if err := requireProviderOrderAccess(state, actorFromRequest(r), order, RoleClient); err != nil {
		writeAccessError(w, err)
		return
	}
	if err := preparePaymentPrepayRequest(state, order, &req, s.requirePaidPayment); err != nil {
		writeError(w, err)
		return
	}
	if req.AmountCent <= 0 {
		writeError(w, errors.New("支付金额必须大于 0"))
		return
	}
	result, err := s.providerBridge.PaymentPrepay(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	if result.PaidCent != req.AmountCent {
		writeError(w, errors.New("支付供应商预下单金额与服务端报价不一致"))
		return
	}
	now := nowISO()
	payment := PaymentOrder{
		ID:              genID("pay"),
		OrderID:         req.OrderID,
		AmountCent:      result.PaidCent,
		Mode:            fallback(result.Mode, req.Mode),
		Status:          PaymentPending,
		Provider:        fallback(result.Provider, "provider-bridge"),
		ProviderTradeNo: result.TradeNo,
		PrepayID:        result.PrepayID,
		SDKParams:       result.SDKParams,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if s.providerBridge.sandbox {
		payment.Status = PaymentPaid
		payment.PaidAt = now
	}
	state.PaymentOrders = append(state.PaymentOrders, payment)
	recordAudit(state, ActionPayment, order.ClientID, RoleClient, "payment", payment.ID, "支付预下单已提交至"+payment.Provider)
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	response := PaymentPrepayResponse{
		PaymentID: payment.ID,
		TradeNo:   payment.ProviderTradeNo,
		PaidCent:  payment.AmountCent,
		Mode:      payment.Mode,
		Status:    payment.Status,
		Provider:  payment.Provider,
		SDKParams: payment.SDKParams,
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: response})
}

func (s *Server) providerPaymentNotify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	body, err := io.ReadAll(io.LimitReader(r.Body, 64*1024))
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.providerBridge.VerifyPaymentNotification(body, paymentSignature(r)); err != nil {
		writeError(w, err)
		return
	}
	note, err := decodePaymentNotification(body)
	if err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	payment, changed, err := applyPaymentNotification(state, note)
	if err != nil {
		writeError(w, err)
		return
	}
	if changed {
		recordAudit(state, ActionPayment, "payment-provider", RoleAdmin, "payment", payment.ID, "支付回调验签通过，状态="+string(payment.Status))
		if err := s.store.Save(r.Context(), state); err != nil {
			writeError(w, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"payment": payment}})
}

func (s *Server) providerAirspaceApply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req ProviderAirspaceApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	order := findOrder(state, req.OrderID)
	if order == nil {
		writeError(w, errors.New("订单不存在"))
		return
	}
	if err := requireProviderOrderAccess(state, actorFromRequest(r), order, RolePilot); err != nil {
		writeAccessError(w, err)
		return
	}
	if s.requireProviderReceipts {
		req.Area = airspaceAreaForOrder(order)
		req.AltitudeM = 120
		now := time.Now()
		req.Window = TimeWindow{Start: now.Format(time.RFC3339Nano), End: now.Add(90 * time.Minute).Format(time.RFC3339Nano)}
	} else if len(req.Area) == 0 {
		req.Area = airspaceAreaForOrder(order)
	}
	if req.AltitudeM == 0 {
		req.AltitudeM = 120
	}
	if req.Window.Start == "" || req.Window.End == "" {
		now := time.Now()
		req.Window = TimeWindow{Start: now.Format(time.RFC3339Nano), End: now.Add(90 * time.Minute).Format(time.RFC3339Nano)}
	}
	result, err := s.providerBridge.AirspaceApply(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	airspace := upsertProviderAirspace(state, order.ID, req, result)
	recordAudit(state, ActionAirspace, "provider-bridge", RoleAdmin, "airspace", airspace.ID, "空域平台回执："+airspace.ProviderRequestID)
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"airspace": airspace, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) providerInsuranceQuote(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req ProviderInsuranceQuoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	order := findOrder(state, req.OrderID)
	if order == nil {
		writeError(w, errors.New("订单不存在"))
		return
	}
	if err := requireProviderOrderAccess(state, actorFromRequest(r), order, RoleClient); err != nil {
		writeAccessError(w, err)
		return
	}
	req.CargoType = order.Cargo.Type
	req.ValueCent = order.Cargo.ValueCent
	result, err := s.providerBridge.InsuranceQuote(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	policy := upsertProviderPolicy(state, order, result)
	recordAudit(state, ActionInsurance, "provider-bridge", RoleAdmin, "policy", policy.ID, "保险供应商回执："+policy.ProviderPolicyNo)
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"premiumCent": policy.PremiumCent, "insuredAmountCent": policy.InsuredAmountCent, "policy": policy, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) providerCreditScore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req ProviderCreditScoreRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	actor := actorFromRequest(r)
	if actor == nil || actor.User == nil {
		writeUnauthorized(w, errors.New("缺少登录 token"))
		return
	}
	if !hasActiveRole(state, actor.User, RoleAdmin) {
		if !hasActiveRole(state, actor.User, actor.User.CurrentRole) {
			writeAccessError(w, forbidden("当前业务身份尚未激活"))
			return
		}
		req.UserID = actor.User.ID
		req.Role = actor.User.CurrentRole
	}
	result, err := s.providerBridge.CreditScore(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	credit := upsertProviderCredit(state, result, req.Role)
	recordAudit(state, ActionRisk, "provider-bridge", RoleAdmin, "credit", credit.UserID, "征信供应商流水："+credit.ProviderTraceID)
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"userId": credit.UserID, "score": credit.Total, "credit": credit, "snapshot": snapshotForRequest(state, r)}})
}

func (s *Server) providerDroneArm(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req ProviderDroneArmRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, err)
		return
	}
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	actor := actorFromRequest(r)
	if req.OrderID == "" && actor != nil && actor.User != nil {
		for i := range state.Orders {
			candidate := &state.Orders[i]
			if candidate.DroneID == req.DroneID && candidate.PilotID == actor.User.ID && candidate.Status != StatusCompleted && candidate.Status != StatusSettled && candidate.Status != StatusCancelled {
				req.OrderID = candidate.ID
				break
			}
		}
	}
	order := findOrder(state, req.OrderID)
	if order == nil {
		writeAccessError(w, notFound("订单不存在"))
		return
	}
	if err := requireProviderOrderAccess(state, actor, order, RolePilot); err != nil {
		writeAccessError(w, err)
		return
	}
	if order.DroneID == "" || req.DroneID != order.DroneID {
		writeAccessError(w, notFound("订单未绑定该无人机"))
		return
	}
	result, err := s.providerBridge.DroneArm(r.Context(), req)
	if err != nil {
		writeError(w, err)
		return
	}
	if result.Frame != nil && req.OrderID != "" {
		snapshot := upsertTelemetry(state, req.OrderID, *result.Frame, "device")
		snapshot.Provider = result.Provider
		snapshot.DeviceSN = result.DeviceSN
	}
	recordAudit(state, ActionRisk, "provider-bridge", RoleAdmin, "drone", result.DroneID, "无人机 arm 回执："+result.Provider)
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"droneId": result.DroneID, "ready": result.Ready, "provider": result.Provider, "snapshot": snapshotForRequest(state, r)}})
}

func paymentSignature(r *http.Request) string {
	for _, key := range []string{"X-Provider-Signature", "Wechatpay-Signature", "X-Wechatpay-Signature"} {
		if value := strings.TrimSpace(r.Header.Get(key)); value != "" {
			return value
		}
	}
	return ""
}

func preparePaymentPrepayRequest(state *DBShape, order *Order, req *ProviderPaymentPrepayRequest, requireServerQuote bool) error {
	if !requireServerQuote {
		return nil
	}
	if req.CapacityID == "" {
		return errors.New("支付预下单缺少 capacityId")
	}
	candidates, err := candidatesForOrderWithOptions(state, order.ID, "global", false)
	if err != nil {
		return err
	}
	for _, candidate := range candidates {
		if candidate.CapacityID == req.CapacityID {
			req.AmountCent = candidate.QuoteCent
			return nil
		}
	}
	return errors.New("所选运力已不满足合规条件，请重新匹配")
}

func validateProductionCertificationFiles(fields map[string]any) error {
	raw, ok := fields["idPhotos"]
	if !ok {
		return errors.New("生产认证必须先上传身份证明材料到私有对象存储")
	}
	items, ok := raw.([]any)
	if !ok || len(items) == 0 {
		return errors.New("生产认证材料格式无效")
	}
	for _, item := range items {
		value, ok := item.(string)
		if !ok || !strings.HasPrefix(strings.ToLower(strings.TrimSpace(value)), "https://") {
			return errors.New("生产认证材料必须使用 HTTPS 对象存储地址")
		}
	}
	return nil
}

func validateProductionOrderFiles(photos []string) error {
	for _, value := range photos {
		if !strings.HasPrefix(strings.ToLower(strings.TrimSpace(value)), "https://") {
			return errors.New("生产货物图片必须先上传到私有对象存储")
		}
	}
	return nil
}

func airspaceAreaForOrder(order *Order) []GeoPoint {
	return []GeoPoint{
		order.From,
		{Lng: order.From.Lng, Lat: order.To.Lat},
		order.To,
		{Lng: order.To.Lng, Lat: order.From.Lat},
	}
}

func upsertProviderAirspace(state *DBShape, orderID string, req ProviderAirspaceApplyRequest, result *ProviderAirspaceApplyResult) *AirspaceRequest {
	airspace := firstAirspace(state, orderID)
	if airspace == nil {
		state.Airspace = append(state.Airspace, AirspaceRequest{ID: genID("air"), OrderID: orderID})
		airspace = &state.Airspace[len(state.Airspace)-1]
	}
	airspace.Area = req.Area
	airspace.AltitudeM = req.AltitudeM
	airspace.Window = req.Window
	airspace.Status = normalizeAirspaceProviderStatus(result.Status)
	airspace.Provider = result.Provider
	airspace.ProviderRequestID = result.RequestID
	airspace.ApprovalNo = result.ApprovalNo
	airspace.ValidFrom = result.ValidFrom
	airspace.ValidTo = result.ValidTo
	airspace.RouteGeometry = result.RouteGeometry
	return airspace
}

func normalizeAirspaceProviderStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "approved", "rejected":
		return strings.ToLower(strings.TrimSpace(status))
	default:
		return "submitted"
	}
}

func upsertProviderPolicy(state *DBShape, order *Order, result *ProviderInsuranceQuoteResult) *InsurancePolicy {
	policy := providerPolicyForOrder(state, order.ID)
	if policy == nil {
		state.Policies = append(state.Policies, InsurancePolicy{ID: genID("pol"), OrderID: order.ID})
		policy = &state.Policies[len(state.Policies)-1]
	}
	coverages := result.Coverages
	if len(coverages) == 0 {
		coverages = []string{"provider-coverage"}
	}
	policy.CargoType = order.Cargo.Type
	policy.Coverages = coverages
	policy.InsuredAmountCent = result.InsuredAmountCent
	policy.PremiumCent = result.PremiumCent
	policy.Status = "active"
	policy.Provider = result.Provider
	policy.ProviderPolicyNo = result.PolicyNo
	policy.ProviderQuoteID = result.QuoteID
	policy.ActivatedAt = fallback(result.ActivatedAt, nowISO())
	order.PolicyID = policy.ID
	return policy
}

func upsertProviderCredit(state *DBShape, result *ProviderCreditScoreResult, role Role) *CreditScore {
	if role == "" {
		role = RoleClient
	}
	for i := range state.Credits {
		if state.Credits[i].UserID == result.UserID && state.Credits[i].Role == role {
			state.Credits[i].Total = result.Score
			state.Credits[i].Level = creditLevel(result.Score)
			state.Credits[i].Provider = result.Provider
			state.Credits[i].ProviderTraceID = result.ProviderTraceID
			state.Credits[i].AuthorizedAt = result.AuthorizedAt
			state.Credits[i].ExpiresAt = result.ExpiresAt
			return &state.Credits[i]
		}
	}
	state.Credits = append(state.Credits, CreditScore{
		UserID: result.UserID, Role: role, Total: result.Score, Level: creditLevel(result.Score),
		Provider: result.Provider, ProviderTraceID: result.ProviderTraceID, AuthorizedAt: result.AuthorizedAt, ExpiresAt: result.ExpiresAt,
	})
	return &state.Credits[len(state.Credits)-1]
}

func creditLevel(score int) string {
	switch {
	case score >= 900:
		return "A"
	case score >= 750:
		return "B"
	case score >= 600:
		return "C"
	default:
		return "D"
	}
}

type envelope struct {
	OK    bool   `json:"ok"`
	Data  any    `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

type submitOrderRequest struct {
	ClientID        string    `json:"clientId"`
	CargoType       CargoType `json:"cargoType"`
	WeightKg        float64   `json:"weightKg"`
	ValueCent       int       `json:"valueCent"`
	BudgetCent      int       `json:"budgetCent"`
	Insured         bool      `json:"insured"`
	ShockProof      bool      `json:"shockProof"`
	TempControl     bool      `json:"tempControl,omitempty"`
	Special         string    `json:"special,omitempty"`
	Remark          string    `json:"remark,omitempty"`
	Volume          string    `json:"volume,omitempty"`
	Photos          []string  `json:"photos,omitempty"`
	TimeMode        string    `json:"timeMode,omitempty"`
	ScheduledAt     string    `json:"scheduledAt,omitempty"`
	TimeRequirement string    `json:"timeRequirement,omitempty"`
	PaymentMode     string    `json:"paymentMode,omitempty"`
	InvoiceTitle    string    `json:"invoiceTitle,omitempty"`
	From            GeoPoint  `json:"from"`
	To              GeoPoint  `json:"to"`
}

type authPhoneRequest struct {
	Phone string `json:"phone"`
}

type authLoginRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

type authRegisterRequest struct {
	Phone       string `json:"phone"`
	Code        string `json:"code"`
	Nickname    string `json:"nickname"`
	InitialRole Role   `json:"initialRole"`
}

type authRefreshRequest struct {
	RefreshToken       string `json:"refreshToken"`
	RefreshTokenLegacy string `json:"refresh_token"`
}

func (r authRefreshRequest) token() string {
	if strings.TrimSpace(r.RefreshToken) != "" {
		return r.RefreshToken
	}
	return r.RefreshTokenLegacy
}

type authRoleRequest struct {
	Role Role `json:"role"`
}

type certificationSubmitRequest struct {
	UserID string         `json:"userId"`
	Role   Role           `json:"role"`
	Fields map[string]any `json:"fields"`
}

type confirmRequest struct {
	CapacityID string `json:"capacityId"`
	PaymentID  string `json:"paymentId,omitempty"`
}

type reviewRequest struct {
	Star int    `json:"star"`
	Text string `json:"text"`
}

type airspaceDecisionRequest struct {
	Status string `json:"status"`
}

type telemetryRequest struct {
	Frame  Telemetry `json:"frame"`
	Source string    `json:"source"`
}

type snapshotRequest struct {
	Snapshot *DBShape `json:"snapshot"`
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("content-type", "application/json; charset=utf-8")
	w.Header().Set("cache-control", "no-store")
	w.Header().Set("pragma", "no-cache")
	w.Header().Set("x-content-type-options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, err error) {
	var rateLimit *rateLimitError
	if errors.As(err, &rateLimit) {
		writeJSON(w, http.StatusTooManyRequests, envelope{OK: false, Error: rateLimit.Message})
		return
	}
	if isProductionEnv() {
		var upstream *upstreamError
		if errors.As(err, &upstream) {
			log.Printf("upstream request failed: %v", err)
			writeJSON(w, http.StatusBadGateway, envelope{OK: false, Error: "外部服务暂不可用，请稍后重试"})
			return
		}
		var databaseError *mysql.MySQLError
		if errors.As(err, &databaseError) {
			log.Printf("database request failed: %v", err)
			writeJSON(w, http.StatusInternalServerError, envelope{OK: false, Error: "服务内部错误，请稍后重试"})
			return
		}
	}
	writeJSON(w, http.StatusBadRequest, envelope{OK: false, Error: err.Error()})
}

func writeUnauthorized(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusUnauthorized, envelope{OK: false, Error: err.Error()})
}

func bearerToken(r *http.Request) string {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if len(header) >= 7 && strings.EqualFold(header[:7], "Bearer ") {
		return strings.TrimSpace(header[7:])
	}
	return ""
}

func cors(next http.Handler, allowOrigin string) http.Handler {
	allowed := map[string]bool{}
	wildcard := false
	for _, origin := range strings.Split(allowOrigin, ",") {
		origin = strings.TrimSpace(origin)
		if origin == "*" {
			wildcard = true
		} else if origin != "" {
			allowed[origin] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := strings.TrimSpace(r.Header.Get("Origin"))
		if wildcard {
			w.Header().Set("access-control-allow-origin", "*")
		} else if allowed[origin] {
			w.Header().Set("access-control-allow-origin", origin)
			w.Header().Add("Vary", "Origin")
		}
		w.Header().Set("access-control-allow-methods", "GET,POST,OPTIONS")
		w.Header().Set("access-control-allow-headers", "authorization,content-type")
		if r.Method == http.MethodOptions {
			if !wildcard && origin != "" && !allowed[origin] {
				writeJSON(w, http.StatusForbidden, envelope{OK: false, Error: "origin is not allowed"})
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
