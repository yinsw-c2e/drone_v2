import { afterEach, expect, it, vi } from 'vitest';
import {
  compactAmapAddress,
  compactAmapLocationResolve,
  compactBackendAddress,
  compactOsmAddress,
  coordinateAddress,
  isCoordinateAddress,
  isGenericMapAddress,
  locationSuggestionLabel,
  resolveMapPointByAmap,
} from '@/services/geocoding';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('formats coordinate fallback without generic map label', () => {
  expect(coordinateAddress({ lng: 117.16, lat: 39.845 }, 'zh')).toBe('经纬度点 117.16000, 39.84500');
  expect(isGenericMapAddress('地图选点')).toBe(true);
  expect(isCoordinateAddress('经纬度点 117.16000, 39.84500')).toBe(true);
  expect(isGenericMapAddress('经纬度点 117.16000, 39.84500')).toBe(false);
});

it('compacts reverse geocode payload into a readable address', () => {
  expect(compactOsmAddress({
    address: {
      road: '京平高速',
      suburb: '李桥镇',
      city: '北京市',
    },
  }, 'zh')).toBe('京平高速 · 李桥镇 · 北京市');
});

it('compacts amap reverse geocode payload into a readable address', () => {
  expect(compactAmapAddress({
    status: '1',
    regeocode: {
      formatted_address: '北京市朝阳区将台乡将台洼',
    },
  }, 'zh')).toBe('北京市朝阳区将台乡将台洼');
});

it('compacts v1 backend reverse geocode response', () => {
  expect(compactBackendAddress({
    code: 0,
    data: {
      province: '北京市',
      city: '北京市',
      district: '朝阳区',
      township: '将台乡',
      street: '将台路',
      number: '1号',
    },
  }, 'zh')).toBe('北京市朝阳区将台乡将台路 1号');
});

it('builds amap point recommendations with access risk hints', () => {
  const resolved = compactAmapLocationResolve({
    status: '1',
    regeocode: {
      formatted_address: '北京市朝阳区望京街道首开广场',
      pois: {
        poi: [{
          id: 'B001',
          name: '首开广场A座',
          address: '阜荣街10号',
          distance: '24',
          type: '商务住宅;楼宇;商务写字楼',
          location: '116.480100,39.989100',
        }],
      },
      aois: {
        aoi: [{
          name: '首开广场',
          type: '商务住宅',
          distance: '0',
          location: '116.480100,39.989100',
        }],
      },
    },
  }, {
    status: '1',
    pois: [{
      id: 'B002',
      name: '首开广场东门',
      address: '阜荣街入口',
      distance: '18',
      type: '商务住宅;楼宇;商务写字楼',
      location: '116.480200,39.989200',
      indoor: { indoor_map: '1', truefloor: 'F1' },
      navi: { entr_location: '116.480300,39.989300' },
    }],
  }, 'zh');

  expect(resolved?.address).toBe('北京市朝阳区望京街道首开广场');
  expect(resolved?.suggestions[0].name).toBe('首开广场东门');
  expect(resolved?.suggestions[0].entrance).toEqual({ lng: 116.4803, lat: 39.9893 });
  expect(locationSuggestionLabel(resolved?.suggestions[0], 'zh')).toBe('首开广场东门 · 阜荣街入口');
  expect(resolved?.warnings.some((item) => item.includes('门禁'))).toBe(true);
  expect(resolved?.warnings.some((item) => item.includes('室内'))).toBe(true);
});

it('queries amap with the selected map coordinate without extra datum offset', async () => {
  vi.stubEnv('VITE_AMAP_WEB_SERVICE_KEY', 'test-amap-key');
  const urls: string[] = [];
  vi.stubGlobal('uni', {
    request: ({ url, success }: { url: string; success: (result: { data: unknown }) => void }) => {
      urls.push(url);
      success({
        data: url.includes('/v3/geocode/regeo')
          ? { status: '1', regeocode: { formatted_address: '广东省佛山市禅城区祖庙街道' } }
          : { status: '1', pois: [] },
      });
      return {};
    },
  });

  await resolveMapPointByAmap({ lng: 113.12521, lat: 23.0205 }, 'zh');

  expect(urls[0]).toContain('location=113.125210%2C23.020500');
  expect(urls[1]).toContain('location=113.125210%2C23.020500');
});
