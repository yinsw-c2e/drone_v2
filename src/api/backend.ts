import { CargoType, PaymentMode } from '@/models';
import type { DBShape } from '@/utils/db';
import { hydrateDB } from '@/utils/db';
import type { AirspaceRequest, GeoPoint, MatchCandidate, Order, Review, Telemetry, TelemetrySnapshot } from '@/models';

type HttpMethod = 'GET' | 'POST';
type RequestBody = string | Record<string, unknown> | ArrayBuffer | undefined;

interface BackendEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
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

const env = ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {});
const backendURL = env.VITE_BACKEND_URL || 'http://localhost:8088';
const disabled = env.VITE_DISABLE_BACKEND === '1' || env.VITE_DISABLE_BACKEND === 'true';
const snapshotPushEnabled = env.VITE_ENABLE_SNAPSHOT_PUSH === '1' || env.VITE_ENABLE_SNAPSHOT_PUSH === 'true';
let lastNetworkFailure = 0;
let snapshotSyncTimer: ReturnType<typeof setTimeout> | undefined;
let snapshotSaving = false;

function canUseBackend() {
  if (disabled) return false;
  if (typeof uni === 'undefined' || typeof uni.request !== 'function') return false;
  return Date.now() - lastNetworkFailure > 1500;
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

async function requestBackend<T>(path: string, method: HttpMethod = 'GET', data?: RequestBody): Promise<T | undefined> {
  if (!canUseBackend()) return undefined;
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${backendURL}${normalizePath(path)}`,
      method,
      data,
      timeout: 2500,
      success: (response) => {
        const status = response.statusCode ?? 0;
        const body = response.data as BackendEnvelope<T>;
        if (status >= 200 && status < 300 && body?.ok) {
          resolve(body.data);
          return;
        }
        const message = body?.error || `后端请求失败 (${status})`;
        if (isRecoverableBackendMiss(status, message)) {
          lastNetworkFailure = Date.now();
          resolve(undefined);
          return;
        }
        reject(new Error(message));
      },
      fail: () => {
        lastNetworkFailure = Date.now();
        resolve(undefined);
      },
    });
  });
}

function isRecoverableBackendMiss(status: number, message: string) {
  return status === 404 || message.includes('订单不存在') || /not found/i.test(message);
}

function hydrateSnapshot<T extends { snapshot?: DBShape }>(data: T | undefined) {
  if (data?.snapshot) hydrateDB(data.snapshot);
  return data;
}

export async function syncBackendSnapshot() {
  const data = await requestBackend<{ snapshot: DBShape }>('/api/v1/snapshot');
  hydrateSnapshot(data);
  return data?.snapshot;
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

export async function confirmOrderRemote(orderId: string, capacityId: string) {
  const data = await requestBackend<{ order: Order; snapshot: DBShape }>(`/api/v1/orders/${orderId}/confirm`, 'POST', { capacityId });
  return hydrateSnapshot(data)?.order;
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
