import { defineStore } from 'pinia';
import type { GeoPoint, Telemetry } from '@/models';
import { OrderStatus } from '@/models';
import { fetchTelemetryRemote, isProductionBackendRequired, saveTelemetryRemote } from '@/api/backend';
import { demoBatteryPct } from '@/services/device-status';
import { insideNoFlyZone, deviationM } from '@/utils/geo';
import { startTelemetry } from '@/utils/telemetry';
import { NO_FLY_ZONES } from '@/stores/config-data';
import { repo } from '@/utils/repo';

interface TelemetryState {
  orderId: string;
  frames: Telemetry[];
  alerts: string[];
  running: boolean;
  syncError: string;
}

let stopRunner: (() => void) | undefined;

export const useTelemetryStore = defineStore('telemetry', {
  state: (): TelemetryState => ({
    orderId: '',
    frames: [],
    alerts: [],
    running: false,
    syncError: '',
  }),
  getters: {
    latest(state): Telemetry | undefined {
      return state.frames[state.frames.length - 1];
    },
  },
  actions: {
    start(orderId: string, source: 'simulator' | 'pilot' | 'client' = 'simulator') {
      if (stopRunner) stopRunner();
      if (isProductionBackendRequired()) {
        stopRunner = undefined;
        this.orderId = orderId;
        this.running = false;
        this.syncError = '';
        void this.refreshShared(orderId).catch((error) => this.recordSyncError(error));
        return;
      }
      const order = repo.orders.find(orderId);
      if (order && order.status !== OrderStatus.InFlight) {
        this.standby(orderId);
        return;
      }
      const route = routeForOrder(orderId);
      if (!route) {
        this.orderId = '';
        this.frames = [];
        this.alerts = ['订单航线不存在'];
        this.running = false;
        return;
      }
      this.orderId = orderId;
      this.frames = [];
      this.alerts = [];
      this.running = true;
      const initialBatteryPct = startingBatteryPct(orderId, order?.droneId, this.orderId === orderId ? this.latest?.batteryPct : undefined);
      void this.refreshShared(orderId);
      stopRunner = startTelemetry(route, (frame) => {
        this.applyFrame(orderId, frame);
        void saveTelemetryRemote(orderId, frame, source);
        const order = repo.orders.find(orderId);
        if (order?.status === OrderStatus.InFlight && frame.batteryPct <= 25 && !this.alerts.includes('低电量')) {
          this.alerts.push('低电量');
        }
      }, 24, { initialBatteryPct });
    },
    async refreshShared(orderId: string) {
      const remote = await fetchTelemetryRemote(orderId);
      const snapshot = remote ?? repo.telemetry.where((item) => item.orderId === orderId)[0];
      if (!snapshot) return undefined;
      this.applyFrame(orderId, snapshot.frame);
      this.syncError = '';
      return snapshot.frame;
    },
    applyFrame(orderId: string, frame: Telemetry) {
      const route = routeForOrder(orderId);
      this.orderId = orderId;
      this.frames = [frame];
      this.alerts = telemetryAlerts(frame, route);
      if (isProductionBackendRequired()) return;
      const existing = repo.telemetry.where((item) => item.orderId === orderId)[0];
      const snapshot = {
        id: `tel_${orderId}`,
        orderId,
        frame,
        source: 'simulator' as const,
        updatedAt: frame.ts,
      };
      if (existing) repo.telemetry.update(existing.id, snapshot);
      else repo.telemetry.insert(snapshot);
    },
    standby(orderId: string) {
      if (stopRunner) stopRunner();
      stopRunner = undefined;
      if (isProductionBackendRequired()) {
        this.orderId = orderId;
        this.running = false;
        void this.refreshShared(orderId).catch((error) => this.recordSyncError(error));
        return;
      }
      const route = routeForOrder(orderId);
      if (!route) {
        this.orderId = '';
        this.frames = [];
        this.alerts = ['订单航线不存在'];
        this.running = false;
        return;
      }
      const order = repo.orders.find(orderId);
      const frame = groundTelemetry(route[0], startingBatteryPct(orderId, order?.droneId, this.orderId === orderId ? this.latest?.batteryPct : undefined));
      this.applyFrame(orderId, frame);
      void saveTelemetryRemote(orderId, frame, 'backend');
      this.running = false;
    },
    arrive(orderId: string, source: 'simulator' | 'pilot' | 'client' | 'backend' = 'pilot') {
      if (stopRunner) stopRunner();
      stopRunner = undefined;
      if (isProductionBackendRequired()) {
        this.orderId = orderId;
        this.running = false;
        void this.refreshShared(orderId).catch((error) => this.recordSyncError(error));
        return;
      }
      const route = routeForOrder(orderId);
      if (!route) {
        this.orderId = '';
        this.frames = [];
        this.alerts = ['订单航线不存在'];
        this.running = false;
        return;
      }
      const destination = route[route.length - 1];
      const order = repo.orders.find(orderId);
      const frame = groundTelemetry(destination, startingBatteryPct(orderId, order?.droneId, this.orderId === orderId ? this.latest?.batteryPct : undefined));
      this.applyFrame(orderId, frame);
      void saveTelemetryRemote(orderId, frame, source);
      this.running = false;
    },
    stop() {
      if (stopRunner) stopRunner();
      stopRunner = undefined;
      this.running = false;
    },
    injectLowBattery() {
      if (stopRunner) stopRunner();
      stopRunner = undefined;
      this.running = false;
      if (isProductionBackendRequired()) {
        if (this.orderId) void this.refreshShared(this.orderId).catch((error) => this.recordSyncError(error));
        return;
      }
      const latest = this.latest;
      const route = routeForOrder(this.orderId);
      const frame = latest ? { ...latest, batteryPct: 30 } : {
        ts: new Date().toISOString(),
        pos: route?.[0] ?? { lng: 0, lat: 0, address: '未知位置' },
        altM: 20,
        speedMs: 0,
        batteryPct: 30,
        heading: 0,
        swingDeg: 5,
      };
      this.applyFrame(this.orderId, frame);
      if (this.orderId) void saveTelemetryRemote(this.orderId, frame, 'pilot');
    },
    recordSyncError(error: unknown) {
      this.syncError = error instanceof Error ? error.message : '遥测服务暂不可用';
      if (!this.alerts.includes(this.syncError)) this.alerts.push(this.syncError);
    },
  },
});

function routeForOrder(orderId: string): GeoPoint[] | undefined {
  const order = repo.orders.find(orderId);
  if (!order) return undefined;
  return [order.from, order.to];
}

function groundTelemetry(pos: GeoPoint, batteryPct = 80): Telemetry {
  return {
    ts: new Date().toISOString(),
    pos,
    altM: 0,
    speedMs: 0,
    batteryPct,
    heading: 0,
    swingDeg: 0,
  };
}

function startingBatteryPct(orderId: string, droneId?: string, liveBattery?: number): number {
  const snapshotBattery = repo.telemetry.where((item) => item.orderId === orderId)[0]?.frame.batteryPct;
  const fallbackBattery = droneId ? demoBatteryPct(droneId) : undefined;
  const observedBattery = liveBattery ?? snapshotBattery;
  if (observedBattery !== undefined && fallbackBattery !== undefined) return Math.min(observedBattery, fallbackBattery);
  return observedBattery ?? fallbackBattery ?? 80;
}

export function telemetryAlerts(frame: Telemetry, route?: GeoPoint[]): string[] {
  const alerts: string[] = [];
  if (frame.batteryPct <= 30) alerts.push('低电量');
  if (route?.length && deviationM(frame.pos, route) > 200) alerts.push('偏航超过200米');
  if (frame.swingDeg > 30) alerts.push('吊框摆度过大');
  if (insideNoFlyZone(frame.pos, NO_FLY_ZONES)) alerts.push('进入禁飞区');
  return alerts;
}
