import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { CargoType, OrderStatus } from '@/models';
import { createOrder } from '@/models/factory';
import { demoBatteryPct } from '@/services/device-status';
import { useTelemetryStore } from '@/stores/telemetry';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';
import { startTelemetry } from '@/utils/telemetry';

beforeEach(() => {
  resetDB();
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('飞行遥测从起飞前电量开始递减，不会第一帧回升', () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const frames: Array<{ batteryPct: number }> = [];
  const stop = startTelemetry(
    [{ lng: 113.1, lat: 23.1 }, { lng: 113.2, lat: 23.2 }],
    (frame) => frames.push(frame),
    10,
    { initialBatteryPct: 83 },
  );

  vi.advanceTimersByTime(1000);
  expect(frames[0]?.batteryPct).toBe(83);

  vi.advanceTimersByTime(10_000);
  const latest = frames[frames.length - 1];
  expect(latest?.batteryPct).toBeLessThanOrEqual(83);
  expect(latest?.batteryPct).toBeGreaterThanOrEqual(35);
  stop();
});

it('飞行启动沿用设备地面电量，旧的更高快照不会把电量抬高', () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const order = {
    ...createOrder({
      clientId: 'u_c1',
      from: { lng: 113.1, lat: 23.1, address: '装货点' },
      to: { lng: 113.2, lat: 23.2, address: '卸货点' },
      budgetCent: 200000,
      cargo: { type: CargoType.Normal, weightKg: 5, valueCent: 10000, photos: [] },
    }),
    status: OrderStatus.InFlight,
    droneId: 'd_battery_regression',
  };
  repo.orders.insert(order);
  const groundBattery = demoBatteryPct(order.droneId);
  repo.telemetry.insert({
    id: `tel_${order.id}`,
    orderId: order.id,
    source: 'simulator',
    updatedAt: new Date().toISOString(),
    frame: {
      ts: new Date().toISOString(),
      pos: order.from,
      altM: 0,
      speedMs: 0,
      batteryPct: 100,
      heading: 0,
      swingDeg: 0,
    },
  });

  const telemetry = useTelemetryStore();
  telemetry.start(order.id, 'pilot');
  vi.advanceTimersByTime(1000);

  expect(telemetry.latest?.batteryPct).toBeLessThanOrEqual(groundBattery);
  telemetry.stop();
});

it('确认到达后写入终点地面帧并停止飞行遥测', () => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const order = {
    ...createOrder({
      clientId: 'u_c1',
      from: { lng: 113.1, lat: 23.1, address: '装货点' },
      to: { lng: 113.2, lat: 23.2, address: '卸货点' },
      budgetCent: 200000,
      cargo: { type: CargoType.Normal, weightKg: 5, valueCent: 10000, photos: [] },
    }),
    status: OrderStatus.InFlight,
    droneId: 'd_arrival_regression',
  };
  repo.orders.insert(order);
  const telemetry = useTelemetryStore();
  telemetry.start(order.id, 'pilot');
  vi.advanceTimersByTime(1000);

  telemetry.arrive(order.id, 'pilot');

  expect(telemetry.running).toBe(false);
  expect(telemetry.latest?.pos).toEqual(order.to);
  expect(telemetry.latest?.altM).toBe(0);
  expect(telemetry.latest?.speedMs).toBe(0);
  vi.advanceTimersByTime(3000);
  expect(telemetry.latest?.pos).toEqual(order.to);
  expect(telemetry.latest?.altM).toBe(0);
  expect(telemetry.latest?.speedMs).toBe(0);
});
