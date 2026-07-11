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

function isHTTPSOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash;
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
  const releaseTarget = envValue(env, ['RELEASE_TARGET']) || 'mp-weixin';
  const backendURL = envValue(env, ['VITE_BACKEND_URL']);
  const backendDisabled = boolValue(envValue(env, ['VITE_DISABLE_BACKEND']));
  const localDBPersistDisabled = boolValue(envValue(env, ['VITE_DISABLE_LOCAL_DB_PERSIST']));
  const snapshotPushEnabled = boolValue(envValue(env, ['VITE_ENABLE_SNAPSHOT_PUSH']));
  const demoLoginEnabled = boolValue(envValue(env, ['VITE_DEMO_LOGIN']));
  const providerMode = envValue(env, ['VITE_PROVIDER_MODE']);
  const providerBridgeURL = envValue(env, ['VITE_PROVIDER_BRIDGE_URL']);
  const providerBridgeToken = envValue(env, ['VITE_PROVIDER_BRIDGE_TOKEN']);

  if (!['h5', 'mp-weixin'].includes(releaseTarget)) {
    errors.push('RELEASE_TARGET 只允许 h5 或 mp-weixin');
  }
  if (releaseTarget === 'mp-weixin') {
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
  }
  if (!backendURL) {
    errors.push('缺少 VITE_BACKEND_URL，发布包不能回退到 localhost 后端');
  } else if (!isHTTPSOrigin(backendURL)) {
    errors.push('发布模式 VITE_BACKEND_URL 必须是无路径、查询参数和内嵌凭证的 HTTPS origin');
  } else if (isLocalBackendURL(backendURL)) {
    errors.push('发布模式 VITE_BACKEND_URL 不能指向 localhost/127.0.0.1/0.0.0.0/::1');
  }
  if (backendDisabled === true) {
    errors.push('发布模式禁止设置 VITE_DISABLE_BACKEND=1/true');
  }
  if (localDBPersistDisabled !== true) {
    errors.push('发布模式必须设置 VITE_DISABLE_LOCAL_DB_PERSIST=1/true，禁止持久化演示数据库');
  }
  if (snapshotPushEnabled === true) {
    errors.push('发布模式禁止设置 VITE_ENABLE_SNAPSHOT_PUSH=1/true');
  }
  if (demoLoginEnabled === true) {
    errors.push('发布模式禁止设置 VITE_DEMO_LOGIN=1/true');
  }
  if (providerMode !== 'backend') {
    errors.push('发布模式 VITE_PROVIDER_MODE 只允许 backend，不能使用 mock/bridge provider');
  }
  if (providerBridgeURL) {
    errors.push('禁止设置 VITE_PROVIDER_BRIDGE_URL，生产前端必须通过 VITE_BACKEND_URL 调用鉴权业务 API');
  }
  if (providerBridgeToken) {
    errors.push('禁止设置 VITE_PROVIDER_BRIDGE_TOKEN，服务端密钥不得编译进客户端产物');
  }

  return {
    ok: errors.length === 0,
    errors,
    config: {
      releaseTarget,
      uniAppID,
      mpWeixinAppID,
      urlCheck,
      requestDomains,
      businessDomains,
      backendURL,
      backendDisabled: backendDisabled === true,
      localDBPersistDisabled: localDBPersistDisabled === true,
      snapshotPushEnabled: snapshotPushEnabled === true,
      demoLoginEnabled: demoLoginEnabled === true,
      providerMode,
      providerBridgeURL,
      providerBridgeToken,
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
