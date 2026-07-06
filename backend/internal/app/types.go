package app

import "time"

type Role string
type CargoType string
type AuditStatus string
type OrderStatus string
type CapacityStatus string
type NotificationType string
type LedgerStatus string
type LedgerType string
type AuditAction string
type RoleProfileStatus string
type PaymentStatus string

const (
	RoleClient Role = "client"
	RolePilot  Role = "pilot"
	RoleOwner  Role = "owner"
	RoleAdmin  Role = "admin"

	CargoNormal       CargoType = "normal"
	CargoValuable     CargoType = "valuable"
	CargoDangerous    CargoType = "dangerous"
	CargoAgricultural CargoType = "agricultural"

	AuditPending  AuditStatus = "pending"
	AuditApproved AuditStatus = "approved"
	AuditRejected AuditStatus = "rejected"

	StatusCreated          OrderStatus = "created"
	StatusMatching         OrderStatus = "matching"
	StatusConfirmed        OrderStatus = "confirmed"
	StatusAirspaceApplying OrderStatus = "airspace"
	StatusPreparing        OrderStatus = "preparing"
	StatusLoading          OrderStatus = "loading"
	StatusInFlight         OrderStatus = "inflight"
	StatusUnloading        OrderStatus = "unloading"
	StatusCompleted        OrderStatus = "completed"
	StatusSettled          OrderStatus = "settled"
	StatusCancelled        OrderStatus = "cancelled"
	StatusException        OrderStatus = "exception"

	CapacityOnline  CapacityStatus = "online"
	CapacityBusy    CapacityStatus = "busy"
	CapacityOffline CapacityStatus = "offline"

	NotifyDispatch   NotificationType = "dispatch"
	NotifyAudit      NotificationType = "audit"
	NotifySettlement NotificationType = "settlement"
	NotifySystem     NotificationType = "system"

	LedgerSettleIn LedgerType   = "settle_in"
	LedgerPending  LedgerStatus = "pending"
	LedgerAvail    LedgerStatus = "available"

	RoleProfileActive   RoleProfileStatus = "active"
	RoleProfilePending  RoleProfileStatus = "pending"
	RoleProfileRejected RoleProfileStatus = "rejected"

	ActionLogin         AuditAction = "login"
	ActionCertification AuditAction = "certification"
	ActionPayment       AuditAction = "payment"
	ActionAirspace      AuditAction = "airspace"
	ActionOrder         AuditAction = "order"
	ActionInsurance     AuditAction = "insurance"
	ActionRisk          AuditAction = "risk"

	PaymentPending   PaymentStatus = "pending"
	PaymentPaid      PaymentStatus = "paid"
	PaymentFailed    PaymentStatus = "failed"
	PaymentCancelled PaymentStatus = "cancelled"
)

type GeoPoint struct {
	Lng     float64 `json:"lng"`
	Lat     float64 `json:"lat"`
	Address string  `json:"address,omitempty"`
}

type User struct {
	ID               string `json:"id"`
	Phone            string `json:"phone"`
	Nickname         string `json:"nickname"`
	Avatar           string `json:"avatar,omitempty"`
	Roles            []Role `json:"roles"`
	CurrentRole      Role   `json:"currentRole"`
	AuthStatus       string `json:"authStatus,omitempty"`
	RealNameVerified bool   `json:"realNameVerified"`
	CreatedAt        string `json:"createdAt,omitempty"`
	LastLoginAt      string `json:"lastLoginAt,omitempty"`
	Disabled         bool   `json:"disabled,omitempty"`
	Blacklisted      bool   `json:"blacklisted,omitempty"`
}

type UserRoleProfile struct {
	ID              string            `json:"id"`
	UserID          string            `json:"userId"`
	Role            Role              `json:"role"`
	Status          RoleProfileStatus `json:"status"`
	CertificationID string            `json:"certificationId,omitempty"`
	CreatedAt       string            `json:"createdAt"`
	UpdatedAt       string            `json:"updatedAt"`
}

type AuthSession struct {
	AccessToken      string `json:"accessToken"`
	RefreshToken     string `json:"refreshToken"`
	UserID           string `json:"userId"`
	ExpiresAt        string `json:"expiresAt"`
	RefreshExpiresAt string `json:"refreshExpiresAt"`
	CreatedAt        string `json:"createdAt"`
}

type SMSCode struct {
	ID         string `json:"id"`
	Phone      string `json:"phone"`
	Code       string `json:"code"`
	SentAt     string `json:"sentAt"`
	ExpiresAt  string `json:"expiresAt"`
	Attempts   int    `json:"attempts"`
	ConsumedAt string `json:"consumedAt,omitempty"`
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresAt    string `json:"expiresAt"`
}

type PilotStats struct {
	Orders        int     `json:"orders"`
	Completed     int     `json:"completed"`
	Cancelled     int     `json:"cancelled"`
	OnTimeRate    float64 `json:"onTimeRate"`
	ComplaintRate float64 `json:"complaintRate"`
	AccidentRate  float64 `json:"accidentRate"`
	Violation     int     `json:"violationCount"`
	FlightHours   int     `json:"flightHours"`
	OnlineHours   int     `json:"onlineHours"`
	AvgRespSec    int     `json:"avgRespSec"`
	AvgStar       float64 `json:"avgStar"`
}

type PilotProfile struct {
	UserID        string      `json:"userId"`
	CAACLevel     string      `json:"caacLevel"`
	CAACExpire    string      `json:"caacExpire"`
	NoCrimeProof  AuditStatus `json:"noCrimeProof"`
	HealthProof   AuditStatus `json:"healthProof"`
	TrainingCerts []string    `json:"trainingCerts"`
	Online        bool        `json:"online"`
	Location      GeoPoint    `json:"location"`
	Stats         PilotStats  `json:"stats"`
}

type OwnerProfile struct {
	UserID      string         `json:"userId"`
	EntityType  string         `json:"entityType"`
	Drones      []string       `json:"drones"`
	UOMVerified bool           `json:"uomVerified"`
	Stats       map[string]any `json:"stats"`
}

type ClientProfile struct {
	UserID            string         `json:"userId"`
	EntityType        string         `json:"entityType"`
	CreditBureauScore int            `json:"creditBureauScore,omitempty"`
	Stats             map[string]any `json:"stats"`
}

type Drone struct {
	ID             string           `json:"id"`
	Brand          string           `json:"brand"`
	Model          string           `json:"model"`
	SN             string           `json:"sn"`
	MaxPayloadKg   float64          `json:"maxPayloadKg"`
	Airworthiness  AuditStatus      `json:"airworthiness"`
	Insured        DroneInsurance   `json:"insured"`
	MaintenanceLog []MaintenanceLog `json:"maintenanceLog"`
	OwnerID        string           `json:"ownerId"`
	Status         string           `json:"status"`
}

type DroneInsurance struct {
	Hull             bool `json:"hull"`
	ThirdParty       bool `json:"thirdParty"`
	ThirdPartyAmount int  `json:"thirdPartyAmount"`
}

type MaintenanceLog struct {
	Date string `json:"date"`
	Note string `json:"note"`
}

type CapacityUnit struct {
	ID       string         `json:"id"`
	PilotID  string         `json:"pilotId"`
	DroneID  string         `json:"droneId"`
	OwnerID  string         `json:"ownerId"`
	Location GeoPoint       `json:"location"`
	Status   CapacityStatus `json:"status"`
}

type Cargo struct {
	Type      CargoType `json:"type"`
	WeightKg  float64   `json:"weightKg"`
	Volume    string    `json:"volume,omitempty"`
	ValueCent int       `json:"valueCent"`
	Photos    []string  `json:"photos"`
	Remark    string    `json:"remark,omitempty"`
}

type Needs struct {
	TempControl bool   `json:"tempControl,omitempty"`
	ShockProof  bool   `json:"shockProof,omitempty"`
	Insurance   bool   `json:"insurance,omitempty"`
	Special     string `json:"special,omitempty"`
}

type PriceBreakdown struct {
	BaseCent         int     `json:"baseCent"`
	MileageCent      int     `json:"mileageCent"`
	DurationCent     int     `json:"durationCent"`
	WeightCent       int     `json:"weightCent"`
	DifficultyFactor float64 `json:"difficultyFactor"`
	InsuranceCent    int     `json:"insuranceCent"`
	ExtraCent        int     `json:"extraCent"`
	TotalCent        int     `json:"totalCent"`
}

type SettlementItem struct {
	Party      string  `json:"party"`
	Ratio      float64 `json:"ratio"`
	AmountCent int     `json:"amountCent"`
	Cycle      string  `json:"cycle"`
	Note       string  `json:"note"`
}

type Settlement struct {
	OrderID   string           `json:"orderId"`
	TotalCent int              `json:"totalCent"`
	Items     []SettlementItem `json:"items"`
}

type OrderEvent struct {
	At     string      `json:"at"`
	Status OrderStatus `json:"status"`
	Note   string      `json:"note,omitempty"`
	Actor  Role        `json:"actor,omitempty"`
}

type Order struct {
	ID              string          `json:"id"`
	ClientID        string          `json:"clientId"`
	Cargo           Cargo           `json:"cargo"`
	From            GeoPoint        `json:"from"`
	To              GeoPoint        `json:"to"`
	DistanceKm      float64         `json:"distanceKm,omitempty"`
	TimeMode        string          `json:"timeMode"`
	ScheduledAt     string          `json:"scheduledAt,omitempty"`
	TimeRequirement string          `json:"timeRequirement,omitempty"`
	Needs           Needs           `json:"needs"`
	BudgetCent      int             `json:"budgetCent"`
	PaymentMode     string          `json:"paymentMode,omitempty"`
	PaymentID       string          `json:"paymentId,omitempty"`
	InvoiceTitle    string          `json:"invoiceTitle,omitempty"`
	Status          OrderStatus     `json:"status"`
	PilotID         string          `json:"pilotId,omitempty"`
	DroneID         string          `json:"droneId,omitempty"`
	CapacityID      string          `json:"capacityId,omitempty"`
	PolicyID        string          `json:"policyId,omitempty"`
	PriceBreakdown  *PriceBreakdown `json:"priceBreakdown,omitempty"`
	Settlement      *Settlement     `json:"settlement,omitempty"`
	Events          []OrderEvent    `json:"events"`
	CreatedAt       string          `json:"createdAt"`
}

type PaymentSDKParams struct {
	Provider  string `json:"provider,omitempty"`
	AppID     string `json:"appId,omitempty"`
	TimeStamp string `json:"timeStamp"`
	NonceStr  string `json:"nonceStr"`
	Package   string `json:"package"`
	SignType  string `json:"signType"`
	PaySign   string `json:"paySign"`
	PrepayID  string `json:"prepayId,omitempty"`
}

type PaymentOrder struct {
	ID              string            `json:"id"`
	OrderID         string            `json:"orderId"`
	AmountCent      int               `json:"amountCent"`
	Mode            string            `json:"mode"`
	Status          PaymentStatus     `json:"status"`
	Provider        string            `json:"provider"`
	ProviderTradeNo string            `json:"providerTradeNo"`
	PrepayID        string            `json:"prepayId,omitempty"`
	SDKParams       *PaymentSDKParams `json:"sdkParams,omitempty"`
	CreatedAt       string            `json:"createdAt"`
	UpdatedAt       string            `json:"updatedAt"`
	PaidAt          string            `json:"paidAt,omitempty"`
	FailedReason    string            `json:"failedReason,omitempty"`
}

type MatchCandidate struct {
	PilotID        string         `json:"pilotId"`
	DroneID        string         `json:"droneId"`
	CapacityID     string         `json:"capacityId"`
	DistanceKm     float64        `json:"distanceKm"`
	EtaMin         int            `json:"etaMin"`
	CreditScore    int            `json:"creditScore"`
	QuoteCent      int            `json:"quoteCent"`
	Score          float64        `json:"score"`
	Reasons        []string       `json:"reasons"`
	PriceBreakdown PriceBreakdown `json:"priceBreakdown"`
}

type InsurancePolicy struct {
	ID                string    `json:"id"`
	OrderID           string    `json:"orderId"`
	CargoType         CargoType `json:"cargoType"`
	Coverages         []string  `json:"coverages"`
	InsuredAmountCent int       `json:"insuredAmountCent"`
	PremiumCent       int       `json:"premiumCent"`
	Status            string    `json:"status"`
	Provider          string    `json:"provider,omitempty"`
	ProviderPolicyNo  string    `json:"providerPolicyNo,omitempty"`
	ProviderQuoteID   string    `json:"providerQuoteId,omitempty"`
	ActivatedAt       string    `json:"activatedAt,omitempty"`
}

type AirspaceRequest struct {
	ID                string     `json:"id"`
	OrderID           string     `json:"orderId"`
	Area              []GeoPoint `json:"area"`
	AltitudeM         int        `json:"altitudeM"`
	Window            TimeWindow `json:"window"`
	Status            string     `json:"status"`
	Provider          string     `json:"provider,omitempty"`
	ProviderRequestID string     `json:"providerRequestId,omitempty"`
	ApprovalNo        string     `json:"approvalNo,omitempty"`
	ValidFrom         string     `json:"validFrom,omitempty"`
	ValidTo           string     `json:"validTo,omitempty"`
	RouteGeometry     []GeoPoint `json:"routeGeometry,omitempty"`
}

type Telemetry struct {
	TS         string   `json:"ts"`
	Pos        GeoPoint `json:"pos"`
	AltM       float64  `json:"altM"`
	SpeedMS    float64  `json:"speedMs"`
	BatteryPct float64  `json:"batteryPct"`
	Heading    float64  `json:"heading"`
	SwingDeg   float64  `json:"swingDeg"`
}

type TelemetrySnapshot struct {
	ID        string    `json:"id"`
	OrderID   string    `json:"orderId"`
	Frame     Telemetry `json:"frame"`
	Source    string    `json:"source"`
	UpdatedAt string    `json:"updatedAt"`
	Provider  string    `json:"provider,omitempty"`
	DeviceSN  string    `json:"deviceSn,omitempty"`
}

type TimeWindow struct {
	Start string `json:"start"`
	End   string `json:"end"`
}

type Review struct {
	ID           string   `json:"id"`
	OrderID      string   `json:"orderId"`
	ByRole       Role     `json:"byRole"`
	TargetUserID string   `json:"targetUserId"`
	Star         int      `json:"star"`
	Tags         []string `json:"tags"`
	Text         string   `json:"text,omitempty"`
}

type Wallet struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	BalanceCent int    `json:"balanceCent"`
	PendingCent int    `json:"pendingCent"`
}

type LedgerEntry struct {
	ID         string       `json:"id"`
	UserID     string       `json:"userId"`
	OrderID    string       `json:"orderId,omitempty"`
	Type       LedgerType   `json:"type"`
	AmountCent int          `json:"amountCent"`
	Cycle      string       `json:"cycle"`
	Status     LedgerStatus `json:"status"`
	Note       string       `json:"note,omitempty"`
	CreatedAt  string       `json:"createdAt"`
}

type Notification struct {
	ID        string           `json:"id"`
	UserID    string           `json:"userId"`
	Type      NotificationType `json:"type"`
	Title     string           `json:"title"`
	Body      string           `json:"body"`
	Read      bool             `json:"read"`
	CreatedAt string           `json:"createdAt"`
	Ref       string           `json:"ref,omitempty"`
}

type CertificationApplication struct {
	ID          string         `json:"id"`
	UserID      string         `json:"userId"`
	Role        Role           `json:"role"`
	Status      AuditStatus    `json:"status"`
	SubmittedAt string         `json:"submittedAt"`
	ReviewedAt  string         `json:"reviewedAt,omitempty"`
	Fields      map[string]any `json:"fields"`
}

type AuditLog struct {
	ID         string      `json:"id"`
	At         string      `json:"at"`
	Action     AuditAction `json:"action"`
	ActorID    string      `json:"actorId"`
	ActorRole  Role        `json:"actorRole"`
	TargetType string      `json:"targetType"`
	TargetID   string      `json:"targetId,omitempty"`
	Detail     string      `json:"detail"`
}

type CreditScore struct {
	UserID          string `json:"userId"`
	Role            Role   `json:"role"`
	Total           int    `json:"total"`
	Level           string `json:"level"`
	Provider        string `json:"provider,omitempty"`
	ProviderTraceID string `json:"providerTraceId,omitempty"`
	AuthorizedAt    string `json:"authorizedAt,omitempty"`
	ExpiresAt       string `json:"expiresAt,omitempty"`
}

type Claim struct {
	ID         string   `json:"id"`
	PolicyID   string   `json:"policyId"`
	OrderID    string   `json:"orderId"`
	ReportedAt string   `json:"reportedAt"`
	Evidence   []string `json:"evidence"`
	Liability  string   `json:"liability,omitempty"`
	PayoutCent int      `json:"payoutCent,omitempty"`
	Status     string   `json:"status"`
}

type DBShape struct {
	Users            []User                     `json:"users"`
	UserRoleProfiles []UserRoleProfile          `json:"userRoleProfiles"`
	AuthSessions     []AuthSession              `json:"authSessions"`
	SMSCodes         []SMSCode                  `json:"smsCodes"`
	Pilots           []PilotProfile             `json:"pilots"`
	Owners           []OwnerProfile             `json:"owners"`
	Clients          []ClientProfile            `json:"clients"`
	Drones           []Drone                    `json:"drones"`
	Capacity         []CapacityUnit             `json:"capacity"`
	Orders           []Order                    `json:"orders"`
	PaymentOrders    []PaymentOrder             `json:"paymentOrders"`
	Credits          []CreditScore              `json:"credits"`
	Policies         []InsurancePolicy          `json:"policies"`
	Claims           []Claim                    `json:"claims"`
	Airspace         []AirspaceRequest          `json:"airspace"`
	Telemetry        []TelemetrySnapshot        `json:"telemetry"`
	Reviews          []Review                   `json:"reviews"`
	Wallets          []Wallet                   `json:"wallets"`
	Ledger           []LedgerEntry              `json:"ledger"`
	Notifications    []Notification             `json:"notifications"`
	AuthApplications []CertificationApplication `json:"authApplications"`
	AuditLogs        []AuditLog                 `json:"auditLogs"`
	SeededAt         string                     `json:"_seededAt"`
}

func nowISO() string {
	return time.Now().Format(time.RFC3339Nano)
}
