import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routeHeroMetrics } from '@/services/route-hero';

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return vueFiles(path);
    return path.endsWith('.vue') ? [path] : [];
  });
}

describe('route hero metrics', () => {
  it('keeps default route metrics semantic for real route screens', () => {
    expect(routeHeroMetrics({ eta: '约12分', distance: '5.2km', battery: '91%' })).toEqual([
      { label: '预计到达', value: '约12分', tone: 'info' },
      { label: '航线距离', value: '5.2km', tone: 'neutral' },
      { label: '电量', value: '91%', tone: 'success' },
    ]);
  });

  it('uses explicit business labels for non-route dashboard metrics', () => {
    const metrics = routeHeroMetrics({
      eta: '错误兜底',
      distance: '错误兜底',
      battery: '错误兜底',
      metrics: [
        { label: '在线运力', value: 1, hint: '可匹配', tone: 'success' },
        { label: '设备资产', value: 4, hint: '已绑定', tone: 'neutral' },
        { label: '分账周期', value: 'T+7', hint: '机主入账', tone: 'info' },
      ],
    });
    expect(metrics.map((item) => `${item.value}/${item.label}`)).toEqual(['1/在线运力', '4/设备资产', 'T+7/分账周期']);
    expect(metrics.map((item) => item.label)).not.toContain('电量');
  });

  it('page RouteHero calls pass explicit metrics instead of overloading ETA and battery props', () => {
    const files = ['src/pages', 'src/pages-client', 'src/pages-pilot', 'src/pages-owner', 'src/pages-admin'].flatMap(vueFiles);
    const offenders = files.flatMap((file) => {
      const blocks = readFileSync(file, 'utf8').match(/<RouteHero[\s\S]*?\/>/g) ?? [];
      return blocks
        .filter((block) => /\s:?(eta|distance|battery)=/.test(block))
        .map(() => file);
    });
    expect(offenders).toEqual([]);
  });
});
