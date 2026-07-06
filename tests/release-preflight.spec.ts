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
  VITE_PROVIDER_MODE: 'bridge',
  VITE_PROVIDER_BRIDGE_URL: 'https://api.example.test/api/v1/provider',
  VITE_PROVIDER_BRIDGE_TOKEN: 'bridge-token',
  PROVIDER_BRIDGE_AUTH_TOKEN: 'bridge-token',
  CORS_ALLOW_ORIGIN: 'https://h5.example.test,https://admin.example.test',
  SMS_PROVIDER: 'http',
  SMS_HTTP_ENDPOINT: 'https://sms.example.test/send',
  PROVIDER_PAYMENT_PREPAY_URL: 'https://provider.example.test/payment',
  PROVIDER_PAYMENT_NOTIFY_SECRET: 'notify-secret',
  PROVIDER_AIRSPACE_APPLY_URL: 'https://provider.example.test/airspace',
  PROVIDER_INSURANCE_QUOTE_URL: 'https://provider.example.test/insurance',
  PROVIDER_CREDIT_SCORE_URL: 'https://provider.example.test/credit',
  PROVIDER_DRONE_ARM_URL: 'https://provider.example.test/drone',
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
  expect(result.errors.join('\n')).toContain('VITE_PROVIDER_MODE=bridge');
  expect(result.errors.join('\n')).toContain('VITE_PROVIDER_BRIDGE_URL');
  expect(result.errors.join('\n')).toContain('VITE_PROVIDER_BRIDGE_TOKEN');
  expect(result.errors.join('\n')).toContain('PROVIDER_BRIDGE_AUTH_TOKEN');
  expect(result.errors.join('\n')).toContain('CORS_ALLOW_ORIGIN');
  expect(result.errors.join('\n')).toContain('SMS_PROVIDER');
  expect(result.errors.join('\n')).toContain('PROVIDER_PAYMENT_PREPAY_URL');
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
