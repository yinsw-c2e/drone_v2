import { defineStore } from 'pinia';
import type { Telemetry } from '@/models';
import { OrderStatus } from '@/models';
import { demoRoute } from '@/services/app-flow';
import { insideNoFlyZone, deviationM } from '@/utils/geo';
import { startTelemetry } from '@/utils/telemetry';
import { NO_FLY_ZONES } from '@/stores/config-data';
import { repo } from '@/utils/repo';

interface TelemetryState {
  orderId: string;
  frames: Telemetry[];
  alerts: string[];
  running: boolean;
}

let stopRunner: (() => void) | undefined;

export const useTelemetryStore = defineStore('telemetry', {
  state: (): TelemetryState => ({
    orderId: '',
    frames: [],
    alerts: [],
    running: false,
  }),
  getters: {
    latest(state): Telemetry | undefined {
      return state.frames[state.frames.length - 1];
    },
  },
  actions: {
    start(orderId: string) {
      if (stopRunner) stopRunner();
      this.orderId = orderId;
      this.frames = [];
      this.alerts = [];
      this.running = true;
      stopRunner = startTelemetry(demoRoute, (frame) => {
        this.frames.push(frame);
        this.alerts = telemetryAlerts(frame);
        const order = repo.orders.find(orderId);
        if (order?.status === OrderStatus.InFlight && frame.batteryPct <= 25 && !this.alerts.includes('低电量')) {
          this.alerts.push('低电量');
        }
      }, 24);
    },
    stop() {
      if (stopRunner) stopRunner();
      stopRunner = undefined;
      this.running = false;
    },
    injectLowBattery() {
      const latest = this.latest;
      if (!latest) return;
      const frame = { ...latest, batteryPct: 30 };
      this.frames.push(frame);
      this.alerts = telemetryAlerts(frame);
    },
  },
});

export function telemetryAlerts(frame: Telemetry): string[] {
  const alerts: string[] = [];
  if (frame.batteryPct <= 30) alerts.push('低电量');
  if (deviationM(frame.pos, demoRoute) > 200) alerts.push('偏航超过200米');
  if (frame.swingDeg > 30) alerts.push('吊框摆度过大');
  if (insideNoFlyZone(frame.pos, NO_FLY_ZONES)) alerts.push('进入禁飞区');
  return alerts;
}
