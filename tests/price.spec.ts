import { it, expect } from 'vitest';
import { priceOrder, etaMinutes } from '@/utils/price';
const drone: any = { maxPayloadKg: 10 };
const order: any = { cargo: { type: 'normal', weightKg: 8, valueCent: 1_000_000 }, from: { lng: 116.39, lat: 39.90 }, to: { lng: 116.45, lat: 39.95 }, needs: { insurance: true }, timeMode: 'instant' };
it('定价是纯函数(可复现)', () => { expect(priceOrder(order, drone, 20)).toEqual(priceOrder(order, drone, 20)); });
it('total = 运营小计*难度 + 保险 + 附加', () => { const p = priceOrder(order, drone, 20); const op = Math.round((p.baseCent + p.mileageCent + p.durationCent + p.weightCent) * p.difficultyFactor); expect(p.totalCent).toBe(op + p.insuranceCent + p.extraCent); });
it('难度系数∈[1,2]', () => { const p = priceOrder(order, drone, 20); expect(p.difficultyFactor).toBeGreaterThanOrEqual(1); expect(p.difficultyFactor).toBeLessThanOrEqual(2); });
it('未投保则保险费为0', () => { const p = priceOrder({ ...order, needs: {} }, drone, 20); expect(p.insuranceCent).toBe(0); });
it('ETA≥3 且含准备时长', () => { expect(etaMinutes(10)).toBeGreaterThanOrEqual(3); expect(etaMinutes(0)).toBeGreaterThanOrEqual(3); });
