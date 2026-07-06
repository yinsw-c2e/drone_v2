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

it('blocks implicit mock provider selection in production', () => {
  expect(() => selectProviderMode(prodEnv())).toThrow('VITE_PROVIDER_MODE=bridge');
});

it('blocks explicit mock provider selection in production', () => {
  expect(() => selectProviderMode(prodEnv({ VITE_PROVIDER_MODE: 'mock' }))).toThrow('生产模式禁止使用 mock provider');
});

it('requires a provider bridge URL outside mock mode', () => {
  expect(() => selectProviders(prodEnv({ VITE_PROVIDER_MODE: 'bridge' }))).toThrow('VITE_PROVIDER_BRIDGE_URL');
});

it('requires a provider bridge token in production', () => {
  expect(() => selectProviders(prodEnv({
    VITE_PROVIDER_MODE: 'bridge',
    VITE_PROVIDER_BRIDGE_URL: 'https://api.example.test/api/v1/provider',
  }))).toThrow('VITE_PROVIDER_BRIDGE_TOKEN');
});

it('selects bridge providers for production when bridge configuration is present', () => {
  const selected = selectProviders(prodEnv({
    VITE_PROVIDER_MODE: 'bridge',
    VITE_PROVIDER_BRIDGE_URL: 'https://api.example.test/api/v1/provider',
    VITE_PROVIDER_BRIDGE_TOKEN: 'bridge-token',
  }));

  expect(selected).not.toBe(mockProviders);
  expect(typeof selected.payment.prepay).toBe('function');
  expect(typeof selected.airspace.apply).toBe('function');
  expect(typeof selected.insurance.quote).toBe('function');
  expect(typeof selected.credit.bureauScore).toBe('function');
  expect(typeof selected.drone.arm).toBe('function');
});
