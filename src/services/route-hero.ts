import type { Telemetry } from '@/models';

export type RouteHeroMetricTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface RouteHeroMetric {
  label: string;
  value: string | number;
  hint?: string;
  tone?: RouteHeroMetricTone;
}

export function routeHeroMetrics(input: {
  metrics?: RouteHeroMetric[];
  eta?: string;
  distance?: string;
  battery?: string;
  frame?: Telemetry;
}): RouteHeroMetric[] {
  if (input.metrics?.length) return input.metrics;
  const battery = input.battery || (input.frame && input.frame.batteryPct > 0 ? `${input.frame.batteryPct}%` : '--');
  return [
    { label: '预计到达', value: input.eta ?? '--', tone: 'info' },
    { label: '航线距离', value: input.distance ?? '5km', tone: 'neutral' },
    { label: '电量', value: battery, tone: battery === '--' ? 'neutral' : 'success' },
  ];
}
