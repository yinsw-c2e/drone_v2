import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repoRoot, 'src', 'manifest.json');

function stripJsonComments(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

export function parseManifest(text) {
  return JSON.parse(stripJsonComments(text));
}

function envValue(env, keys) {
  for (const key of keys) {
    const value = String(env[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function boolValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function isLocalBackendURL(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]' || hostname === '::1';
  } catch {
    return false;
  }
}

function isHTTPSURL(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function checkReleaseConfig({ manifestText, env = process.env } = {}) {
  const manifest = parseManifest(manifestText ?? fs.readFileSync(manifestPath, 'utf8'));
  const mpWeixin = manifest['mp-weixin'] ?? {};
  const setting = mpWeixin.setting ?? {};
  const errors = [];

  const uniAppID = envValue(env, ['UNI_APP_ID', 'VITE_UNI_APPID']) || String(manifest.appid ?? '').trim();
  const mpWeixinAppID = envValue(env, ['MP_WEIXIN_APPID', 'VITE_MP_WEIXIN_APPID']) || String(mpWeixin.appid ?? '').trim();
  const urlCheckEnv = envValue(env, ['MP_WEIXIN_URL_CHECK', 'VITE_MP_WEIXIN_URL_CHECK']);
  const urlCheck = urlCheckEnv ? boolValue(urlCheckEnv) : setting.urlCheck === true;
  const requestDomains = envValue(env, ['MP_WEIXIN_REQUEST_DOMAINS', 'VITE_MP_WEIXIN_REQUEST_DOMAINS']);
  const businessDomains = envValue(env, ['MP_WEIXIN_BUSINESS_DOMAINS', 'VITE_MP_WEIXIN_BUSINESS_DOMAINS']);
  const backendURL = envValue(env, ['VITE_BACKEND_URL']);
  const backendDisabled = boolValue(envValue(env, ['VITE_DISABLE_BACKEND']));
  const providerMode = envValue(env, ['VITE_PROVIDER_MODE']);
  const providerBridgeURL = envValue(env, ['VITE_PROVIDER_BRIDGE_URL']);
  const providerBridgeToken = envValue(env, ['VITE_PROVIDER_BRIDGE_TOKEN']);
  const providerBridgeAuthToken = envValue(env, ['PROVIDER_BRIDGE_AUTH_TOKEN']);
  const corsAllowOrigin = envValue(env, ['CORS_ALLOW_ORIGIN']);
  const smsProvider = envValue(env, ['SMS_PROVIDER']);
  const smsEndpoint = envValue(env, ['SMS_HTTP_ENDPOINT', 'ALIYUN_SMS_HTTP_ENDPOINT', 'TENCENT_SMS_HTTP_ENDPOINT']);
  const backendProviderVars = [
    'PROVIDER_PAYMENT_PREPAY_URL',
    'PROVIDER_PAYMENT_NOTIFY_SECRET',
    'PROVIDER_AIRSPACE_APPLY_URL',
    'PROVIDER_INSURANCE_QUOTE_URL',
    'PROVIDER_CREDIT_SCORE_URL',
    'PROVIDER_DRONE_ARM_URL',
  ];

  if (!uniAppID) {
    errors.push('缺少 UNI_APP_ID/VITE_UNI_APPID 或 manifest 顶层 appid');
  }
  if (!mpWeixinAppID) {
    errors.push('缺少 MP_WEIXIN_APPID/VITE_MP_WEIXIN_APPID 或 manifest mp-weixin.appid');
  }
  if (urlCheck !== true) {
    errors.push('发布模式必须启用 mp-weixin.setting.urlCheck，不允许 urlCheck=false');
  }
  if (!requestDomains) {
    errors.push('缺少 MP_WEIXIN_REQUEST_DOMAINS，请列出已在微信公众平台配置的 request 合法域名');
  }
  if (!businessDomains) {
    errors.push('缺少 MP_WEIXIN_BUSINESS_DOMAINS，请列出已在微信公众平台配置的业务域名');
  }
  if (!backendURL) {
    errors.push('缺少 VITE_BACKEND_URL，发布包不能回退到 localhost 后端');
  } else if (!isHTTPSURL(backendURL)) {
    errors.push('发布模式 VITE_BACKEND_URL 必须是 https:// 开头的真实后端域名');
  } else if (isLocalBackendURL(backendURL)) {
    errors.push('发布模式 VITE_BACKEND_URL 不能指向 localhost/127.0.0.1/0.0.0.0/::1');
  }
  if (backendDisabled === true) {
    errors.push('发布模式禁止设置 VITE_DISABLE_BACKEND=1/true');
  }
  if (providerMode !== 'bridge') {
    errors.push('发布模式必须设置 VITE_PROVIDER_MODE=bridge，不能使用 mock provider');
  }
  if (!providerBridgeURL) {
    errors.push('缺少 VITE_PROVIDER_BRIDGE_URL，无法连接支付、空域、保险、征信、无人机外部服务桥接层');
  }
  if (!providerBridgeToken) {
    errors.push('缺少 VITE_PROVIDER_BRIDGE_TOKEN，前端无法鉴权调用 backend provider bridge');
  }
  if (!providerBridgeAuthToken) {
    errors.push('缺少 PROVIDER_BRIDGE_AUTH_TOKEN，backend provider bridge 入站接口将无法鉴权');
  }
  if (providerBridgeToken && providerBridgeAuthToken && providerBridgeToken !== providerBridgeAuthToken) {
    errors.push('VITE_PROVIDER_BRIDGE_TOKEN 必须与 PROVIDER_BRIDGE_AUTH_TOKEN 保持一致');
  }
  if (!corsAllowOrigin || corsAllowOrigin === '*') {
    errors.push('发布模式必须设置 CORS_ALLOW_ORIGIN 为可信域名白名单，不能为 *');
  }
  if (!smsProvider || smsProvider === 'mock') {
    errors.push('发布模式必须设置 SMS_PROVIDER=http/aliyun/tencent，不能使用 mock 短信');
  }
  if (!smsEndpoint) {
    errors.push('缺少 SMS_HTTP_ENDPOINT 或 provider 专属短信 HTTP endpoint');
  }
  for (const key of backendProviderVars) {
    if (!envValue(env, [key])) {
      errors.push(`缺少 ${key}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    config: {
      uniAppID,
      mpWeixinAppID,
      urlCheck,
      requestDomains,
      businessDomains,
      backendURL,
      backendDisabled: backendDisabled === true,
      providerMode,
      providerBridgeURL,
      providerBridgeToken,
      providerBridgeAuthToken,
      corsAllowOrigin,
      smsProvider,
      smsEndpoint,
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = checkReleaseConfig();
  if (!result.ok) {
    console.error('❌ 发布前检查失败:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
  console.log('✅ 发布前检查通过');
}
