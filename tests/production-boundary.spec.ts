import { afterEach, expect, it, vi } from 'vitest';
import { createEmptyDB, migrateDB } from '@/utils/db';
import { allowsLocalBusinessMutation } from '@/utils/repo';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it('production runtime requires the backend and never treats it as optional', async () => {
  const { isProductionBackendRequired } = await import('@/api/backend');
  expect(isProductionBackendRequired({ PROD: true })).toBe(true);
  expect(isProductionBackendRequired({ MODE: 'production' })).toBe(true);
  expect(isProductionBackendRequired({ VITE_APP_ENV: 'production' })).toBe(true);
  expect(isProductionBackendRequired({ MODE: 'development' })).toBe(false);
});

it('server snapshots never receive demo wallets or certification queues', () => {
  const hydrated = migrateDB(createEmptyDB(), false);
  expect(hydrated.wallets).toEqual([]);
  expect(hydrated.ledger).toEqual([]);
  expect(hydrated.authApplications).toEqual([]);
  expect(hydrated.orders).toEqual([]);
});

it('production network failure is surfaced instead of falling back to local business data', async () => {
  const { handleUnavailableBackend } = await import('@/api/backend');
  expect(() => handleUnavailableBackend({ PROD: true })).toThrow('生产服务暂不可用');
  expect(handleUnavailableBackend({ MODE: 'development' })).toBeUndefined();
});

it('production 404 is surfaced instead of activating a local fallback', async () => {
  const { allowsLocalBackendFallback } = await import('@/api/backend');
  expect(allowsLocalBackendFallback(404, '订单不存在', { PROD: true })).toBe(false);
  expect(allowsLocalBackendFallback(404, '订单不存在', { MODE: 'development' })).toBe(true);
});

it('production runtime forbids local business mutations', () => {
  expect(allowsLocalBusinessMutation({ PROD: true })).toBe(false);
  expect(allowsLocalBusinessMutation({ MODE: 'production' })).toBe(false);
  expect(allowsLocalBusinessMutation({ VITE_APP_ENV: 'production' })).toBe(false);
  expect(allowsLocalBusinessMutation({ MODE: 'development' })).toBe(true);
});
