import { mulberry32 } from '@/mock/rng';

// 设备无真实电池/信号上报，演示环境用 id 派生确定性数值，保证各页面展示一致且可复现
function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

export function demoBatteryPct(id: string): number {
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
