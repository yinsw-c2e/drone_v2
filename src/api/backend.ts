import { CargoType, PaymentMode } from '@/models';
import type { DBShape } from '@/utils/db';
import { hydrateDB } from '@/utils/db';
import type { AirspaceRequest, CertificationApplication, GeoPoint, MatchCandidate, Order, PaymentOrder, PaymentPrepayResult, Review, Telemetry, TelemetrySnapshot, TokenPair, User, UserRoleProfile } from '@/models';
import type { Role } from '@/models';

type HttpMethod = 'GET' | 'POST';
type RequestBody = string | Record<string, unknown> | ArrayBuffer | undefined;

interface BackendEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface BackendResponse<T> {
  statusCode?: number;
  data?: BackendEnvelope<T>;
}

export interface AuthPayload {
  user: User;
  token: TokenPair;
  roles: UserRoleProfile[];
  snapshot?: DBShape;
}

export interface SendCodeResult {
  phone: string;
  expiresAt: string;
  provider: string;
  mockCode?: string;
}

export interface SubmitOrderPayload {
  clientId: string;
  cargoType: CargoType;
  weightKg: number;
  valueCent: number;
  budgetCent: number;
  insured: boolean;
  shockProof: boolean;
  tempControl?: boolean;
  special?: string;
  remark?: string;
  volume?: string;
  photos?: string[];
  timeMode?: 'instant' | 'scheduled';
  scheduledAt?: string;
  timeRequirement?: string;
  paymentMode?: PaymentMode;
  invoiceTitle?: string;
  from?: GeoPoint;
  to?: GeoPoint;
}

export interface BackendRuntimeEnv {
  PROD?: boolean;
  MODE?: string;
  VITE_APP_ENV?: string;
  VITE_BACKEND_URL?: string;
  VITE_DISABLE_BACKEND?: string;
  VITE_ENABLE_SNAPSHOT_PUSH?: string;
  VITE_BACKEND_TIMEOUT_MS?: string;
}

const env = ((import.meta as ImportMeta & { env?: BackendRuntimeEnv }).env ?? {});
const backendURL = env.VITE_BACKEND_URL || 'http://localhost:8088';
const disabled = env.VITE_DISABLE_BACKEND === '1' || env.VITE_DISABLE_BACKEND === 'true';
const snapshotPushEnabled = env.VITE_ENABLE_SNAPSHOT_PUSH === '1' || env.VITE_ENABLE_SNAPSHOT_PUSH === 'true';
const backendRequired = isProductionBackendRequired(env);
const requestTimeoutMs = positiveNumber(env.VITE_BACKEND_TIMEOUT_MS, backendRequired ? 8_000 : 2_500);
const ACCESS_TOKEN_KEY = 'drone_auth_access_token';
const REFRESH_TOKEN_KEY = 'drone_auth_refresh_token';
const TOKEN_EXPIRES_KEY = 'drone_auth_token_expires_at';
let lastNetworkFailure = 0;
let snapshotSyncTimer: ReturnType<typeof setTimeout> | undefined;
let snapshotSaving = false;

export function isProductionBackendRequired(runtime: BackendRuntimeEnv = env) {
  return runtime.PROD === true || runtime.MODE === 'production' || runtime.VITE_APP_ENV === 'production';
}

export function handleUnavailableBackend(runtime: BackendRuntimeEnv = env): undefined {
  if (isProductionBackendRequired(runtime)) throw new Error('服务暂不可用，请检查网络后重试');
  return undefined;
}

export function allowsLocalBackendFallback(status: number, message: string, runtime: BackendRuntimeEnv = env) {
  return !isProductionBackendRequired(runtime) && isRecoverableBackendMiss(status, message);
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function canUseBackend() {
  if (disabled) return false;
  if (typeof uni === 'undefined' || typeof uni.request !== 'function') return false;
  return Date.now() - lastNetworkFailure > 1500;
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

function authHeader() {
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function rawBackendRequest<T>(path: string, method: HttpMethod = 'GET', data?: RequestBody, includeAuth = true): Promise<BackendResponse<T> | undefined> {
  if (!canUseBackend()) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    uni.request({
      url: `${backendURL}${normalizePath(path)}`,
      method,
      data,
      header: includeAuth ? authHeader() : {},
      timeout: requestTimeoutMs,
      success: (response) => {
        resolve({ statusCode: response.statusCode, data: response.data as BackendEnvelope<T> });
      },
      fail: () => {
        lastNetworkFailure = Date.now();
        resolve(undefined);
      },
    });
  });
}

async function requestBackend<T>(path: string, method: HttpMethod = 'GET', data?: RequestBody, retryAuth = true): Promise<T | undefined> {
  const response = await rawBackendRequest<T>(path, method, data);
  if (!response) return handleUnavailableBackend(env);
  const status = response.statusCode ?? 0;
  const body = response.data;
  if (status >= 200 && status < 300 && body?.ok) {
    return body.data;
  }
  const message = body?.error || `服务请求失败（${status}）`;
  if (status === 401 && retryAuth) {
    const refresh = await refreshStoredToken();
    if (refresh === 'refreshed') return requestBackend<T>(path, method, data, false);
    if (refresh === 'unavailable') throw new Error('登录续期服务暂不可用，请稍后重试');
  }
  if (status === 401) clearStoredAuthTokens();
  if (allowsLocalBackendFallback(status, message, env)) {
    lastNetworkFailure = Date.now();
    return undefined;
  }
  throw new Error(message);
}

function isRecoverableBackendMiss(status: number, message: string) {
  return status === 404 || message.includes('订单不存在') || /not found/i.test(message);
}

function hydrateSnapshot<T extends { snapshot?: DBShape }>(data: T | undefined) {
  if (data?.snapshot) hydrateDB(data.snapshot);
  return data;
}

function hydrateAuthPayload(data: AuthPayload | undefined) {
  hydrateSnapshot(data);
  return data;
}

export function getStoredAccessToken() {
  try {
    return uni.getStorageSync(ACCESS_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getStoredRefreshToken() {
  try {
    return uni.getStorageSync(REFRESH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAuthTokens(token: TokenPair | undefined) {
  if (!token) return;
  uni.setStorageSync(ACCESS_TOKEN_KEY, token.accessToken);
  uni.setStorageSync(REFRESH_TOKEN_KEY, token.refreshToken);
  uni.setStorageSync(TOKEN_EXPIRES_KEY, token.expiresAt);
}

export function clearStoredAuthTokens() {
  uni.removeStorageSync(ACCESS_TOKEN_KEY);
  uni.removeStorageSync(REFRESH_TOKEN_KEY);
  uni.removeStorageSync(TOKEN_EXPIRES_KEY);
}

async function refreshStoredToken(): Promise<'refreshed' | 'invalid' | 'unavailable'> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return 'invalid';
  const response = await rawBackendRequest<AuthPayload>('/api/v1/auth/refresh', 'POST', { refreshToken }, false);
  if (!response) return 'unavailable';
  const status = response?.statusCode ?? 0;
  const payload = response?.data;
  if (status >= 200 && status < 300 && payload?.ok && payload.data?.token) {
    saveAuthTokens(payload.data.token);
    hydrateAuthPayload(payload.data);
    return 'refreshed';
  }
  if (status === 400 || status === 401 || status === 403) {
    clearStoredAuthTokens();
    return 'invalid';
  }
  return 'unavailable';
}

export async function syncBackendSnapshot() {
  if (getStoredAccessToken()) {
    const session = await loadMeRemote();
    return session?.snapshot;
  }
  if (backendRequired) return undefined;
  const data = await requestBackend<{ snapshot: DBShape }>('/api/v1/snapshot');
  hydrateSnapshot(data);
  return data?.snapshot;
}

export async function providerPaymentPrepayRemote(orderId: string, amountCent: number, mode: PaymentMode, capacityId?: string) {
  return requestBackend<PaymentPrepayResult>('/api/v1/provider/payment/prepay', 'POST', { orderId, amountCent, mode, capacityId });
}

export async function providerAirspaceApplyRemote(orderId: string) {
  return requestBackend<{ requestId: string; status: 'approved' | 'rejected' }>('/api/v1/provider/airspace/apply', 'POST', { orderId });
}

export async function providerInsuranceQuoteRemote(orderId: string, valueCent: number) {
  return requestBackend<{ premiumCent: number; insuredAmountCent: number }>('/api/v1/provider/insurance/quote', 'POST', { orderId, valueCent });
}

export async function providerCreditScoreRemote(userId: string) {
  return requestBackend<{ userId: string; score: number }>('/api/v1/provider/credit/bureau-score', 'POST', { userId });
}

export async function providerDroneArmRemote(droneId: string, orderId?: string) {
  return requestBackend<{ droneId: string; ready: boolean }>('/api/v1/provider/drone/arm', 'POST', { droneId, orderId });
}

export async function sendCodeRemote(phone: string) {
  return requestBackend<SendCodeResult>('/api/v1/auth/send-code', 'POST', { phone });
}

export async function registerRemote(phone: string, code: string, nickname: string, initialRole: Role) {
  const data = await requestBackend<AuthPayload>('/api/v1/auth/register', 'POST', { phone, code, nickname, initialRole });
  return hydrateAuthPayload(data);
}

export async function loginRemote(phone: string, code: string) {
  const data = await requestBackend<AuthPayload>('/api/v1/auth/login', 'POST', { phone, code });
  return hydrateAuthPayload(data);
}

export async function loadMeRemote() {
  const data = await requestBackend<AuthPayload>('/api/v1/auth/me');
  return hydrateAuthPayload(data);
}

export async function logoutRemote(refreshToken: string) {
  const data = await requestBackend<{ snapshot: DBShape }>('/api/v1/auth/logout', 'POST', { refreshToken });
  return hydrateSnapshot(data);
}

export async function requestRoleRemote(role: Role) {
  const data = await requestBackend<{ role: UserRoleProfile; user: User; roles: UserRoleProfile[]; snapshot: DBShape }>('/api/v1/auth/roles', 'POST', { role });
  return hydrateSnapshot(data);
}

export async function switchRoleRemote(role: Role) {
  const data = await requestBackend<AuthPayload>('/api/v1/auth/switch-role', 'POST', { role });
  return hydrateAuthPayload(data);
}

export function queueBackendSnapshotSync(snapshot: DBShape) {
  if (!snapshotPushEnabled) return;
  if (!canUseBackend()) return;
  if (snapshotSyncTimer) clearTimeout(snapshotSyncTimer);
  snapshotSyncTimer = setTimeout(() => {
    void saveBackendSnapshot(snapshot);
  }, 800);
}

export function isBackendSnapshotPushEnabled() {
  return snapshotPushEnabled;
}

async function saveBackendSnapshot(snapshot: DBShape) {
  if (snapshotSaving) return;
  snapshotSaving = true;
  try {
    const plain = JSON.parse(JSON.stringify(snapshot)) as DBShape;
    await requestBackend<{ snapshot: DBShape }>('/api/v1/snapshot', 'POST', { snapshot: plain as unknown as Record<string, unknown> });
  } finally {
    snapshotSaving = false;
  }
}

export async function saveBackendSnapshotNow(snapshot: DBShape) {
  if (!canUseBackend()) return;
  await saveBackendSnapshot(snapshot);
}

export async function submitOrderRemote(payload: SubmitOrderPayload) {
  const data = await requestBackend<{ order: Order; snapshot: DBShape }>('/api/v1/orders', 'POST', payload as unknown as Record<string, unknown>);
  return hydrateSnapshot(data)?.order;
}

export async function fetchCandidatesRemote(orderId: string, strategy: string) {
  const data = await requestBackend<{ candidates: MatchCandidate[]; snapshot: DBShape }>(`/api/v1/orders/${orderId}/candidates?strategy=${encodeURIComponent(strategy)}`);
  return hydrateSnapshot(data)?.candidates;
}

export async function confirmOrderRemote(orderId: string, capacityId: string, paymentId?: string) {
  const data = await requestBackend<{ order: Order; payment?: PaymentOrder; snapshot: DBShape }>(`/api/v1/orders/${orderId}/confirm`, 'POST', { capacityId, paymentId });
  return hydrateSnapshot(data)?.order;
}

export async function syncPaymentRemote(paymentId: string) {
  const data = await requestBackend<{ payment: PaymentOrder; snapshot: DBShape }>(`/api/v1/payments/${encodeURIComponent(paymentId)}/sync`, 'POST');
  return hydrateSnapshot(data)?.payment;
}

export async function advanceOrderRemote(orderId: string) {
  const data = await requestBackend<{ order: Order; snapshot: DBShape }>(`/api/v1/orders/${orderId}/advance`, 'POST');
  return hydrateSnapshot(data)?.order;
}

export async function decideAirspaceRemote(orderId: string, status: AirspaceRequest['status'] = 'approved') {
  const data = await requestBackend<{ order: Order; airspace: AirspaceRequest; snapshot: DBShape }>(`/api/v1/orders/${orderId}/airspace`, 'POST', { status });
  return hydrateSnapshot(data);
}

export async function fetchTelemetryRemote(orderId: string) {
  const data = await requestBackend<{ telemetry?: TelemetrySnapshot; snapshot: DBShape }>(`/api/v1/orders/${orderId}/telemetry`);
  return hydrateSnapshot(data)?.telemetry;
}

export async function saveTelemetryRemote(orderId: string, frame: Telemetry, source: TelemetrySnapshot['source'] = 'simulator') {
  const data = await requestBackend<{ telemetry: TelemetrySnapshot; snapshot: DBShape }>(`/api/v1/orders/${orderId}/telemetry`, 'POST', { frame: frame as unknown as Record<string, unknown>, source });
  return hydrateSnapshot(data)?.telemetry;
}

export async function finishOrderRemote(orderId: string) {
  const data = await requestBackend<{ order: Order; snapshot: DBShape }>(`/api/v1/orders/${orderId}/finish`, 'POST');
  return hydrateSnapshot(data)?.order;
}

export async function reviewOrderRemote(orderId: string, star: 1 | 2 | 3 | 4 | 5, text: string) {
  const data = await requestBackend<{ review: Review; snapshot: DBShape }>(`/api/v1/orders/${orderId}/review`, 'POST', { star, text });
  return hydrateSnapshot(data)?.review;
}

export async function fetchCertificationsRemote(status?: CertificationApplication['status']) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
  const data = await requestBackend<{ applications: CertificationApplication[]; snapshot: DBShape }>(`/api/v1/certifications${suffix}`);
  return hydrateSnapshot(data)?.applications;
}

export async function submitCertificationRemote(role: Role, userId: string, fields: CertificationApplication['fields']) {
  const data = await requestBackend<{ application: CertificationApplication; snapshot: DBShape }>('/api/v1/certifications', 'POST', {
    role,
    userId,
    fields: fields as unknown as Record<string, unknown>,
  });
  return hydrateSnapshot(data)?.application;
}

export async function approveCertificationRemote(appId: string) {
  const data = await requestBackend<{ application: CertificationApplication; snapshot: DBShape }>(`/api/v1/certifications/${encodeURIComponent(appId)}/approve`, 'POST');
  return hydrateSnapshot(data)?.application;
}

export async function rejectCertificationRemote(appId: string) {
  const data = await requestBackend<{ application: CertificationApplication; snapshot: DBShape }>(`/api/v1/certifications/${encodeURIComponent(appId)}/reject`, 'POST');
  return hydrateSnapshot(data)?.application;
}
