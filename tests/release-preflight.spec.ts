import { expect, it } from 'vitest';
import { checkReleaseConfig } from '../scripts/preflight-release.mjs';

const emptyManifest = `{
  "appid": "",
  "mp-weixin": {
    "appid": "",
    "setting": {
      "urlCheck": false
    }
  }
}`;

const validReleaseEnv = {
  UNI_APP_ID: 'uni-app-id',
  MP_WEIXIN_APPID: 'wx-app-id',
  MP_WEIXIN_URL_CHECK: 'true',
  MP_WEIXIN_REQUEST_DOMAINS: 'https://api.example.test',
  MP_WEIXIN_BUSINESS_DOMAINS: 'https://h5.example.test',
  VITE_BACKEND_URL: 'https://api.example.test',
  VITE_PROVIDER_MODE: 'backend',
  VITE_DISABLE_LOCAL_DB_PERSIST: '1',
};

it('blocks release packaging when app ids and domains are missing', () => {
  const result = checkReleaseConfig({ manifestText: emptyManifest, env: {} });

  expect(result.ok).toBe(false);
  expect(result.errors.join('\n')).toContain('UNI_APP_ID');
  expect(result.errors.join('\n')).toContain('MP_WEIXIN_APPID');
  expect(result.errors.join('\n')).toContain('urlCheck=false');
  expect(result.errors.join('\n')).toContain('MP_WEIXIN_REQUEST_DOMAINS');
  expect(result.errors.join('\n')).toContain('MP_WEIXIN_BUSINESS_DOMAINS');
  expect(result.errors.join('\n')).toContain('VITE_BACKEND_URL');
});

it('blocks release packaging when backend url points to localhost', () => {
  for (const backendURL of ['https://localhost:8088', 'https://127.0.0.1:8088']) {
    const result = checkReleaseConfig({
      manifestText: emptyManifest,
      env: { ...validReleaseEnv, VITE_BACKEND_URL: backendURL },
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('VITE_BACKEND_URL 不能指向 localhost');
  }
});

it('blocks backend URLs containing paths, query strings, or embedded credentials', () => {
  for (const backendURL of ['https://api.example.test/api', 'https://api.example.test?token=x', 'https://user:pass@api.example.test']) {
    const result = checkReleaseConfig({ manifestText: emptyManifest, env: { ...validReleaseEnv, VITE_BACKEND_URL: backendURL } });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('HTTPS origin');
  }
});

it('blocks release packaging when backend is disabled', () => {
  const result = checkReleaseConfig({
    manifestText: emptyManifest,
    env: { ...validReleaseEnv, VITE_DISABLE_BACKEND: 'true' },
  });

  expect(result.ok).toBe(false);
  expect(result.errors.join('\n')).toContain('VITE_DISABLE_BACKEND');
});

it('accepts release packaging only with app ids, url check, and WeChat domains', () => {
  const result = checkReleaseConfig({
    manifestText: emptyManifest,
    env: validReleaseEnv,
  });

  expect(result.ok).toBe(true);
  expect(result.errors).toHaveLength(0);
});

it('accepts an H5 release without mini-program-only configuration', () => {
  const result = checkReleaseConfig({
    manifestText: emptyManifest,
    env: {
      RELEASE_TARGET: 'h5',
      VITE_BACKEND_URL: 'https://api.example.test',
      VITE_PROVIDER_MODE: 'backend',
      VITE_DISABLE_LOCAL_DB_PERSIST: '1',
    },
  });

  expect(result.ok).toBe(true);
});

it('rejects demo persistence, snapshot push, and demo login in release artifacts', () => {
  for (const unsafe of [
    { VITE_DISABLE_LOCAL_DB_PERSIST: 'false' },
    { VITE_ENABLE_SNAPSHOT_PUSH: 'true' },
    { VITE_DEMO_LOGIN: 'true' },
    { VITE_PROVIDER_MODE: '' },
  ]) {
    const result = checkReleaseConfig({ manifestText: emptyManifest, env: { ...validReleaseEnv, ...unsafe } });
    expect(result.ok).toBe(false);
  }
});

it('rejects client-side provider bridge secrets', () => {
  const result = checkReleaseConfig({
    manifestText: emptyManifest,
    env: { ...validReleaseEnv, VITE_PROVIDER_BRIDGE_TOKEN: 'must-not-ship' },
  });

  expect(result.ok).toBe(false);
  expect(result.errors.join('\n')).toContain('服务端密钥不得编译进客户端产物');
});
