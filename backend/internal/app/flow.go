package app

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	minThirdParty       = 5_000_000
	thresholdKm         = 5.0
	destinationRadiusKm = 0.2
	cruiseMS            = 13.0
	prepMin             = 3
)

var demoCapacityOffsets = []GeoPoint{
	{Lng: 0.0042, Lat: 0.0021},
	{Lng: -0.0036, Lat: 0.0018},
	{Lng: 0.0027, Lat: -0.0024},
	{Lng: -0.0022, Lat: -0.0031},
}

func genID(prefix string) string {
	var b [9]byte
	if _, err := rand.Read(b[:]); err != nil {
		return prefix + "_" + time.Now().Format("150405000")
	}
	return prefix + "_" + base64.RawURLEncoding.EncodeToString(b[:])
}

func submitOrder(state *DBShape, input submitOrderRequest) (*Order, error) {
	return submitOrderWithOptions(state, input, true)
}

func submitOrderWithOptions(state *DBShape, input submitOrderRequest, allowDemoCapacity bool) (*Order, error) {
	if input.ClientID == "" {
		input.ClientID = "u_c1"
	}
	client := findUser(state, input.ClientID)
	if client == nil {
		return nil, errors.New("业主不存在")
	}
	if !roleProfileActive(state, client.ID, RoleClient) {
		return nil, errors.New("业主身份尚未激活，不能发单")
	}
	if client.Blacklisted {
		return nil, errors.New("当前业主处于风控黑名单，暂不可发单")
	}
	if input.From.Lng == 0 && input.From.Lat == 0 {
		input.From = GeoPoint{Lng: 113.125213, Lat: 23.020498, Address: "普君新城华府2期 · 同济东路41号"}
	}
	if input.To.Lng == 0 && input.To.Lat == 0 {
		return nil, errors.New("必须选择目的地")
	}
	if input.WeightKg <= 0 {
		return nil, errors.New("货物重量必须大于 0")
	}
	if input.BudgetCent <= 0 {
		return nil, errors.New("预算必须大于 0")
	}
	photos := input.Photos
	if len(photos) == 0 && allowDemoCapacity {
		photos = []string{"cargo-demo"}
	}
	now := nowISO()
	order := Order{
		ID:              genID("o"),
		ClientID:        input.ClientID,
		Cargo:           Cargo{Type: input.CargoType, WeightKg: input.WeightKg, Volume: input.Volume, ValueCent: input.ValueCent, Photos: photos, Remark: input.Remark},
		From:            input.From,
		To:              input.To,
		TimeMode:        fallback(input.TimeMode, "instant"),
		ScheduledAt:     input.ScheduledAt,
		TimeRequirement: input.TimeRequirement,
		Needs:           Needs{Insurance: input.Insured, ShockProof: input.ShockProof, TempControl: input.TempControl, Special: input.Special},
		BudgetCent:      input.BudgetCent,
		PaymentMode:     fallback(input.PaymentMode, "escrow"),
		InvoiceTitle:    input.InvoiceTitle,
		Status:          StatusCreated,
		CreatedAt:       now,
		Events:          []OrderEvent{{At: now, Status: StatusCreated, Actor: RoleClient}},
	}
	state.Orders = append(state.Orders, order)
	transition(state, order.ID, StatusMatching, RoleClient, "发单进入智能匹配")
	if allowDemoCapacity {
		ensureDemoCapacityNearOrder(state, findOrder(state, order.ID))
	}
	recordAudit(state, ActionOrder, input.ClientID, RoleClient, "order", order.ID, "发布吊运订单")
	for _, p := range state.Pilots {
		notify(state, p.UserID, NotifyDispatch, "新吊运任务", "业主发布了吊运订单", order.ID)
	}
	return findOrder(state, order.ID), nil
}

func candidatesForOrder(state *DBShape, orderID string, strategy string) ([]MatchCandidate, error) {
	return candidatesForOrderWithOptions(state, orderID, strategy, true)
}

func candidatesForOrderWithOptions(state *DBShape, orderID string, strategy string, allowDemoCapacity bool) ([]MatchCandidate, error) {
	order := findOrder(state, orderID)
	if order == nil {
		return nil, errors.New("订单不存在")
	}
	if allowDemoCapacity {
		ensureDemoCapacityNearOrder(state, order)
	}
	out := make([]MatchCandidate, 0)
	for _, unit := range state.Capacity {
		if unit.Status != CapacityOnline {
			continue
		}
		drone := findDrone(state, unit.DroneID)
		pilot := findPilot(state, unit.PilotID)
		if drone == nil || pilot == nil || !pilotCanOperate(state, pilot) || !ownerCanOperate(state, unit.OwnerID) {
			continue
		}
		dist := distanceKm(order.From, unit.Location)
		if dist > thresholdKm || drone.MaxPayloadKg < order.Cargo.WeightKg {
			continue
		}
		if drone.Airworthiness != AuditApproved || drone.Insured.ThirdPartyAmount < minThirdParty {
			continue
		}
		eta := etaMinutes(dist)
		price := priceOrder(*order, *drone, eta, dist)
		if price.TotalCent > order.BudgetCent {
			continue
		}
		credit := 973
		out = append(out, MatchCandidate{
			PilotID: unit.PilotID, DroneID: unit.DroneID, CapacityID: unit.ID, DistanceKm: round(dist, 4), EtaMin: eta,
			CreditScore: credit, QuoteCent: price.TotalCent, PriceBreakdown: price,
			Reasons: []string{"距离" + formatFloat(round(dist, 1)) + "km", "载重满足", "设备合规", "ETA" + itoa(eta) + "分", "在预算内", "信用" + itoa(credit)},
		})
	}
	maxD, maxQ, maxEta := 1.0, 1, 1
	for _, c := range out {
		if c.DistanceKm > maxD {
			maxD = c.DistanceKm
		}
		if c.QuoteCent > maxQ {
			maxQ = c.QuoteCent
		}
		if c.EtaMin > maxEta {
			maxEta = c.EtaMin
		}
	}
	for i := range out {
		dS := 1 - out[i].DistanceKm/maxD
		eS := 1 - float64(out[i].EtaMin)/float64(maxEta)
		cS := float64(out[i].CreditScore) / 1000
		switch strategy {
		case "maxProfit":
			out[i].Score = round(float64(out[i].QuoteCent)/float64(maxQ), 4)
		case "global":
			out[i].Score = round(.5*dS+.5*cS, 4)
		case "chain":
			out[i].Score = round(.75*eS+.25*cS, 4)
		default:
			out[i].Score = round(.6*dS+.25*cS+.15*(4.7/5), 4)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Score > out[j].Score })
	return out, nil
}

func ensureDemoCapacityNearOrder(state *DBShape, order *Order) {
	if order == nil || len(state.Capacity) == 0 {
		return
	}
	for _, unit := range state.Capacity {
		if unit.Status == CapacityOnline && distanceKm(order.From, unit.Location) <= thresholdKm {
			return
		}
	}
	moved := 0
	for i := range state.Capacity {
		if state.Capacity[i].Status != CapacityOnline {
			continue
		}
		offset := demoCapacityOffsets[moved%len(demoCapacityOffsets)]
		location := GeoPoint{
			Lng:     roundCoord(order.From.Lng + offset.Lng),
			Lat:     roundCoord(order.From.Lat + offset.Lat),
			Address: "订单起点附近演示运力" + itoa(moved+1),
		}
		state.Capacity[i].Location = location
		if pilot := findPilot(state, state.Capacity[i].PilotID); pilot != nil {
			pilot.Location = location
		}
		moved++
	}
}

func roundCoord(value float64) float64 {
	return math.Round(value*1_000_000) / 1_000_000
}

func confirmOrder(state *DBShape, orderID string, capacityID string) (*Order, error) {
	return confirmOrderWithPayment(state, orderID, capacityID, "", false, false)
}

func confirmOrderWithPayment(state *DBShape, orderID string, capacityID string, paymentID string, requirePaidPayment bool, requireProviderReceipts bool) (*Order, error) {
	return confirmOrderWithPaymentOptions(state, orderID, capacityID, paymentID, requirePaidPayment, requireProviderReceipts, true)
}

func confirmOrderWithPaymentOptions(state *DBShape, orderID string, capacityID string, paymentID string, requirePaidPayment bool, requireProviderReceipts bool, allowDemoCapacity bool) (*Order, error) {
	order := findOrder(state, orderID)
	if order == nil {
		return nil, errors.New("订单不存在")
	}
	if order.Status != StatusMatching {
		return nil, errors.New("当前订单不能重复确认方案")
	}
	candidates, err := candidatesForOrderWithOptions(state, orderID, "global", allowDemoCapacity)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, errors.New("当前没有在线合规运力")
	}
	candidate := candidates[0]
	if capacityID != "" {
		found := false
		for _, c := range candidates {
			if c.CapacityID == capacityID {
				candidate = c
				found = true
				break
			}
		}
		if !found {
			return nil, errors.New("所选运力已不满足合规条件，请重新匹配")
		}
	}
	payment, err := assertPaymentAllowsConfirm(state, order, candidate, paymentID, requirePaidPayment)
	if err != nil {
		return nil, err
	}
	if order.Cargo.Type == CargoValuable || order.Needs.Insurance {
		if providerPolicy := providerPolicyForOrder(state, order.ID); providerPolicy != nil {
			order.PolicyID = providerPolicy.ID
		} else if requireProviderReceipts {
			return nil, errors.New("保险供应商保单回执缺失，不能确认订单")
		} else {
			bindInsurance(state, order, candidate.PriceBreakdown.InsuranceCent)
		}
	}
	order.PilotID = candidate.PilotID
	order.DroneID = candidate.DroneID
	order.CapacityID = candidate.CapacityID
	order.PriceBreakdown = &candidate.PriceBreakdown
	if payment != nil {
		order.PaymentID = payment.ID
	}
	transition(state, order.ID, StatusConfirmed, RoleClient, "业主确认推荐方案")
	detail := "演示预支付通道已受理"
	if payment != nil {
		detail = "支付单" + payment.ID + "已支付，确认锁定运力"
	}
	recordAudit(state, ActionPayment, order.ClientID, RoleClient, "order", order.ID, detail)
	notify(state, candidate.PilotID, NotifyDispatch, "任务已确认", "请进入驾驶舱完成空域与安检", order.ID)
	return findOrder(state, order.ID), nil
}

func assertPaymentAllowsConfirm(state *DBShape, order *Order, candidate MatchCandidate, paymentID string, requirePaidPayment bool) (*PaymentOrder, error) {
	if strings.TrimSpace(paymentID) == "" {
		if requirePaidPayment {
			return nil, errors.New("支付未完成，不能确认运力")
		}
		return nil, nil
	}
	payment := findPaymentOrder(state, paymentID)
	if payment == nil || payment.OrderID != order.ID {
		return nil, errors.New("支付单不存在或不属于当前订单")
	}
	if payment.AmountCent < candidate.QuoteCent {
		return nil, errors.New("支付金额不足，不能确认运力")
	}
	switch payment.Status {
	case PaymentPaid:
		return payment, nil
	case PaymentCancelled:
		return nil, errors.New("支付已取消，不能确认运力")
	case PaymentFailed:
		return nil, errors.New("支付失败，不能确认运力")
	default:
		return nil, errors.New("支付尚未完成，不能确认运力")
	}
}

func providerPolicyForOrder(state *DBShape, orderID string) *InsurancePolicy {
	for i := range state.Policies {
		if state.Policies[i].OrderID == orderID && state.Policies[i].ProviderPolicyNo != "" {
			return &state.Policies[i]
		}
	}
	return nil
}

func advanceOrder(state *DBShape, orderID string) (*Order, error) {
	return advanceOrderWithOptions(state, orderID, false)
}

func advanceOrderWithOptions(state *DBShape, orderID string, requireDeviceTelemetry bool) (*Order, error) {
	order := findOrder(state, orderID)
	if order == nil {
		return nil, errors.New("订单不存在")
	}
	switch order.Status {
	case StatusConfirmed:
		createAirspaceRequest(state, order.ID, "submitted")
		return transition(state, order.ID, StatusAirspaceApplying, RolePilot, "提交空域申请")
	case StatusAirspaceApplying:
		req := firstAirspace(state, order.ID)
		if req == nil {
			req = createAirspaceRequest(state, order.ID, "submitted")
		}
		if req.Status == "submitted" {
			return nil, errors.New("空域尚未审批")
		}
		if req.Status == "rejected" {
			return transition(state, order.ID, StatusException, RoleAdmin, "空域审批驳回")
		}
		return transition(state, order.ID, StatusPreparing, RolePilot, "空域通过，合规门校验通过")
	case StatusPreparing:
		return transition(state, order.ID, StatusLoading, RolePilot, "流程推进")
	case StatusLoading:
		return transition(state, order.ID, StatusInFlight, RolePilot, "流程推进")
	case StatusInFlight:
		if err := ensureDestinationReached(state, order, requireDeviceTelemetry); err != nil {
			return nil, err
		}
		return transition(state, order.ID, StatusUnloading, RolePilot, "流程推进")
	case StatusUnloading:
		return transition(state, order.ID, StatusCompleted, RolePilot, "流程推进")
	case StatusCompleted:
		next, err := transition(state, order.ID, StatusSettled, RolePilot, "流程推进")
		if err != nil {
			return nil, err
		}
		if next.Settlement != nil {
			for _, item := range next.Settlement.Items {
				if item.Party == "platform" {
					walletCredit(state, "platform", next.ID, item.AmountCent, "realtime", "平台技术服务费")
				}
			}
		}
		notify(state, next.ClientID, NotifySettlement, "订单已结算", "分账明细已生成，可发起评价", next.ID)
		return next, nil
	default:
		return order, nil
	}
}

func ensureDestinationReached(state *DBShape, order *Order, requireDeviceTelemetry bool) error {
	snapshot := latestTelemetry(state, order.ID)
	if snapshot == nil {
		return errors.New("尚未收到飞行遥测，无法确认卸货")
	}
	if requireDeviceTelemetry && (snapshot.Source != "device" || snapshot.Provider == "" || snapshot.DeviceSN == "") {
		return errors.New("生产环境只接受设备/provider遥测确认卸货")
	}
	if distanceKm(snapshot.Frame.Pos, order.To) > destinationRadiusKm {
		return errors.New("尚未到达卸货点，进入200m围栏后才能确认卸货")
	}
	return nil
}

func decideAirspace(state *DBShape, orderID string, status string) (*Order, *AirspaceRequest, error) {
	order := findOrder(state, orderID)
	if order == nil {
		return nil, nil, errors.New("订单不存在")
	}
	if order.Status != StatusAirspaceApplying {
		return nil, nil, errors.New("订单尚未提交空域申请")
	}
	if status == "" {
		status = "approved"
	}
	if status != "approved" && status != "rejected" {
		return nil, nil, errors.New("空域审批状态必须是 approved 或 rejected")
	}
	req := firstAirspace(state, order.ID)
	if req == nil {
		return nil, nil, errors.New("空域申请不存在，请先由飞手提交申请")
	}
	req.Status = status
	note := "空域审批通过"
	title := "空域已批准"
	body := "可进入起飞前合规检查"
	if status == "rejected" {
		note = "空域审批驳回"
		title = "空域被驳回"
		body = "请联系后台调整航线或重新申报"
	}
	order.Events = append(order.Events, OrderEvent{At: nowISO(), Status: order.Status, Actor: RoleAdmin, Note: note})
	recordAudit(state, ActionAirspace, "airspace-go", RoleAdmin, "airspace", req.ID, note)
	notify(state, order.ClientID, NotifyAudit, title, body, order.ID)
	if order.PilotID != "" {
		notify(state, order.PilotID, NotifyAudit, title, body, order.ID)
	}
	return order, req, nil
}

func latestTelemetry(state *DBShape, orderID string) *TelemetrySnapshot {
	for i := range state.Telemetry {
		if state.Telemetry[i].OrderID == orderID {
			return &state.Telemetry[i]
		}
	}
	return nil
}

func upsertTelemetry(state *DBShape, orderID string, frame Telemetry, source string) *TelemetrySnapshot {
	if source == "" {
		source = "simulator"
	}
	if frame.TS == "" {
		frame.TS = nowISO()
	}
	snapshot := TelemetrySnapshot{
		ID:        "tel_" + orderID,
		OrderID:   orderID,
		Frame:     frame,
		Source:    source,
		UpdatedAt: nowISO(),
	}
	for i := range state.Telemetry {
		if state.Telemetry[i].OrderID == orderID {
			state.Telemetry[i] = snapshot
			return &state.Telemetry[i]
		}
	}
	state.Telemetry = append(state.Telemetry, snapshot)
	return &state.Telemetry[len(state.Telemetry)-1]
}

func finishOrder(state *DBShape, orderID string) (*Order, error) {
	return finishOrderWithOptions(state, orderID, false)
}

func finishOrderWithOptions(state *DBShape, orderID string, requireDeviceTelemetry bool) (*Order, error) {
	var order *Order
	var err error
	for i := 0; i < 20; i++ {
		order = findOrder(state, orderID)
		if order == nil || order.Status == StatusSettled || order.Status == StatusException {
			return order, nil
		}
		before := order.Status
		order, err = advanceOrderWithOptions(state, orderID, requireDeviceTelemetry)
		if err != nil {
			return nil, err
		}
		if order.Status == before {
			return order, nil
		}
	}
	return order, nil
}

func reviewOrder(state *DBShape, orderID string, star int, text string) (*Review, error) {
	order := findOrder(state, orderID)
	if order == nil {
		return nil, errors.New("订单不存在")
	}
	if order.PilotID == "" {
		return nil, errors.New("订单未指派飞手")
	}
	if order.Settlement == nil {
		return nil, errors.New("订单尚未结算")
	}
	if star < 1 || star > 5 {
		return nil, errors.New("评分必须在 1-5")
	}
	review := Review{ID: genID("rv"), OrderID: orderID, ByRole: RoleClient, TargetUserID: order.PilotID, Star: star, Tags: []string{"准时", "吊运稳定"}, Text: text}
	state.Reviews = append(state.Reviews, review)
	notify(state, order.PilotID, NotifySystem, "收到业主评价", "信用分已按评价更新", order.ID)
	return &review, nil
}

func submitCertification(state *DBShape, role Role, userID string, fields map[string]any) (*CertificationApplication, error) {
	if userID == "" {
		return nil, errors.New("用户不存在")
	}
	if findUser(state, userID) == nil {
		return nil, errors.New("用户不存在")
	}
	if role == RoleAdmin {
		return nil, errors.New("运营身份不支持自助认证")
	}
	ensureRoleDataProfile(state, userID, role)
	appFields := copyFields(fields)
	if role == RoleOwner {
		drone, err := submitOwnerDeviceCertification(state, userID, fields)
		if err != nil {
			return nil, err
		}
		appFields["droneSn"] = drone.SN
	}
	app := CertificationApplication{ID: genID("cert"), UserID: userID, Role: role, Status: AuditPending, SubmittedAt: nowISO(), Fields: appFields}
	state.AuthApplications = append(state.AuthApplications, app)
	switch role {
	case RolePilot:
		setRoleProfileStatus(state, userID, role, RoleProfilePending, app.ID)
		if pilot := findPilot(state, userID); pilot != nil {
			pilot.NoCrimeProof = AuditPending
			pilot.HealthProof = AuditPending
			pilot.TrainingCerts = stringSliceField(fields["trainingCerts"])
		}
	case RoleOwner:
		setRoleProfileStatus(state, userID, role, RoleProfilePending, app.ID)
		if owner := findOwner(state, userID); owner != nil {
			owner.UOMVerified = false
		}
	case RoleClient:
		if user := findUser(state, userID); user != nil {
			user.RealNameVerified = false
			user.AuthStatus = string(AuditPending)
		}
	default:
		return nil, errors.New("认证角色不支持")
	}
	recordAudit(state, ActionCertification, userID, role, "certification", app.ID, "提交三方认证材料")
	notify(state, userID, NotifyAudit, "认证已提交", "材料已进入审核中状态", app.ID)
	return findCertification(state, app.ID), nil
}

func approveCertification(state *DBShape, appID string) (*CertificationApplication, error) {
	app := findCertification(state, appID)
	if app == nil {
		return nil, errors.New("认证申请不存在")
	}
	app.Status = AuditApproved
	app.ReviewedAt = nowISO()
	setRoleProfileStatus(state, app.UserID, app.Role, RoleProfileActive, app.ID)
	switch app.Role {
	case RolePilot:
		if pilot := findPilot(state, app.UserID); pilot != nil {
			pilot.NoCrimeProof = AuditApproved
			pilot.HealthProof = AuditApproved
		}
		if user := findUser(state, app.UserID); user != nil {
			user.RealNameVerified = true
			user.AuthStatus = string(AuditApproved)
		}
	case RoleOwner:
		if owner := findOwner(state, app.UserID); owner != nil {
			owner.UOMVerified = true
		}
		if user := findUser(state, app.UserID); user != nil {
			user.RealNameVerified = true
			user.AuthStatus = string(AuditApproved)
		}
		if err := approveOwnerDeviceFromCertification(state, app.UserID, app.Fields); err != nil {
			return nil, err
		}
	case RoleClient:
		if user := findUser(state, app.UserID); user != nil {
			user.RealNameVerified = true
			user.AuthStatus = string(AuditApproved)
		}
	}
	recordAudit(state, ActionCertification, "admin", RoleAdmin, "certification", app.ID, "后台通过认证")
	notify(state, app.UserID, NotifyAudit, "认证通过", "后台已通过认证申请", app.ID)
	return app, nil
}

func rejectCertification(state *DBShape, appID string) (*CertificationApplication, error) {
	app := findCertification(state, appID)
	if app == nil {
		return nil, errors.New("认证申请不存在")
	}
	app.Status = AuditRejected
	app.ReviewedAt = nowISO()
	switch app.Role {
	case RolePilot:
		setRoleProfileStatus(state, app.UserID, app.Role, RoleProfileRejected, app.ID)
		if pilot := findPilot(state, app.UserID); pilot != nil {
			pilot.NoCrimeProof = AuditRejected
		}
	case RoleOwner:
		setRoleProfileStatus(state, app.UserID, app.Role, RoleProfileRejected, app.ID)
		if owner := findOwner(state, app.UserID); owner != nil {
			owner.UOMVerified = false
		}
		rejectOwnerDeviceFromCertification(state, app.UserID, app.Fields)
	case RoleClient:
		if user := findUser(state, app.UserID); user != nil {
			user.RealNameVerified = false
			user.AuthStatus = string(AuditRejected)
		}
	}
	recordAudit(state, ActionCertification, "admin", RoleAdmin, "certification", app.ID, "后台驳回认证")
	notify(state, app.UserID, NotifyAudit, "认证驳回", "请补充认证材料后重新提交", app.ID)
	return app, nil
}

func submitOwnerDeviceCertification(state *DBShape, ownerID string, fields map[string]any) (*Drone, error) {
	insuranceAmount := intField(fields["insuranceAmount"], 0)
	maxPayloadKg := numberField(fields["maxPayloadKg"], 30)
	if insuranceAmount < minThirdParty {
		return nil, errors.New("三者险保额不足500万")
	}
	if maxPayloadKg <= 0 {
		return nil, errors.New("设备载荷必须大于0")
	}
	sn := stringField(fields["droneSn"], "SN-"+genID("dev"))
	model := stringField(fields["droneModel"], "演示设备")
	maintenance := stringField(fields["maintenance"], "演示维护记录")
	drone := findDroneByOwnerSN(state, ownerID, sn)
	if drone == nil {
		state.Drones = append(state.Drones, Drone{ID: genID("drn")})
		drone = &state.Drones[len(state.Drones)-1]
	}
	status := "idle"
	if drone.Status == "busy" {
		status = "busy"
	}
	drone.Brand = "Other"
	drone.Model = model
	drone.SN = sn
	drone.MaxPayloadKg = maxPayloadKg
	drone.Airworthiness = AuditPending
	drone.Insured = DroneInsurance{Hull: true, ThirdParty: true, ThirdPartyAmount: insuranceAmount}
	drone.MaintenanceLog = []MaintenanceLog{{Date: time.Now().Format("2006-01-02"), Note: maintenance}}
	drone.OwnerID = ownerID
	drone.Status = status
	if owner := findOwner(state, ownerID); owner != nil && !containsString(owner.Drones, drone.ID) {
		owner.Drones = append(owner.Drones, drone.ID)
	}
	setOwnerDroneCapacityStatus(state, ownerID, drone.ID, CapacityOffline)
	recordAudit(state, ActionCertification, ownerID, RoleOwner, "drone", drone.ID, "机主设备认证进入待审状态")
	return drone, nil
}

func approveOwnerDeviceFromCertification(state *DBShape, ownerID string, fields map[string]any) error {
	drone := submittedOwnerDrone(state, ownerID, fields)
	if drone == nil {
		return nil
	}
	drone.Airworthiness = AuditApproved
	for i := range state.Capacity {
		if state.Capacity[i].OwnerID == ownerID && state.Capacity[i].DroneID == drone.ID && state.Capacity[i].Status == CapacityBusy {
			recordAudit(state, ActionCertification, ownerID, RoleOwner, "drone", drone.ID, "忙碌设备认证通过，保持执行中运力")
			return nil
		}
	}
	return deployOwnerDrone(state, ownerID, drone.ID)
}

func rejectOwnerDeviceFromCertification(state *DBShape, ownerID string, fields map[string]any) {
	drone := submittedOwnerDrone(state, ownerID, fields)
	if drone == nil {
		return
	}
	drone.Airworthiness = AuditRejected
	setOwnerDroneCapacityStatus(state, ownerID, drone.ID, CapacityOffline)
}

func deployOwnerDrone(state *DBShape, ownerID string, droneID string) error {
	drone := findDrone(state, droneID)
	if drone == nil {
		return errors.New("设备不存在")
	}
	if drone.OwnerID != ownerID {
		return errors.New("设备不属于当前机主")
	}
	if !ownerCanOperate(state, ownerID) {
		return errors.New("机主资质未通过，请补充认证材料后重新提交审核")
	}
	if drone.Airworthiness != AuditApproved || drone.Insured.ThirdPartyAmount < minThirdParty {
		return errors.New("设备合规未通过")
	}
	pilot := operationalPilotForCapacity(state, "")
	if pilot == nil {
		return errors.New("暂无可用合规飞手，设备暂不能投放运力")
	}
	for i := range state.Capacity {
		if state.Capacity[i].OwnerID == ownerID && state.Capacity[i].DroneID == droneID {
			if state.Capacity[i].Status != CapacityBusy {
				state.Capacity[i].Status = CapacityOnline
				state.Capacity[i].PilotID = pilot.UserID
				state.Capacity[i].Location = pilot.Location
			}
			recordAudit(state, ActionCertification, ownerID, RoleOwner, "capacity", state.Capacity[i].ID, "合规设备重新上线")
			return nil
		}
	}
	capacity := CapacityUnit{ID: genID("cap"), PilotID: pilot.UserID, DroneID: droneID, OwnerID: ownerID, Location: pilot.Location, Status: CapacityOnline}
	state.Capacity = append(state.Capacity, capacity)
	recordAudit(state, ActionCertification, ownerID, RoleOwner, "capacity", capacity.ID, "合规设备生成运力并上线")
	return nil
}

func operationalPilotForCapacity(state *DBShape, preferredPilotID string) *PilotProfile {
	if preferredPilotID != "" {
		if pilot := findPilot(state, preferredPilotID); pilotCanOperate(state, pilot) {
			return pilot
		}
	}
	for i := range state.Pilots {
		if state.Pilots[i].UserID == preferredPilotID {
			continue
		}
		if pilotCanOperate(state, &state.Pilots[i]) {
			return &state.Pilots[i]
		}
	}
	return nil
}

func submittedOwnerDrone(state *DBShape, ownerID string, fields map[string]any) *Drone {
	sn := strings.TrimSpace(stringField(fields["droneSn"], ""))
	if sn == "" {
		return nil
	}
	return findDroneByOwnerSN(state, ownerID, sn)
}

func setOwnerDroneCapacityStatus(state *DBShape, ownerID string, droneID string, status CapacityStatus) {
	for i := range state.Capacity {
		if state.Capacity[i].OwnerID == ownerID && state.Capacity[i].DroneID == droneID && state.Capacity[i].Status != CapacityBusy {
			state.Capacity[i].Status = status
		}
	}
}

func transition(state *DBShape, orderID string, to OrderStatus, actor Role, note string) (*Order, error) {
	order := findOrder(state, orderID)
	if order == nil {
		return nil, errors.New("订单不存在")
	}
	if !canTransition(order.Status, to) {
		return nil, errors.New("非法流转")
	}
	if to == StatusConfirmed {
		if cap := findCapacity(state, order.CapacityID); cap != nil {
			cap.Status = CapacityBusy
		}
		if drone := findDrone(state, order.DroneID); drone != nil {
			drone.Status = "busy"
		}
	}
	if to == StatusCompleted {
		if cap := findCapacity(state, order.CapacityID); cap != nil {
			cap.Status = CapacityOnline
		}
		if drone := findDrone(state, order.DroneID); drone != nil {
			drone.Status = "idle"
		}
	}
	if to == StatusSettled {
		settlement := settleOrder(state, order)
		order.Settlement = &settlement
	}
	order.Status = to
	order.Events = append(order.Events, OrderEvent{At: nowISO(), Status: to, Actor: actor, Note: note})
	return order, nil
}

func canTransition(from OrderStatus, to OrderStatus) bool {
	next := map[OrderStatus][]OrderStatus{
		StatusCreated:          {StatusMatching, StatusCancelled},
		StatusMatching:         {StatusConfirmed, StatusCancelled},
		StatusConfirmed:        {StatusAirspaceApplying, StatusCancelled},
		StatusAirspaceApplying: {StatusPreparing, StatusCancelled, StatusException},
		StatusPreparing:        {StatusLoading, StatusCancelled, StatusException},
		StatusLoading:          {StatusInFlight, StatusException},
		StatusInFlight:         {StatusUnloading, StatusException},
		StatusUnloading:        {StatusCompleted, StatusException},
		StatusCompleted:        {StatusSettled},
	}
	for _, s := range next[from] {
		if s == to {
			return true
		}
	}
	return false
}

func bindInsurance(state *DBShape, order *Order, premiumCent int) {
	if order.PolicyID != "" {
		return
	}
	coverages := []string{"机身险", "第三者责任险"}
	if order.Cargo.Type == CargoValuable {
		coverages = append(coverages, "货物险")
	}
	policy := InsurancePolicy{ID: genID("pol"), OrderID: order.ID, CargoType: order.Cargo.Type, Coverages: coverages, InsuredAmountCent: max(order.Cargo.ValueCent*2, order.Cargo.ValueCent), PremiumCent: premiumCent, Status: "active"}
	state.Policies = append(state.Policies, policy)
	order.PolicyID = policy.ID
}

func createAirspaceRequest(state *DBShape, orderID string, status string) *AirspaceRequest {
	if req := firstAirspace(state, orderID); req != nil {
		return req
	}
	order := findOrder(state, orderID)
	now := time.Now()
	req := AirspaceRequest{
		ID: genID("air"), OrderID: orderID,
		Area: []GeoPoint{
			order.From,
			{Lng: order.From.Lng, Lat: order.To.Lat},
			order.To,
			{Lng: order.To.Lng, Lat: order.From.Lat},
		},
		AltitudeM: 120,
		Window:    TimeWindow{Start: now.Format(time.RFC3339Nano), End: now.Add(90 * time.Minute).Format(time.RFC3339Nano)},
		Status:    status,
	}
	state.Airspace = append(state.Airspace, req)
	return &state.Airspace[len(state.Airspace)-1]
}

func settleOrder(state *DBShape, order *Order) Settlement {
	total := order.PriceBreakdown.TotalCent
	rules := []SettlementItem{
		{Party: "platform", Ratio: .10, Cycle: "T+1", Note: "技术服务费"},
		{Party: "pilot", Ratio: .50, Cycle: "T+1", Note: "劳务报酬"},
		{Party: "owner", Ratio: .30, Cycle: "T+7", Note: "设备使用费"},
		{Party: "insurance", Ratio: .05, Cycle: "realtime", Note: "保险费用"},
		{Party: "tax", Ratio: .05, Cycle: "-", Note: "代扣代缴"},
	}
	sum := 0
	for i := range rules {
		rules[i].AmountCent = int(math.Round(float64(total) * rules[i].Ratio))
		sum += rules[i].AmountCent
	}
	rules[0].AmountCent += total - sum
	for _, item := range rules {
		if item.Party == "pilot" && order.PilotID != "" {
			walletCredit(state, order.PilotID, order.ID, item.AmountCent, item.Cycle, "飞手劳务")
		}
		if item.Party == "owner" {
			if drone := findDrone(state, order.DroneID); drone != nil {
				walletCredit(state, drone.OwnerID, order.ID, item.AmountCent, item.Cycle, "设备使用费")
			}
		}
	}
	return Settlement{OrderID: order.ID, TotalCent: total, Items: rules}
}

func walletCredit(state *DBShape, userID, orderID string, amount int, cycle string, note string) {
	wallet := findWallet(state, userID)
	if wallet == nil {
		state.Wallets = append(state.Wallets, Wallet{ID: userID, UserID: userID})
		wallet = &state.Wallets[len(state.Wallets)-1]
	}
	status := LedgerPending
	if cycle == "realtime" {
		status = LedgerAvail
		wallet.BalanceCent += amount
	} else {
		wallet.PendingCent += amount
	}
	state.Ledger = append(state.Ledger, LedgerEntry{ID: genID("le"), UserID: userID, OrderID: orderID, Type: LedgerSettleIn, AmountCent: amount, Cycle: cycle, Status: status, Note: note, CreatedAt: nowISO()})
}

func notify(state *DBShape, userID string, typ NotificationType, title, body, ref string) {
	state.Notifications = append(state.Notifications, Notification{ID: genID("ntf"), UserID: userID, Type: typ, Title: title, Body: body, Ref: ref, CreatedAt: nowISO()})
}

func recordAudit(state *DBShape, action AuditAction, actorID string, actorRole Role, targetType, targetID, detail string) {
	state.AuditLogs = append(state.AuditLogs, AuditLog{ID: genID("aud"), At: nowISO(), Action: action, ActorID: actorID, ActorRole: actorRole, TargetType: targetType, TargetID: targetID, Detail: detail})
}

func findOrder(s *DBShape, id string) *Order {
	for i := range s.Orders {
		if s.Orders[i].ID == id {
			return &s.Orders[i]
		}
	}
	return nil
}
func findPaymentOrder(s *DBShape, id string) *PaymentOrder {
	for i := range s.PaymentOrders {
		if s.PaymentOrders[i].ID == id {
			return &s.PaymentOrders[i]
		}
	}
	return nil
}
func findUser(s *DBShape, id string) *User {
	for i := range s.Users {
		if s.Users[i].ID == id {
			return &s.Users[i]
		}
	}
	return nil
}
func findPilot(s *DBShape, id string) *PilotProfile {
	for i := range s.Pilots {
		if s.Pilots[i].UserID == id {
			return &s.Pilots[i]
		}
	}
	return nil
}
func findOwner(s *DBShape, id string) *OwnerProfile {
	for i := range s.Owners {
		if s.Owners[i].UserID == id {
			return &s.Owners[i]
		}
	}
	return nil
}
func findDrone(s *DBShape, id string) *Drone {
	for i := range s.Drones {
		if s.Drones[i].ID == id {
			return &s.Drones[i]
		}
	}
	return nil
}
func pilotCanOperate(s *DBShape, pilot *PilotProfile) bool {
	if pilot == nil {
		return false
	}
	user := findUser(s, pilot.UserID)
	return (user == nil || !user.Blacklisted) &&
		roleProfileActive(s, pilot.UserID, RolePilot) &&
		pilot.NoCrimeProof == AuditApproved &&
		pilot.HealthProof == AuditApproved &&
		len(pilot.TrainingCerts) > 0
}
func ownerCanOperate(s *DBShape, ownerID string) bool {
	owner := findOwner(s, ownerID)
	user := findUser(s, ownerID)
	return owner != nil && owner.UOMVerified && roleProfileActive(s, ownerID, RoleOwner) && (user == nil || !user.Blacklisted)
}
func findCapacity(s *DBShape, id string) *CapacityUnit {
	for i := range s.Capacity {
		if s.Capacity[i].ID == id {
			return &s.Capacity[i]
		}
	}
	return nil
}
func findWallet(s *DBShape, id string) *Wallet {
	for i := range s.Wallets {
		if s.Wallets[i].ID == id || s.Wallets[i].UserID == id {
			return &s.Wallets[i]
		}
	}
	return nil
}
func firstAirspace(s *DBShape, orderID string) *AirspaceRequest {
	for i := range s.Airspace {
		if s.Airspace[i].OrderID == orderID {
			return &s.Airspace[i]
		}
	}
	return nil
}
func findCertification(s *DBShape, id string) *CertificationApplication {
	for i := range s.AuthApplications {
		if s.AuthApplications[i].ID == id {
			return &s.AuthApplications[i]
		}
	}
	return nil
}
func findDroneByOwnerSN(s *DBShape, ownerID string, sn string) *Drone {
	for i := range s.Drones {
		if s.Drones[i].OwnerID == ownerID && s.Drones[i].SN == sn {
			return &s.Drones[i]
		}
	}
	return nil
}

func distanceKm(a, b GeoPoint) float64 {
	const r = 6371
	dLat := (b.Lat - a.Lat) * math.Pi / 180
	dLng := (b.Lng - a.Lng) * math.Pi / 180
	lat1 := a.Lat * math.Pi / 180
	lat2 := b.Lat * math.Pi / 180
	h := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * r * math.Asin(math.Sqrt(h))
}

func etaMinutes(distKm float64) int {
	kmh := cruiseMS * 3.6
	return max(3, int(math.Round((distKm/kmh)*60))+prepMin)
}

func priceOrder(o Order, drone Drone, etaMin int, km float64) PriceBreakdown {
	base := baseFee(drone.MaxPayloadKg)
	mileage := mileageFee(km)
	duration := int(math.Round(float64(etaMin) * 3 * 100))
	weight := int(math.Ceil(o.Cargo.WeightKg/10) * 20 * 100)
	df := 1.0
	if o.ScheduledAt != "" {
		if t, err := time.Parse(time.RFC3339Nano, o.ScheduledAt); err == nil && t.Hour() >= 19 {
			df += .3
		}
	}
	if o.Needs.ShockProof {
		df += .2
	}
	if o.Needs.TempControl {
		df += .2
	}
	if df > 2 {
		df = 2
	}
	op := int(math.Round(float64(base+mileage+duration+weight) * df))
	insurance := 0
	if o.Needs.Insurance {
		if o.Cargo.Type == CargoValuable || o.Cargo.Type == CargoDangerous {
			insurance = int(math.Round(float64(o.Cargo.ValueCent) * .03))
		} else {
			insurance = int(math.Round(float64(o.Cargo.ValueCent) * .01))
		}
	}
	return PriceBreakdown{BaseCent: base, MileageCent: mileage, DurationCent: duration, WeightCent: weight, DifficultyFactor: round(df, 2), InsuranceCent: insurance, TotalCent: op + insurance}
}

func baseFee(kg float64) int {
	switch {
	case kg <= 5:
		return 5000
	case kg <= 15:
		return 10000
	case kg <= 30:
		return 15000
	default:
		return 20000
	}
}

func mileageFee(km float64) int {
	remain, fee := km, 0.0
	tiers := []struct{ span, rate float64 }{{5, 15}, {15, 10}, {math.Inf(1), 5}}
	for _, t := range tiers {
		span := math.Min(remain, t.span)
		fee += span * t.rate
		remain -= span
		if remain <= 0 {
			break
		}
	}
	return int(math.Round(fee * 100))
}

func round(n float64, places int) float64 {
	p := math.Pow(10, float64(places))
	return math.Round(n*p) / p
}

func fallback(v, fb string) string {
	if v != "" {
		return v
	}
	return fb
}
func copyFields(fields map[string]any) map[string]any {
	out := make(map[string]any, len(fields))
	for k, v := range fields {
		out[k] = v
	}
	return out
}
func stringField(value any, fallback string) string {
	switch v := value.(type) {
	case string:
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return fallback
}
func numberField(value any, fallback float64) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case json.Number:
		if n, err := strconv.ParseFloat(string(v), 64); err == nil {
			return n
		}
	}
	return fallback
}
func intField(value any, fallback int) int {
	return int(math.Round(numberField(value, float64(fallback))))
}
func stringSliceField(value any) []string {
	switch v := value.(type) {
	case []string:
		return append([]string{}, v...)
	case []any:
		out := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
				out = append(out, s)
			}
		}
		return out
	}
	return []string{}
}
func containsString(items []string, needle string) bool {
	for _, item := range items {
		if item == needle {
			return true
		}
	}
	return false
}
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
func itoa(n int) string            { return formatFloat(float64(n)) }
func formatFloat(n float64) string { return strconv.FormatFloat(n, 'f', -1, 64) }
