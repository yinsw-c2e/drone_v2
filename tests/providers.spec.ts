import { expect, it } from 'vitest';
import { mockProviders } from '@/api/providers/mock';
import { selectProviderMode, selectProviders, type ProviderRuntimeEnv } from '@/api/providers';

const prodEnv = (extra: Partial<ProviderRuntimeEnv> = {}): ProviderRuntimeEnv => ({
  PROD: true,
  MODE: 'production',
  ...extra,
});

it('uses mock providers only by explicit local default', () => {
  expect(selectProviderMode({ MODE: 'development' })).toBe('mock');
  expect(selectProviders({ MODE: 'development' })).toBe(mockProviders);
});

it('uses authenticated backend providers by default in production', () => {
  expect(selectProviderMode(prodEnv())).toBe('backend');
});

it('blocks explicit mock provider selection in production', () => {
  expect(() => selectProviderMode(prodEnv({ VITE_PROVIDER_MODE: 'mock' }))).toThrow('生产模式禁止使用 mock provider');
});

it('selects authenticated backend providers in production without a client secret', () => {
  const selected = selectProviders(prodEnv());

  expect(selected).not.toBe(mockProviders);
  expect(typeof selected.payment.prepay).toBe('function');
  expect(typeof selected.airspace.apply).toBe('function');
  expect(typeof selected.insurance.quote).toBe('function');
  expect(typeof selected.credit.bureauScore).toBe('function');
  expect(typeof selected.drone.arm).toBe('function');
});
