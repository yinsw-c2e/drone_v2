type UniMapConfig = {
  aMapKey?: string;
  aMapSecurityJsCode?: string;
  aMapServiceHost?: string;
  qqMapKey?: string;
  bMapKey?: string;
  googleMapKey?: string;
};

type UniWindow = Window & {
  __uniConfig?: UniMapConfig;
};

export function configureH5MapProvider() {
  const win = getBrowserWindow();
  if (!win) return true;
  const config = win.__uniConfig ?? (win.__uniConfig = {});
  if (hasMapProvider(config)) return true;

  const amapKey = envValue('VITE_AMAP_WEB_KEY') || envValue('VITE_AMAP_API_KEY');
  if (amapKey) {
    config.aMapKey = amapKey;
    const securityCode = envValue('VITE_AMAP_SECURITY_CODE') || envValue('VITE_AMAP_SECURITY_JS_CODE');
    const serviceHost = envValue('VITE_AMAP_SERVICE_HOST');
    if (securityCode) config.aMapSecurityJsCode = securityCode;
    if (serviceHost) config.aMapServiceHost = serviceHost;
    return true;
  }

  const qqMapKey = envValue('VITE_QQ_MAP_KEY');
  if (qqMapKey) {
    config.qqMapKey = qqMapKey;
    return true;
  }

  const bMapKey = envValue('VITE_BMAP_KEY');
  if (bMapKey) {
    config.bMapKey = bMapKey;
    return true;
  }

  return false;
}

export function h5MapProviderConfigured() {
  return configureH5MapProvider();
}

function hasMapProvider(config: UniMapConfig) {
  return Boolean(config.aMapKey || config.qqMapKey || config.bMapKey || config.googleMapKey);
}

function getBrowserWindow(): UniWindow | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
  return window as UniWindow;
}

function envValue(key: string) {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  if (Object.prototype.hasOwnProperty.call(processEnv ?? {}, key)) {
    return String(processEnv?.[key] ?? '').trim();
  }
  return String(env?.[key] ?? '').trim();
}
