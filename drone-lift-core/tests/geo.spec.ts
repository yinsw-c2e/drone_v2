import { it, expect } from 'vitest';
import { distanceKm, bearing, pointInPolygon } from '@/utils/geo';
const sq = [{ lng: 0, lat: 0 }, { lng: 1, lat: 0 }, { lng: 1, lat: 1 }, { lng: 0, lat: 1 }];
it('距离对称且非负', () => { const a = { lng: 116.39, lat: 39.90 }, b = { lng: 116.45, lat: 39.95 }; expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 3); expect(distanceKm(a, b)).toBeGreaterThan(0); });
it('方位角在 [0,360)', () => { const v = bearing({ lng: 0, lat: 0 }, { lng: 1, lat: 1 }); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(360); });
it('点在多边形内外判定', () => { expect(pointInPolygon({ lng: 0.5, lat: 0.5 }, sq)).toBe(true); expect(pointInPolygon({ lng: 2, lat: 2 }, sq)).toBe(false); });
