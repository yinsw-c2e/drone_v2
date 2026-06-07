import { lerp, bearing } from './geo';
import { nowISO } from './time';
import type { GeoPoint, Telemetry } from '@/models';
export function startTelemetry(route: GeoPoint[], onTick: (t: Telemetry) => void, durationSec = 60) {
  const seg = Math.max(1, route.length - 1); let i = 0; let battery = 100;
  const timer = setInterval(() => {
    const p = i / durationSec, f = p * seg, k = Math.min(seg - 1, Math.floor(f)), lt = f - k, pos = lerp(route[k], route[k + 1], lt);
    battery = Math.max(0, +(battery - 100 / durationSec - Math.random() * 0.3).toFixed(1));
    onTick({ ts: nowISO(), pos, altM: +(20 + 10 * Math.sin(p * Math.PI)).toFixed(1), speedMs: +(8 + Math.random() * 4).toFixed(1), batteryPct: battery, heading: +bearing(route[k], route[k + 1]).toFixed(0), swingDeg: +(5 + Math.random() * 8).toFixed(1) });
    if (++i > durationSec || battery <= 0) clearInterval(timer);
  }, 1000);
  return () => clearInterval(timer);
}
