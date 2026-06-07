import { it, expect } from 'vitest';
import { pilotCredit } from '@/utils/credit';
const base: any = { orders: 100, completed: 95, cancelled: 5, onTimeRate: 0.95, complaintRate: 0.02, accidentRate: 0, violationCount: 0, flightHours: 600, onlineHours: 300, avgRespSec: 20, avgStar: 4.8 };
it('维度上限 200/300/300/200 且总分=四维和', () => { const c = pilotCredit('p', base); expect(c.dimensions.map((d) => d.max)).toEqual([200, 300, 300, 200]); expect(c.total).toBe(c.dimensions.reduce((s, d) => s + d.score, 0)); expect(c.total).toBeLessThanOrEqual(1000); });
it('投诉率↑→总分↓', () => { expect(pilotCredit('p', { ...base, complaintRate: 0.5 }).total).toBeLessThan(pilotCredit('p', base).total); });
it('准时率↓→总分↓', () => { expect(pilotCredit('p', { ...base, onTimeRate: 0.5 }).total).toBeLessThan(pilotCredit('p', base).total); });
