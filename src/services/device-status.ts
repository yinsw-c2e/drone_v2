import { mulberry32 } from '@/mock/rng';
import { repo } from '@/utils/repo';

const runtimeEnv = ((import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env ?? {});
const productionRuntime = runtimeEnv.PROD === true || runtimeEnv.MODE === 'production' || runtimeEnv.VITE_APP_ENV === 'production';

// 设备无真实电池/信号上报，演示环境用 id 派生确定性数值，保证各页面展示一致且可复现
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

export function demoBatteryPct(id: string): number | undefined {
  if (productionRuntime) {
    const frames = repo.orders
      .where((order) => order.droneId === id)
      .flatMap((order) => repo.telemetry.where((item) => item.orderId === order.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return frames[0]?.frame.batteryPct;
  }
  const rand = mulberry32(hashSeed(id))();
  return 35 + Math.round(rand * 64); // 35-99
}

export function demoSignalPct(id: string): number {
  const rand = mulberry32(hashSeed(`${id}:signal`))();
  return 72 + Math.round(rand * 27); // 72-99
}

export function batteryTone(pct: number): 'critical' | 'warning' | 'ok' {
  if (pct <= 20) return 'critical';
  if (pct <= 45) return 'warning';
  return 'ok';
}
