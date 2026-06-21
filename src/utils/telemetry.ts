import { lerp, bearing } from './geo';
import { nowISO } from './time';
import type { GeoPoint, Telemetry } from '@/models';

interface TelemetryOptions {
  initialBatteryPct?: number;
}

export function startTelemetry(route: GeoPoint[], onTick: (t: Telemetry) => void, durationSec = 60, options: TelemetryOptions = {}) {
  const seg = Math.max(1, route.length - 1); let i = 0;
  const startBattery = Math.min(100, Math.max(5, options.initialBatteryPct ?? 100));
  const batteryDrain = Math.max(0, startBattery - 35);
  const timer = setInterval(() => {
    // p 封顶为 1，最后一帧必须落在终点；电量线性降到约 35%，避免随机扰动在到达前耗尽断流
    const p = Math.min(1, i / durationSec), f = p * seg, k = Math.min(seg - 1, Math.floor(f)), lt = f - k, pos = lerp(route[k], route[k + 1], lt);
    const battery = Math.max(5, +(startBattery - p * batteryDrain - Math.random() * 1.2).toFixed(1));
    onTick({ ts: nowISO(), pos, altM: +(20 + 10 * Math.sin(p * Math.PI)).toFixed(1), speedMs: +(8 + Math.random() * 4).toFixed(1), batteryPct: battery, heading: +bearing(route[k], route[k + 1]).toFixed(0), swingDeg: +(5 + Math.random() * 8).toFixed(1) });
    if (++i > durationSec) clearInterval(timer);
  }, 1000);
  return () => clearInterval(timer);
}
