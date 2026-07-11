package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

type collection struct {
	table string
	items func(*DBShape) []any
	set   func(*DBShape, []json.RawMessage) error
}

var collections = []collection{
	{"users", func(s *DBShape) []any { return anySlice(s.Users) }, setJSON[User](func(s *DBShape, v []User) { s.Users = v })},
	{"user_role_profiles", func(s *DBShape) []any { return anySlice(s.UserRoleProfiles) }, setJSON[UserRoleProfile](func(s *DBShape, v []UserRoleProfile) { s.UserRoleProfiles = v })},
	{"auth_sessions", func(s *DBShape) []any { return anySlice(s.AuthSessions) }, setJSON[AuthSession](func(s *DBShape, v []AuthSession) { s.AuthSessions = v })},
	{"sms_codes", func(s *DBShape) []any { return anySlice(s.SMSCodes) }, setJSON[SMSCode](func(s *DBShape, v []SMSCode) { s.SMSCodes = v })},
	{"pilots", func(s *DBShape) []any { return anySlice(s.Pilots) }, setJSON[PilotProfile](func(s *DBShape, v []PilotProfile) { s.Pilots = v })},
	{"owners", func(s *DBShape) []any { return anySlice(s.Owners) }, setJSON[OwnerProfile](func(s *DBShape, v []OwnerProfile) { s.Owners = v })},
	{"clients", func(s *DBShape) []any { return anySlice(s.Clients) }, setJSON[ClientProfile](func(s *DBShape, v []ClientProfile) { s.Clients = v })},
	{"drones", func(s *DBShape) []any { return anySlice(s.Drones) }, setJSON[Drone](func(s *DBShape, v []Drone) { s.Drones = v })},
	{"capacity_units", func(s *DBShape) []any { return anySlice(s.Capacity) }, setJSON[CapacityUnit](func(s *DBShape, v []CapacityUnit) { s.Capacity = v })},
	{"orders", func(s *DBShape) []any { return anySlice(s.Orders) }, setJSON[Order](func(s *DBShape, v []Order) { s.Orders = v })},
	{"payment_orders", func(s *DBShape) []any { return anySlice(s.PaymentOrders) }, setJSON[PaymentOrder](func(s *DBShape, v []PaymentOrder) { s.PaymentOrders = v })},
	{"credits", func(s *DBShape) []any { return anySlice(s.Credits) }, setJSON[CreditScore](func(s *DBShape, v []CreditScore) { s.Credits = v })},
	{"policies", func(s *DBShape) []any { return anySlice(s.Policies) }, setJSON[InsurancePolicy](func(s *DBShape, v []InsurancePolicy) { s.Policies = v })},
	{"claims", func(s *DBShape) []any { return anySlice(s.Claims) }, setJSON[Claim](func(s *DBShape, v []Claim) { s.Claims = v })},
	{"airspace_requests", func(s *DBShape) []any { return anySlice(s.Airspace) }, setJSON[AirspaceRequest](func(s *DBShape, v []AirspaceRequest) { s.Airspace = v })},
	{"telemetry_snapshots", func(s *DBShape) []any { return anySlice(s.Telemetry) }, setJSON[TelemetrySnapshot](func(s *DBShape, v []TelemetrySnapshot) { s.Telemetry = v })},
	{"reviews", func(s *DBShape) []any { return anySlice(s.Reviews) }, setJSON[Review](func(s *DBShape, v []Review) { s.Reviews = v })},
	{"wallets", func(s *DBShape) []any { return anySlice(s.Wallets) }, setJSON[Wallet](func(s *DBShape, v []Wallet) { s.Wallets = v })},
	{"ledger_entries", func(s *DBShape) []any { return anySlice(s.Ledger) }, setJSON[LedgerEntry](func(s *DBShape, v []LedgerEntry) { s.Ledger = v })},
	{"notifications", func(s *DBShape) []any { return anySlice(s.Notifications) }, setJSON[Notification](func(s *DBShape, v []Notification) { s.Notifications = v })},
	{"certification_applications", func(s *DBShape) []any { return anySlice(s.AuthApplications) }, setJSON[CertificationApplication](func(s *DBShape, v []CertificationApplication) { s.AuthApplications = v })},
	{"audit_logs", func(s *DBShape) []any { return anySlice(s.AuditLogs) }, setJSON[AuditLog](func(s *DBShape, v []AuditLog) { s.AuditLogs = v })},
}

func (s *Store) EnsureSchema(ctx context.Context) error {
	for _, coll := range collections {
		stmt := fmt.Sprintf(`CREATE TABLE IF NOT EXISTS %s (
			id VARCHAR(96) PRIMARY KEY,
			doc JSON NOT NULL,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`, coll.table)
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("create %s: %w", coll.table, err)
		}
	}
	return nil
}

func (s *Store) SeedIfEmpty(ctx context.Context, allowDemoSeed bool) error {
	var count int
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	seed, err := seedForEmptyStore(allowDemoSeed)
	if err != nil {
		return err
	}
	return s.Save(ctx, seed)
}

func seedForEmptyStore(allowDemoSeed bool) (*DBShape, error) {
	if !allowDemoSeed {
		return nil, fmt.Errorf("production database is empty; explicit bootstrap is required")
	}
	seed := buildSeed()
	return &seed, nil
}

func (s *Store) Reset(ctx context.Context) (*DBShape, error) {
	seed := buildSeed()
	if err := s.Save(ctx, &seed); err != nil {
		return nil, err
	}
	return &seed, nil
}

func (s *Store) Load(ctx context.Context) (*DBShape, error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	state := &DBShape{}
	for _, coll := range collections {
		rows, err := tx.QueryContext(ctx, fmt.Sprintf("SELECT doc FROM %s ORDER BY updated_at, id", coll.table))
		if err != nil {
			return nil, err
		}
		var docs []json.RawMessage
		for rows.Next() {
			var raw json.RawMessage
			if err := rows.Scan(&raw); err != nil {
				rows.Close()
				return nil, err
			}
			docs = append(docs, raw)
		}
		if err := rows.Close(); err != nil {
			return nil, err
		}
		if err := coll.set(state, docs); err != nil {
			return nil, fmt.Errorf("load %s: %w", coll.table, err)
		}
	}
	normalizeAuthState(state)
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return state, nil
}

func (s *Store) Save(ctx context.Context, state *DBShape) error {
	normalizeAuthState(state)
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, coll := range collections {
		if _, err := tx.ExecContext(ctx, fmt.Sprintf("DELETE FROM %s", coll.table)); err != nil {
			return err
		}
		stmt, err := tx.PrepareContext(ctx, fmt.Sprintf("INSERT INTO %s (id, doc) VALUES (?, CAST(? AS JSON))", coll.table))
		if err != nil {
			return err
		}
		for _, item := range coll.items(state) {
			id := docID(item)
			body, err := json.Marshal(item)
			if err != nil {
				stmt.Close()
				return err
			}
			if _, err := stmt.ExecContext(ctx, id, string(body)); err != nil {
				stmt.Close()
				return err
			}
		}
		if err := stmt.Close(); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func anySlice[T any](items []T) []any {
	out := make([]any, len(items))
	for i := range items {
		out[i] = items[i]
	}
	return out
}

func setJSON[T any](assign func(*DBShape, []T)) func(*DBShape, []json.RawMessage) error {
	return func(s *DBShape, docs []json.RawMessage) error {
		out := make([]T, 0, len(docs))
		for _, doc := range docs {
			var item T
			if err := json.Unmarshal(doc, &item); err != nil {
				return err
			}
			out = append(out, item)
		}
		assign(s, out)
		return nil
	}
}

func docID(item any) string {
	switch v := item.(type) {
	case User:
		return v.ID
	case UserRoleProfile:
		return v.ID
	case AuthSession:
		return v.AccessToken
	case SMSCode:
		return v.ID
	case PilotProfile:
		return v.UserID
	case OwnerProfile:
		return v.UserID
	case ClientProfile:
		return v.UserID
	case Drone:
		return v.ID
	case CapacityUnit:
		return v.ID
	case Order:
		return v.ID
	case PaymentOrder:
		return v.ID
	case CreditScore:
		return v.UserID
	case InsurancePolicy:
		return v.ID
	case Claim:
		return v.ID
	case AirspaceRequest:
		return v.ID
	case TelemetrySnapshot:
		return v.ID
	case Review:
		return v.ID
	case Wallet:
		return v.ID
	case LedgerEntry:
		return v.ID
	case Notification:
		return v.ID
	case CertificationApplication:
		return v.ID
	case AuditLog:
		return v.ID
	default:
		panic(fmt.Sprintf("unsupported doc id type %T", item))
	}
}
