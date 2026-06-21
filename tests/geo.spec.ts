import { it, expect } from 'vitest';
import { bearing, deviationM, distanceKm, pointInPolygon, routeProgressRatio } from '@/utils/geo';
const sq = [{ lng: 0, lat: 0 }, { lng: 1, lat: 0 }, { lng: 1, lat: 1 }, { lng: 0, lat: 1 }];
it('距离对称且非负', () => { const a = { lng: 116.39, lat: 39.90 }, b = { lng: 116.45, lat: 39.95 }; expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 3); expect(distanceKm(a, b)).toBeGreaterThan(0); });
it('方位角在 [0,360)', () => { const v = bearing({ lng: 0, lat: 0 }, { lng: 1, lat: 1 }); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(360); });
it('偏航距离按真实航线线段计算', () => {
  const route = [{ lng: 116.397, lat: 39.908 }, { lng: 116.45, lat: 39.95 }];
  expect(deviationM({ lng: 116.4235, lat: 39.929 }, route)).toBeLessThan(20);
  expect(deviationM({ lng: 116.4235, lat: 39.98 }, route)).toBeGreaterThan(2000);
});
it('航线进度按当前位置投影到起终点直线', () => {
  const from = { lng: 116.397, lat: 39.908 };
  const to = { lng: 116.497, lat: 39.908 };
  expect(routeProgressRatio(from, from, to)).toBe(0);
  expect(routeProgressRatio({ lng: 116.447, lat: 39.928 }, from, to)).toBeCloseTo(0.5, 2);
  expect(routeProgressRatio({ lng: 116.6, lat: 39.908 }, from, to)).toBe(1);
});
it('点在多边形内外判定', () => { expect(pointInPolygon({ lng: 0.5, lat: 0.5 }, sq)).toBe(true); expect(pointInPolygon({ lng: 2, lat: 2 }, sq)).toBe(false); });
