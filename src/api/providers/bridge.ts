import type { PaymentMode } from '@/models';
import type { Providers } from './index';

export interface BridgeProviderConfig {
  baseURL: string;
  token?: string;
}

interface BridgeEnvelope<T> {
  ok?: boolean;
  data?: T;
  error?: string;
}

const trimBaseURL = (value: string): string => value.replace(/\/+$/, '');

const bridgeEndpoint = (config: BridgeProviderConfig, path: string): string => `${trimBaseURL(config.baseURL)}${path}`;

const bridgeHeaders = (config: BridgeProviderConfig): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  return headers;
};

function hasEnvelopeData<T>(value: BridgeEnvelope<T> | T): value is BridgeEnvelope<T> {
  return typeof value === 'object' && value !== null && ('ok' in value || 'data' in value || 'error' in value);
}

function requestBridge<T>(config: BridgeProviderConfig, path: string, payload: Record<string, unknown>): Promise<T> {
  if (typeof uni === 'undefined' || typeof uni.request !== 'function') {
    return Promise.reject(new Error('外部服务配置缺失：当前运行环境不支持 uni.request，无法连接 provider bridge'));
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: bridgeEndpoint(config, path),
      method: 'POST',
      data: payload,
      header: bridgeHeaders(config),
      success(response) {
        const statusCode = response.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`外部服务调用失败：${path} HTTP ${statusCode}`));
          return;
        }

        const body = response.data as BridgeEnvelope<T> | T;
        if (hasEnvelopeData(body)) {
          if (body.ok === false) {
            reject(new Error(body.error || `外部服务调用失败：${path}`));
            return;
          }
          if (body.data !== undefined) {
            resolve(body.data);
            return;
          }
        }
        resolve(body as T);
      },
      fail(error) {
        reject(new Error(`外部服务调用失败：${path} ${error.errMsg || ''}`.trim()));
      },
    });
  });
}

export function createBridgeProviders(config: BridgeProviderConfig): Providers {
  return {
    payment: {
      prepay(orderId: string, amountCent: number, mode: PaymentMode) {
        return requestBridge(config, '/payment/prepay', { orderId, amountCent, mode });
      },
    },
    airspace: {
      apply(orderId: string) {
        return requestBridge(config, '/airspace/apply', { orderId });
      },
    },
    insurance: {
      quote(orderId: string, valueCent: number) {
        return requestBridge(config, '/insurance/quote', { orderId, valueCent });
      },
    },
    credit: {
      bureauScore(userId: string) {
        return requestBridge(config, '/credit/bureau-score', { userId });
      },
    },
    drone: {
      arm(droneId: string) {
        return requestBridge(config, '/drone/arm', { droneId });
      },
    },
  };
}
