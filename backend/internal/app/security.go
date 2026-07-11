package app

import (
	"context"
	"errors"
	"net"
	"net/http"
	"strings"
	"time"
)

const maxJSONBodyBytes = 256 << 10

type actorContextKey struct{}

type requestActor struct {
	User *User
}

type accessError struct {
	Status  int
	Message string
}

func (e *accessError) Error() string { return e.Message }

func unauthorized(message string) error {
	return &accessError{Status: http.StatusUnauthorized, Message: message}
}

func forbidden(message string) error {
	return &accessError{Status: http.StatusForbidden, Message: message}
}

func notFound(message string) error {
	return &accessError{Status: http.StatusNotFound, Message: message}
}

func actorFromRequest(r *http.Request) *requestActor {
	actor, _ := r.Context().Value(actorContextKey{}).(*requestActor)
	return actor
}

func snapshotForRequest(state *DBShape, r *http.Request) *DBShape {
	actor := actorFromRequest(r)
	if actor == nil || actor.User == nil {
		return &DBShape{}
	}
	return snapshotForUser(state, actor.User)
}

func snapshotForUser(state *DBShape, user *User) *DBShape {
	if state == nil || user == nil {
		return &DBShape{}
	}
	if hasActiveRole(state, user, RoleAdmin) {
		return publicSnapshot(state)
	}

	out := &DBShape{SeededAt: state.SeededAt}
	visibleOrders := map[string]bool{}
	for _, order := range state.Orders {
		visible := order.ClientID == user.ID || order.PilotID == user.ID || orderOwnedBy(state, &order, user.ID)
		if !visible && order.Status == StatusMatching && (hasActiveRole(state, user, RolePilot) || hasActiveRole(state, user, RoleOwner)) {
			visible = true
		}
		if visible {
			out.Orders = append(out.Orders, order)
			visibleOrders[order.ID] = true
		}
	}

	for _, item := range state.Users {
		copy := item
		if item.ID != user.ID {
			copy.Phone = ""
			copy.LastLoginAt = ""
		}
		out.Users = append(out.Users, copy)
	}
	for _, item := range state.UserRoleProfiles {
		if item.UserID == user.ID || item.Status == RoleProfileActive {
			copy := item
			if item.UserID != user.ID {
				copy.CertificationID = ""
			}
			out.UserRoleProfiles = append(out.UserRoleProfiles, copy)
		}
	}
	out.Pilots = append(out.Pilots, state.Pilots...)
	out.Owners = append(out.Owners, state.Owners...)
	for _, item := range state.Clients {
		if item.UserID == user.ID {
			out.Clients = append(out.Clients, item)
		}
	}
	out.Drones = append(out.Drones, state.Drones...)
	out.Capacity = append(out.Capacity, state.Capacity...)

	for _, item := range state.PaymentOrders {
		if visibleOrders[item.OrderID] {
			out.PaymentOrders = append(out.PaymentOrders, item)
		}
	}
	for _, item := range state.Credits {
		if item.UserID == user.ID || item.Role == RolePilot || item.Role == RoleOwner {
			out.Credits = append(out.Credits, item)
		}
	}
	for _, item := range state.Policies {
		if visibleOrders[item.OrderID] {
			out.Policies = append(out.Policies, item)
		}
	}
	for _, item := range state.Claims {
		if visibleOrders[item.OrderID] {
			out.Claims = append(out.Claims, item)
		}
	}
	for _, item := range state.Airspace {
		if visibleOrders[item.OrderID] {
			out.Airspace = append(out.Airspace, item)
		}
	}
	for _, item := range state.Telemetry {
		if visibleOrders[item.OrderID] {
			out.Telemetry = append(out.Telemetry, item)
		}
	}
	for _, item := range state.Reviews {
		if visibleOrders[item.OrderID] {
			out.Reviews = append(out.Reviews, item)
		}
	}
	for _, item := range state.Wallets {
		if item.UserID == user.ID {
			out.Wallets = append(out.Wallets, item)
		}
	}
	for _, item := range state.Ledger {
		if item.UserID == user.ID {
			out.Ledger = append(out.Ledger, item)
		}
	}
	for _, item := range state.Notifications {
		if item.UserID == user.ID {
			out.Notifications = append(out.Notifications, item)
		}
	}
	for _, item := range state.AuthApplications {
		if item.UserID == user.ID {
			out.AuthApplications = append(out.AuthApplications, item)
		}
	}
	return out
}

func (s *Server) serializeMutations(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodOptions || r.Method == http.MethodHead {
			next.ServeHTTP(w, r)
			return
		}
		s.mutationMu.Lock()
		defer s.mutationMu.Unlock()
		next.ServeHTTP(w, r)
	})
}

func (s *Server) limitRequestBodies(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil && r.Method != http.MethodGet && r.Method != http.MethodHead && r.URL.Path != "/api/v1/provider/payment/notify" {
			r.Body = http.MaxBytesReader(w, r.Body, maxJSONBodyBytes)
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) allowSMSRequest(ip string) bool {
	s.smsRateMu.Lock()
	defer s.smsRateMu.Unlock()
	now := time.Now()
	cutoff := now.Add(-time.Hour)
	recent := s.smsIPAttempts[ip][:0]
	for _, attempt := range s.smsIPAttempts[ip] {
		if attempt.After(cutoff) {
			recent = append(recent, attempt)
		}
	}
	if len(recent) >= 20 {
		s.smsIPAttempts[ip] = recent
		return false
	}
	s.smsIPAttempts[ip] = append(recent, now)
	return true
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); forwarded != "" {
		return forwarded
	}
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}

func (s *Server) authorizeRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isPublicRequest(r, s.production) {
			next.ServeHTTP(w, r)
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
		if err := authorizeRoute(state, user, r); err != nil {
			writeAccessError(w, err)
			return
		}
		ctx := context.WithValue(r.Context(), actorContextKey{}, &requestActor{User: user})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func isPublicRequest(r *http.Request, production bool) bool {
	if r.Method == http.MethodOptions {
		return true
	}
	path := r.URL.Path
	switch path {
	case "/api/v1/health", "/api/v1/ready", "/api/v1/auth/send-code", "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/provider/payment/notify":
		return true
	case "/api/v1/snapshot", "/api/v1/reset":
		return !production
	default:
		return false
	}
}

func authorizeRoute(state *DBShape, user *User, r *http.Request) error {
	if user == nil {
		return unauthorized("缺少登录 token")
	}
	path := r.URL.Path
	if strings.HasPrefix(path, "/api/v1/auth/") {
		return nil
	}
	if path == "/api/v1/orders" {
		return requireActiveRole(state, user, RoleClient)
	}
	if strings.HasPrefix(path, "/api/v1/orders/") {
		return authorizeOrderRoute(state, user, r)
	}
	if strings.HasPrefix(path, "/api/v1/payments/") {
		return authorizePaymentRoute(state, user, path)
	}
	if path == "/api/v1/certifications" {
		if r.Method == http.MethodGet {
			return requireActiveRole(state, user, RoleAdmin)
		}
		return nil
	}
	if strings.HasPrefix(path, "/api/v1/certifications/") {
		return requireActiveRole(state, user, RoleAdmin)
	}
	if strings.HasPrefix(path, "/api/v1/provider/") {
		return nil
	}
	return nil
}

func authorizeOrderRoute(state *DBShape, user *User, r *http.Request) error {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/orders/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return notFound("订单不存在")
	}
	order := findOrder(state, parts[0])
	if order == nil {
		return notFound("订单不存在")
	}
	action := ""
	if len(parts) > 1 {
		action = parts[1]
	}
	if hasActiveRole(state, user, RoleAdmin) {
		return nil
	}
	switch action {
	case "candidates", "confirm", "review":
		if order.ClientID == user.ID && hasActiveRole(state, user, RoleClient) {
			return nil
		}
	case "advance", "finish":
		if order.PilotID == user.ID && hasActiveRole(state, user, RolePilot) {
			return nil
		}
	case "telemetry":
		if order.ClientID == user.ID || order.PilotID == user.ID || orderOwnedBy(state, order, user.ID) {
			return nil
		}
	case "airspace":
		if order.PilotID == user.ID && hasActiveRole(state, user, RolePilot) {
			return nil
		}
	default:
		if order.ClientID == user.ID || order.PilotID == user.ID || orderOwnedBy(state, order, user.ID) {
			return nil
		}
	}
	return notFound("订单不存在")
}

func authorizePaymentRoute(state *DBShape, user *User, path string) error {
	parts := strings.Split(strings.Trim(strings.TrimPrefix(path, "/api/v1/payments/"), "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return notFound("支付单不存在")
	}
	payment := findPaymentOrder(state, parts[0])
	if payment == nil {
		return notFound("支付单不存在")
	}
	order := findOrder(state, payment.OrderID)
	if order == nil {
		return notFound("支付单不存在")
	}
	if hasActiveRole(state, user, RoleAdmin) || (hasActiveRole(state, user, RoleClient) && order.ClientID == user.ID) {
		return nil
	}
	return notFound("支付单不存在")
}

func requireActiveRole(state *DBShape, user *User, role Role) error {
	if hasActiveRole(state, user, role) {
		return nil
	}
	return forbidden("当前账号没有所需业务权限")
}

func hasActiveRole(state *DBShape, user *User, role Role) bool {
	return user != nil && roleProfileActive(state, user.ID, role)
}

func orderOwnedBy(state *DBShape, order *Order, ownerID string) bool {
	if order == nil || ownerID == "" {
		return false
	}
	if order.CapacityID != "" {
		for _, capacity := range state.Capacity {
			if capacity.ID == order.CapacityID && capacity.OwnerID == ownerID {
				return true
			}
		}
	}
	if order.DroneID != "" {
		for _, drone := range state.Drones {
			if drone.ID == order.DroneID && drone.OwnerID == ownerID {
				return true
			}
		}
	}
	return false
}

func requireProviderOrderAccess(state *DBShape, actor *requestActor, order *Order, roles ...Role) error {
	if actor == nil || actor.User == nil {
		return unauthorized("缺少登录 token")
	}
	if hasActiveRole(state, actor.User, RoleAdmin) {
		return nil
	}
	for _, role := range roles {
		if !hasActiveRole(state, actor.User, role) {
			continue
		}
		switch role {
		case RoleClient:
			if order != nil && order.ClientID == actor.User.ID {
				return nil
			}
		case RolePilot:
			if order != nil && order.PilotID == actor.User.ID {
				return nil
			}
		case RoleOwner:
			if orderOwnedBy(state, order, actor.User.ID) {
				return nil
			}
		}
	}
	return notFound("订单不存在")
}

func writeAccessError(w http.ResponseWriter, err error) {
	var access *accessError
	if errors.As(err, &access) {
		writeJSON(w, access.Status, envelope{OK: false, Error: access.Message})
		return
	}
	writeError(w, err)
}
