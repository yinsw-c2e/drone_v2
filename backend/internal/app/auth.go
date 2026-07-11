package app

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	accessTokenTTL  = 15 * time.Minute
	refreshTokenTTL = 30 * 24 * time.Hour
	smsCodeTTL      = 5 * time.Minute
	smsSendInterval = 60 * time.Second
	maxSMSAttempts  = 5
)

type authPayload struct {
	User     *User             `json:"user"`
	Token    TokenPair         `json:"token"`
	Roles    []UserRoleProfile `json:"roles"`
	Snapshot *DBShape          `json:"snapshot,omitempty"`
}

func normalizeAuthState(state *DBShape) {
	if state == nil {
		return
	}
	now := nowISO()
	for i := range state.Users {
		user := &state.Users[i]
		if user.CreatedAt == "" {
			user.CreatedAt = now
		}
		if user.CurrentRole == "" && len(user.Roles) > 0 {
			user.CurrentRole = user.Roles[0]
		}
		if user.AuthStatus == "" {
			if user.RealNameVerified {
				user.AuthStatus = string(AuditApproved)
			} else {
				user.AuthStatus = string(AuditPending)
			}
		}
		for _, role := range user.Roles {
			if role != "" {
				ensureRoleProfile(state, user.ID, role, RoleProfileActive, "")
			}
		}
	}
	for i := range state.UserRoleProfiles {
		profile := &state.UserRoleProfiles[i]
		if profile.ID == "" {
			profile.ID = roleProfileID(profile.UserID, profile.Role)
		}
		if profile.Status == "" {
			profile.Status = RoleProfileActive
		}
		if profile.CreatedAt == "" {
			profile.CreatedAt = now
		}
		if profile.UpdatedAt == "" {
			profile.UpdatedAt = profile.CreatedAt
		}
		if profile.Status == RoleProfileActive {
			if user := findUser(state, profile.UserID); user != nil {
				addUserRole(user, profile.Role)
			}
		}
	}
}

func publicSnapshot(state *DBShape) *DBShape {
	if state == nil {
		return nil
	}
	out := *state
	out.AuthSessions = nil
	out.SMSCodes = nil
	return &out
}

func issueSMSCode(state *DBShape, phoneInput string) (*SMSCode, error) {
	phone, err := normalizeAndValidatePhone(phoneInput)
	if err != nil {
		return nil, err
	}
	if latest := latestSMSCode(state, phone); latest != nil && latest.ConsumedAt == "" {
		if sentAt, ok := parseTime(latest.SentAt); ok && time.Since(sentAt) < smsSendInterval {
			return nil, errors.New("验证码发送过于频繁，请稍后再试")
		}
	}
	hourAgo := time.Now().Add(-time.Hour)
	sentThisHour := 0
	for _, item := range state.SMSCodes {
		if item.Phone != phone {
			continue
		}
		if sentAt, ok := parseTime(item.SentAt); ok && sentAt.After(hourAgo) {
			sentThisHour++
		}
	}
	if sentThisHour >= 5 {
		return nil, errors.New("该手机号验证码请求过于频繁，请一小时后再试")
	}
	now := time.Now()
	plainCode := generateNumericCode()
	code := SMSCode{
		ID:        genID("sms"),
		Phone:     phone,
		Code:      hashSecret(plainCode),
		SentAt:    now.Format(time.RFC3339Nano),
		ExpiresAt: now.Add(smsCodeTTL).Format(time.RFC3339Nano),
	}
	state.SMSCodes = append(state.SMSCodes, code)
	dispatch := state.SMSCodes[len(state.SMSCodes)-1]
	dispatch.Code = plainCode
	return &dispatch, nil
}

func loginWithCode(state *DBShape, phoneInput string, code string) (*authPayload, error) {
	phone, err := normalizeAndValidatePhone(phoneInput)
	if err != nil {
		return nil, err
	}
	if err := verifySMSCode(state, phone, code); err != nil {
		return nil, err
	}
	user := findUserByPhone(state, phone)
	if user == nil {
		return nil, errors.New("手机号未注册，请先补全注册信息")
	}
	if user.Disabled {
		return nil, errors.New("账号已停用，请联系运营处理")
	}
	return createAuthPayload(state, user, true), nil
}

func registerWithCode(state *DBShape, phoneInput string, code string, nickname string, initialRole Role) (*authPayload, error) {
	phone, err := normalizeAndValidatePhone(phoneInput)
	if err != nil {
		return nil, err
	}
	if !selfRegisterRole(initialRole) {
		return nil, errors.New("该身份不支持自助注册")
	}
	if err := verifySMSCode(state, phone, code); err != nil {
		return nil, err
	}
	if findUserByPhone(state, phone) != nil {
		return nil, errors.New("手机号已注册，请直接登录")
	}
	now := nowISO()
	if strings.TrimSpace(nickname) == "" {
		nickname = "用户" + phone[len(phone)-4:]
	}
	status := RoleProfileActive
	if initialRole == RolePilot || initialRole == RoleOwner {
		status = RoleProfilePending
	}
	user := User{
		ID:               genID("u"),
		Phone:            phone,
		Nickname:         strings.TrimSpace(nickname),
		Roles:            []Role{initialRole},
		CurrentRole:      initialRole,
		AuthStatus:       string(AuditPending),
		RealNameVerified: false,
		CreatedAt:        now,
	}
	state.Users = append(state.Users, user)
	ensureRoleProfile(state, user.ID, initialRole, status, "")
	ensureRoleDataProfile(state, user.ID, initialRole)
	ensureWallet(state, user.ID)
	recordAudit(state, ActionLogin, user.ID, initialRole, "user", user.ID, "手机号验证码注册")
	return createAuthPayload(state, findUser(state, user.ID), true), nil
}

func refreshAuthSession(state *DBShape, refreshToken string) (*authPayload, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return nil, errors.New("refreshToken 不能为空")
	}
	session := findSessionByRefreshToken(state, refreshToken)
	if session == nil {
		return nil, errors.New("登录态已失效，请重新登录")
	}
	refreshExpiresAt, ok := parseTime(session.RefreshExpiresAt)
	if !ok || time.Now().After(refreshExpiresAt) {
		removeSessionByHash(state, session.AccessToken, session.RefreshToken)
		return nil, errors.New("登录态已过期，请重新登录")
	}
	user := findUser(state, session.UserID)
	if user == nil || user.Disabled {
		return nil, errors.New("账号不可用，请重新登录")
	}
	accessToken := genID("atk")
	newRefreshToken := genID("rtk")
	session.AccessToken = hashSecret(accessToken)
	session.RefreshToken = hashSecret(newRefreshToken)
	session.ExpiresAt = time.Now().Add(accessTokenTTL).Format(time.RFC3339Nano)
	session.RefreshExpiresAt = time.Now().Add(refreshTokenTTL).Format(time.RFC3339Nano)
	return &authPayload{User: user, Token: TokenPair{AccessToken: accessToken, RefreshToken: newRefreshToken, ExpiresAt: session.ExpiresAt}, Roles: rolesForUser(state, user.ID), Snapshot: snapshotForUser(state, user)}, nil
}

func authUserByAccessToken(state *DBShape, accessToken string) (*User, *AuthSession, error) {
	if strings.TrimSpace(accessToken) == "" {
		return nil, nil, errors.New("缺少登录 token")
	}
	session := findSessionByAccessToken(state, strings.TrimSpace(accessToken))
	if session == nil {
		return nil, nil, errors.New("登录态已失效，请重新登录")
	}
	expiresAt, ok := parseTime(session.ExpiresAt)
	if !ok || time.Now().After(expiresAt) {
		return nil, nil, errors.New("登录态已过期，请重新登录")
	}
	user := findUser(state, session.UserID)
	if user == nil || user.Disabled {
		return nil, nil, errors.New("账号不可用，请重新登录")
	}
	return user, session, nil
}

func authMe(state *DBShape, accessToken string) (*authPayload, error) {
	user, session, err := authUserByAccessToken(state, accessToken)
	if err != nil {
		return nil, err
	}
	return &authPayload{User: user, Token: TokenPair{ExpiresAt: session.ExpiresAt}, Roles: rolesForUser(state, user.ID), Snapshot: snapshotForUser(state, user)}, nil
}

func logoutAuthSession(state *DBShape, accessToken string, refreshToken string) {
	removeSession(state, strings.TrimSpace(accessToken), strings.TrimSpace(refreshToken))
}

func requestUserRole(state *DBShape, userID string, role Role) (*UserRoleProfile, error) {
	user := findUser(state, userID)
	if user == nil {
		return nil, errors.New("用户不存在")
	}
	if !selfRegisterRole(role) {
		return nil, errors.New("该身份不支持自助申请")
	}
	status := RoleProfileActive
	if role == RolePilot || role == RoleOwner {
		status = RoleProfilePending
	}
	profile := ensureRoleProfile(state, userID, role, status, "")
	if profile.Status == RoleProfileRejected {
		profile.Status = RoleProfilePending
		profile.UpdatedAt = nowISO()
	}
	addUserRole(user, role)
	ensureRoleDataProfile(state, userID, role)
	recordAudit(state, ActionLogin, userID, role, "role", profile.ID, "申请新增业务身份")
	return profile, nil
}

func switchUserRole(state *DBShape, userID string, role Role) (*authPayload, error) {
	user := findUser(state, userID)
	if user == nil {
		return nil, errors.New("用户不存在")
	}
	profile := findRoleProfile(state, userID, role)
	if profile == nil || profile.Status != RoleProfileActive {
		return nil, errors.New("该身份尚未激活，不能切换")
	}
	user.CurrentRole = role
	addUserRole(user, role)
	removeSessionsForUser(state, userID)
	recordAudit(state, ActionLogin, userID, role, "role", profile.ID, "切换当前业务身份")
	return createAuthPayload(state, user, false), nil
}

func activeRoleProfiles(state *DBShape, userID string) []UserRoleProfile {
	out := make([]UserRoleProfile, 0)
	for _, profile := range state.UserRoleProfiles {
		if profile.UserID == userID && profile.Status == RoleProfileActive {
			out = append(out, profile)
		}
	}
	return out
}

func rolesForUser(state *DBShape, userID string) []UserRoleProfile {
	out := make([]UserRoleProfile, 0)
	for _, profile := range state.UserRoleProfiles {
		if profile.UserID == userID {
			out = append(out, profile)
		}
	}
	return out
}

func roleProfileActive(state *DBShape, userID string, role Role) bool {
	profile := findRoleProfile(state, userID, role)
	return profile != nil && profile.Status == RoleProfileActive
}

func setRoleProfileStatus(state *DBShape, userID string, role Role, status RoleProfileStatus, certificationID string) *UserRoleProfile {
	profile := ensureRoleProfile(state, userID, role, status, certificationID)
	profile.Status = status
	if certificationID != "" {
		profile.CertificationID = certificationID
	}
	profile.UpdatedAt = nowISO()
	if status == RoleProfileActive {
		if user := findUser(state, userID); user != nil {
			addUserRole(user, role)
		}
	}
	return profile
}

func ensureRoleProfile(state *DBShape, userID string, role Role, status RoleProfileStatus, certificationID string) *UserRoleProfile {
	if profile := findRoleProfile(state, userID, role); profile != nil {
		if profile.Status == "" {
			profile.Status = status
		}
		if certificationID != "" {
			profile.CertificationID = certificationID
		}
		if profile.CreatedAt == "" {
			profile.CreatedAt = nowISO()
		}
		if profile.UpdatedAt == "" {
			profile.UpdatedAt = profile.CreatedAt
		}
		return profile
	}
	now := nowISO()
	profile := UserRoleProfile{ID: roleProfileID(userID, role), UserID: userID, Role: role, Status: status, CertificationID: certificationID, CreatedAt: now, UpdatedAt: now}
	state.UserRoleProfiles = append(state.UserRoleProfiles, profile)
	return &state.UserRoleProfiles[len(state.UserRoleProfiles)-1]
}

func findRoleProfile(state *DBShape, userID string, role Role) *UserRoleProfile {
	for i := range state.UserRoleProfiles {
		if state.UserRoleProfiles[i].UserID == userID && state.UserRoleProfiles[i].Role == role {
			return &state.UserRoleProfiles[i]
		}
	}
	return nil
}

func roleProfileID(userID string, role Role) string {
	return userID + "_" + string(role)
}

func selfRegisterRole(role Role) bool {
	return role == RoleClient || role == RolePilot || role == RoleOwner
}

func createAuthPayload(state *DBShape, user *User, markLogin bool) *authPayload {
	now := time.Now()
	accessToken := genID("atk")
	refreshToken := genID("rtk")
	session := AuthSession{
		AccessToken:      hashSecret(accessToken),
		RefreshToken:     hashSecret(refreshToken),
		UserID:           user.ID,
		ExpiresAt:        now.Add(accessTokenTTL).Format(time.RFC3339Nano),
		RefreshExpiresAt: now.Add(refreshTokenTTL).Format(time.RFC3339Nano),
		CreatedAt:        now.Format(time.RFC3339Nano),
	}
	state.AuthSessions = append(state.AuthSessions, session)
	if markLogin {
		user.LastLoginAt = session.CreatedAt
		recordAudit(state, ActionLogin, user.ID, user.CurrentRole, "user", user.ID, "手机号验证码登录")
	}
	return &authPayload{User: user, Token: TokenPair{AccessToken: accessToken, RefreshToken: refreshToken, ExpiresAt: session.ExpiresAt}, Roles: rolesForUser(state, user.ID), Snapshot: snapshotForUser(state, user)}
}

func verifySMSCode(state *DBShape, phone string, code string) error {
	if strings.TrimSpace(code) == "" {
		return errors.New("验证码不能为空")
	}
	sms := latestSMSCode(state, phone)
	if sms == nil || sms.ConsumedAt != "" {
		return errors.New("请先获取验证码")
	}
	expiresAt, ok := parseTime(sms.ExpiresAt)
	if !ok || time.Now().After(expiresAt) {
		return errors.New("验证码已过期")
	}
	if sms.Attempts >= maxSMSAttempts {
		return errors.New("验证码错误次数过多，请重新获取")
	}
	if sms.Code != hashSecret(strings.TrimSpace(code)) {
		sms.Attempts++
		return errors.New("验证码错误")
	}
	sms.ConsumedAt = nowISO()
	return nil
}

func latestSMSCode(state *DBShape, phone string) *SMSCode {
	var latest *SMSCode
	var latestAt time.Time
	for i := range state.SMSCodes {
		if state.SMSCodes[i].Phone != phone {
			continue
		}
		sentAt, ok := parseTime(state.SMSCodes[i].SentAt)
		if latest == nil || (ok && sentAt.After(latestAt)) {
			latest = &state.SMSCodes[i]
			latestAt = sentAt
		}
	}
	return latest
}

func findUserByPhone(state *DBShape, phone string) *User {
	for i := range state.Users {
		if normalizePhone(state.Users[i].Phone) == phone {
			return &state.Users[i]
		}
	}
	return nil
}

func findSessionByAccessToken(state *DBShape, accessToken string) *AuthSession {
	hash := hashSecret(accessToken)
	for i := range state.AuthSessions {
		if state.AuthSessions[i].AccessToken == hash {
			return &state.AuthSessions[i]
		}
	}
	return nil
}

func findSessionByRefreshToken(state *DBShape, refreshToken string) *AuthSession {
	hash := hashSecret(refreshToken)
	for i := range state.AuthSessions {
		if state.AuthSessions[i].RefreshToken == hash {
			return &state.AuthSessions[i]
		}
	}
	return nil
}

func removeSession(state *DBShape, accessToken string, refreshToken string) {
	accessHash := hashSecret(accessToken)
	refreshHash := hashSecret(refreshToken)
	removeSessionByHash(state, accessHash, refreshHash)
}

func removeSessionByHash(state *DBShape, accessHash string, refreshHash string) {
	out := state.AuthSessions[:0]
	for _, session := range state.AuthSessions {
		if (accessHash != "" && session.AccessToken == accessHash) || (refreshHash != "" && session.RefreshToken == refreshHash) {
			continue
		}
		out = append(out, session)
	}
	state.AuthSessions = out
}

func removeSessionsForUser(state *DBShape, userID string) {
	out := state.AuthSessions[:0]
	for _, session := range state.AuthSessions {
		if session.UserID != userID {
			out = append(out, session)
		}
	}
	state.AuthSessions = out
}

func hashSecret(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func normalizeAndValidatePhone(phoneInput string) (string, error) {
	phone := normalizePhone(phoneInput)
	if len(phone) != 11 || phone[0] != '1' {
		return "", errors.New("请输入有效的 11 位手机号")
	}
	return phone, nil
}

func normalizePhone(phone string) string {
	var b strings.Builder
	for _, ch := range phone {
		if ch >= '0' && ch <= '9' {
			b.WriteRune(ch)
		}
	}
	return b.String()
}

func generateNumericCode() string {
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "123456"
	}
	return fmt.Sprintf("%06d", binary.BigEndian.Uint32(b[:])%1_000_000)
}

func parseTime(value string) (time.Time, bool) {
	if strings.TrimSpace(value) == "" {
		return time.Time{}, false
	}
	t, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}, false
	}
	return t, true
}

func addUserRole(user *User, role Role) {
	if role == "" {
		return
	}
	for _, item := range user.Roles {
		if item == role {
			return
		}
	}
	user.Roles = append(user.Roles, role)
}

func ensureRoleDataProfile(state *DBShape, userID string, role Role) {
	switch role {
	case RoleClient:
		if findClient(state, userID) == nil {
			state.Clients = append(state.Clients, ClientProfile{UserID: userID, EntityType: "person", Stats: map[string]any{"payTimely": 1, "defaultCount": 0, "infoTrust": .8, "complaintRate": 0, "orderAccuracy": .9, "cancelRate": 0}})
		}
	case RolePilot:
		if findPilot(state, userID) == nil {
			state.Pilots = append(state.Pilots, PilotProfile{UserID: userID, CAACLevel: "VLOS", CAACExpire: "", NoCrimeProof: AuditPending, HealthProof: AuditPending, TrainingCerts: []string{}, Online: false, Location: GeoPoint{Lng: 116.4, Lat: 39.9}, Stats: PilotStats{}})
		}
	case RoleOwner:
		if findOwner(state, userID) == nil {
			state.Owners = append(state.Owners, OwnerProfile{UserID: userID, EntityType: "person", Drones: []string{}, UOMVerified: false, Stats: map[string]any{"deviceUptime": 0, "faultRate": 0, "maintainTimely": 0, "completeRate": 0, "cancelRate": 0, "respSec": 0, "cooperation": 0}})
		}
	}
}

func ensureWallet(state *DBShape, userID string) {
	if findWallet(state, userID) != nil {
		return
	}
	state.Wallets = append(state.Wallets, Wallet{ID: userID, UserID: userID})
}

func findClient(s *DBShape, id string) *ClientProfile {
	for i := range s.Clients {
		if s.Clients[i].UserID == id {
			return &s.Clients[i]
		}
	}
	return nil
}
