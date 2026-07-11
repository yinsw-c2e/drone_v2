import type { PaymentMode } from '@/models';
import type { PaymentPrepayResult } from '@/models';
import { createBackendProviders } from './server';
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
}

export type ProviderRuntimeMode = 'mock' | 'backend';

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
      return 'backend';
    }
    return 'mock';
  }

  if (configuredMode !== 'mock' && configuredMode !== 'backend') {
    throw new Error(`provider配置无效：VITE_PROVIDER_MODE=${configuredMode}，只允许 mock 或 backend`);
  }

  if (production && configuredMode === 'mock') {
    throw new Error('provider配置缺失：生产模式禁止使用 mock provider');
  }

  return configuredMode;
}

export function selectProviders(env: ProviderRuntimeEnv = runtimeEnv()): Providers {
  const mode = selectProviderMode(env);
  if (mode === 'mock') {
    return mockProviders;
  }

  return createBackendProviders();
}

export const providers = selectProviders();
