import { it, expect } from 'vitest';
import { matchPure } from '@/utils/match';
const view = (id: string, loc: any, kg: number, extra: any = {}) => ({ unit: { id, location: loc }, drone: { id: id + 'd', maxPayloadKg: kg, airworthiness: 'approved', insured: { thirdPartyAmount: 5_000_000 } }, pilot: { userId: id + 'p' }, credit: extra.credit ?? 700, rating: extra.rating ?? 4.5 }) as any;
const order: any = { cargo: { type: 'normal', weightKg: 8, valueCent: 0 }, from: { lng: 116.397, lat: 39.908 }, budgetCent: 999_999, needs: {}, timeMode: 'instant' };
it('超载/超距的运力被过滤', () => { const r = matchPure(order, [view('a', { lng: 116.40, lat: 39.91 }, 10), view('b', { lng: 116.40, lat: 39.91 }, 5), view('c', { lng: 117.6, lat: 40.6 }, 10)], 'nearest' as any); expect(r.find((c) => c.capacityId === 'b')).toBeUndefined(); expect(r.find((c) => c.capacityId === 'c')).toBeUndefined(); expect(r.length).toBe(1); });
it('超预算被过滤', () => { const r = matchPure({ ...order, budgetCent: 1 }, [view('a', { lng: 116.40, lat: 39.91 }, 10)], 'nearest' as any); expect(r.length).toBe(0); });
it('展示报价 === 候选 priceBreakdown.totalCent', () => { const r = matchPure(order, [view('a', { lng: 116.40, lat: 39.91 }, 10)], 'nearest' as any); expect(r[0].quoteCent).toBe(r[0].priceBreakdown.totalCent); });
it('maxProfit 策略报价最高者排首', () => { const r = matchPure(order, [view('a', { lng: 116.40, lat: 39.91 }, 10), view('b', { lng: 116.41, lat: 39.92 }, 30)], 'maxProfit' as any); expect(r[0].quoteCent).toBe(Math.max(...r.map((c) => c.quoteCent))); });
