package app

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type Server struct {
	store                *Store
	resetEnabled         bool
	snapshotWriteEnabled bool
	corsAllowOrigin      string
}

type ServerOptions struct {
	ResetEnabled         bool
	SnapshotWriteEnabled bool
	CORSAllowOrigin      string
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
	return &Server{
		store:                store,
		resetEnabled:         options.ResetEnabled,
		snapshotWriteEnabled: options.SnapshotWriteEnabled,
		corsAllowOrigin:      origin,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", s.health)
	mux.HandleFunc("/api/v1/snapshot", s.snapshot)
	mux.HandleFunc("/api/v1/reset", s.reset)
	mux.HandleFunc("/api/v1/orders", s.orders)
	mux.HandleFunc("/api/v1/orders/", s.orderSubroutes)
	return cors(mux, s.corsAllowOrigin)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "data": map[string]string{"status": "ok"}})
}

func (s *Server) snapshot(w http.ResponseWriter, r *http.Request) {
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
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"snapshot": state}})
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
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"snapshot": state}})
}

func (s *Server) reset(w http.ResponseWriter, r *http.Request) {
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
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"snapshot": state}})
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
	order, err := submitOrder(state, req)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "snapshot": state}})
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

func (s *Server) candidates(w http.ResponseWriter, r *http.Request, orderID string) {
	state, err := s.store.Load(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	strategy := r.URL.Query().Get("strategy")
	items, err := candidatesForOrder(state, orderID, strategy)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"candidates": items, "snapshot": state}})
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
	order, err := confirmOrder(state, orderID, req.CapacityID)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "snapshot": state}})
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
	order, err := advanceOrder(state, orderID)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "snapshot": state}})
}

func (s *Server) decideAirspace(w http.ResponseWriter, r *http.Request, orderID string) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
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
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "airspace": airspace, "snapshot": state}})
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
		writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"telemetry": latestTelemetry(state, orderID), "snapshot": state}})
		return
	}
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
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
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"telemetry": snapshot, "snapshot": state}})
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
	order, err := finishOrder(state, orderID)
	if err != nil {
		writeError(w, err)
		return
	}
	if err := s.store.Save(r.Context(), state); err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"order": order, "snapshot": state}})
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
	writeJSON(w, http.StatusOK, envelope{OK: true, Data: map[string]any{"review": review, "snapshot": state}})
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

type confirmRequest struct {
	CapacityID string `json:"capacityId"`
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
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusBadRequest, envelope{OK: false, Error: err.Error()})
}

func cors(next http.Handler, allowOrigin string) http.Handler {
	if strings.TrimSpace(allowOrigin) == "" {
		allowOrigin = "*"
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("access-control-allow-origin", allowOrigin)
		w.Header().Set("access-control-allow-methods", "GET,POST,OPTIONS")
		w.Header().Set("access-control-allow-headers", "content-type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
