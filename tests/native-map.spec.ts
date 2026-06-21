import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { configureH5MapProvider, h5MapProviderConfigured } from '@/utils/native-map';

beforeEach(() => {
  vi.stubEnv('VITE_AMAP_WEB_KEY', '');
  vi.stubEnv('VITE_AMAP_API_KEY', '');
  vi.stubEnv('VITE_AMAP_SECURITY_CODE', '');
  vi.stubEnv('VITE_AMAP_SECURITY_JS_CODE', '');
  vi.stubEnv('VITE_AMAP_SERVICE_HOST', '');
  vi.stubEnv('VITE_QQ_MAP_KEY', '');
  vi.stubEnv('VITE_BMAP_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('does not require a map provider outside H5 runtime', () => {
  expect(configureH5MapProvider()).toBe(true);
});

it('keeps an existing map provider config', () => {
  const config = installH5Config({ qqMapKey: 'qq-existing' });

  expect(configureH5MapProvider()).toBe(true);
  expect(config.qqMapKey).toBe('qq-existing');
});

it('reports missing provider when H5 has no key', () => {
  installH5Config({});

  expect(configureH5MapProvider()).toBe(false);
});

it('injects AMap provider config from Vite env', () => {
  vi.stubEnv('VITE_AMAP_WEB_KEY', 'amap-web-key');
  vi.stubEnv('VITE_AMAP_SECURITY_CODE', 'amap-security');
  vi.stubEnv('VITE_AMAP_SERVICE_HOST', 'https://example.com/_AMapService');
  const config = installH5Config({});

  expect(h5MapProviderConfigured()).toBe(true);
  expect(config).toMatchObject({
    aMapKey: 'amap-web-key',
    aMapSecurityJsCode: 'amap-security',
    aMapServiceHost: 'https://example.com/_AMapService',
  });
});

it('injects QQ map provider config when AMap key is absent', () => {
  vi.stubEnv('VITE_QQ_MAP_KEY', 'qq-map-key');
  const config = installH5Config({});

  expect(configureH5MapProvider()).toBe(true);
  expect(config.qqMapKey).toBe('qq-map-key');
});

function installH5Config(config: Record<string, string | undefined>) {
  vi.stubGlobal('document', {});
  vi.stubGlobal('window', { __uniConfig: config });
  return config;
}
