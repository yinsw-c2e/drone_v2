import type { PaymentMode } from '@/models';
import type { PaymentPrepayResult } from '@/models';
import { createBridgeProviders } from './bridge';
import { mockProviders } from './mock';

export interface PaymentProvider {
  prepay(orderId: string, amountCent: number, mode: PaymentMode): Promise<PaymentPrepayResult>;
}

export interface AirspaceProvider {
  apply(orderId: string): Promise<{ requestId: string; status: 'approved' | 'rejected' }>;
}

export interface InsuranceProvider {
  quote(orderId: string, valueCent: number): Promise<{ premiumCent: number; insuredAmountCent: number }>;
}

export interface CreditProvider {
  bureauScore(userId: string): Promise<{ userId: string; score: number }>;
}

export interface DroneProvider {
  arm(droneId: string): Promise<{ droneId: string; ready: boolean }>;
}

export interface Providers {
  payment: PaymentProvider;
  airspace: AirspaceProvider;
  insurance: InsuranceProvider;
  credit: CreditProvider;
  drone: DroneProvider;
}

export interface ProviderRuntimeEnv {
  MODE?: string;
  PROD?: boolean;
  VITE_APP_ENV?: string;
  VITE_PROVIDER_MODE?: string;
  VITE_PROVIDER_BRIDGE_URL?: string;
  VITE_PROVIDER_BRIDGE_TOKEN?: string;
}

export type ProviderRuntimeMode = 'mock' | 'bridge';

const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();

const isProductionRuntime = (env: ProviderRuntimeEnv): boolean => {
  return env.PROD === true || normalize(env.MODE) === 'production' || normalize(env.VITE_APP_ENV) === 'production';
};

const runtimeEnv = (): ProviderRuntimeEnv => import.meta.env as unknown as ProviderRuntimeEnv;

export function selectProviderMode(env: ProviderRuntimeEnv = runtimeEnv()): ProviderRuntimeMode {
  const production = isProductionRuntime(env);
  const configuredMode = normalize(env.VITE_PROVIDER_MODE);
  if (!configuredMode) {
    if (production) {
      throw new Error('provider配置缺失：生产模式必须设置 VITE_PROVIDER_MODE=bridge，不能默认使用 mock provider');
    }
    return 'mock';
  }

  if (configuredMode !== 'mock' && configuredMode !== 'bridge') {
    throw new Error(`provider配置无效：VITE_PROVIDER_MODE=${configuredMode}，只允许 mock 或 bridge`);
  }

  if (production && configuredMode === 'mock') {
    throw new Error('provider配置缺失：生产模式禁止使用 mock provider，请配置 VITE_PROVIDER_MODE=bridge');
  }

  return configuredMode;
}

export function selectProviders(env: ProviderRuntimeEnv = runtimeEnv()): Providers {
  const production = isProductionRuntime(env);
  const mode = selectProviderMode(env);
  if (mode === 'mock') {
    return mockProviders;
  }

  const baseURL = String(env.VITE_PROVIDER_BRIDGE_URL ?? '').trim();
  if (!baseURL) {
    throw new Error('provider配置缺失：VITE_PROVIDER_BRIDGE_URL 未配置，无法连接支付、空域、保险、征信、无人机外部服务桥接层');
  }
  const token = String(env.VITE_PROVIDER_BRIDGE_TOKEN ?? '').trim();
  if (production && !token) {
    throw new Error('provider配置缺失：生产模式必须设置 VITE_PROVIDER_BRIDGE_TOKEN，用于鉴权调用 backend provider bridge');
  }

  return createBridgeProviders({
    baseURL,
    token: token || undefined,
  });
}

export const providers = selectProviders();
