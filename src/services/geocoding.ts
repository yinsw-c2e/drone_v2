import type { GeoPoint } from '@/models';

type Locale = 'zh' | 'en';
type PointLike = Pick<GeoPoint, 'lat' | 'lng'>;

const REQUEST_TIMEOUT_MS = 4800;
const AMAP_REGEOCODE_URL = 'https://restapi.amap.com/v3/geocode/regeo';
const AMAP_PLACE_AROUND_URL = 'https://restapi.amap.com/v5/place/around';
const OSM_REGEOCODE_URL = 'https://nominatim.openstreetmap.org/reverse';

interface OsmAddress {
  amenity?: string;
  building?: string;
  city?: string;
  city_district?: string;
  county?: string;
  district?: string;
  hamlet?: string;
  house_number?: string;
  leisure?: string;
  neighbourhood?: string;
  office?: string;
  pedestrian?: string;
  residential?: string;
  road?: string;
  shop?: string;
  state?: string;
  suburb?: string;
  tourism?: string;
  town?: string;
  village?: string;
}

interface OsmReversePayload {
  address?: OsmAddress;
  display_name?: string;
  name?: string;
}

interface AmapStreetNumber {
  street?: string | unknown[];
  number?: string | unknown[];
}

interface AmapAddressComponent {
  province?: string | unknown[];
  city?: string | unknown[];
  district?: string | unknown[];
  township?: string | unknown[];
  streetNumber?: AmapStreetNumber;
}

interface AmapPoi {
  id?: string;
  name?: string;
  type?: string;
  typecode?: string;
  address?: string | unknown[];
  location?: string;
  distance?: string;
  direction?: string;
  businessarea?: string;
  indoor?: {
    indoor_map?: string;
    floor?: string;
    truefloor?: string;
  };
  navi?: {
    navi_poiid?: string;
    entr_location?: string;
    exit_location?: string;
  };
}

interface AmapAoi {
  name?: string;
  type?: string;
  distance?: string;
  location?: string;
  area?: string;
}

interface AmapRoad {
  name?: string;
  distance?: string;
  direction?: string;
  location?: string;
}

interface AmapReversePayload {
  status?: string;
  info?: string;
  regeocode?: {
    formatted_address?: string;
    addressComponent?: AmapAddressComponent;
    pois?: { poi?: AmapPoi | AmapPoi[] } | AmapPoi | AmapPoi[];
    aois?: { aoi?: AmapAoi | AmapAoi[] } | AmapAoi | AmapAoi[];
    roads?: { road?: AmapRoad | AmapRoad[] } | AmapRoad | AmapRoad[];
  };
}

interface AmapPlaceAroundPayload {
  status?: string;
  info?: string;
  pois?: AmapPoi | AmapPoi[];
}

type AmapRegeocode = NonNullable<AmapReversePayload['regeocode']>;
type AmapPoisField = NonNullable<AmapRegeocode['pois']> | NonNullable<AmapPlaceAroundPayload['pois']>;
type AmapAoisField = NonNullable<AmapRegeocode['aois']>;
type AmapRoadsField = NonNullable<AmapRegeocode['roads']>;

interface BackendReversePayload {
  code?: number;
  data?: AmapReversePayload['regeocode'] | {
    formatted_address?: string;
    province?: string;
    city?: string;
    district?: string;
    township?: string;
    street?: string;
    number?: string;
  };
  formatted_address?: string;
  province?: string;
  city?: string;
  district?: string;
  township?: string;
  street?: string;
  number?: string;
}

export interface LocationSuggestion {
  id?: string;
  name: string;
  address?: string;
  distanceM?: number;
  type?: string;
  typecode?: string;
  location?: GeoPoint;
  entrance?: GeoPoint;
  indoor?: {
    indoorMap?: boolean;
    floor?: string;
    truefloor?: string;
  };
}

export interface LocationResolveResult {
  address?: string;
  suggestions: LocationSuggestion[];
  warnings: string[];
}

export function coordinateAddress(point: PointLike, locale: Locale) {
  const coord = `${point.lng.toFixed(5)}, ${point.lat.toFixed(5)}`;
  return locale === 'en' ? `Coordinate ${coord}` : `经纬度点 ${coord}`;
}

export function isGenericMapAddress(address: string | undefined) {
  const value = address?.trim();
  return value === '地图选点'
    || value === 'Map selected point'
    || value === '当前位置'
    || value === 'Current location'
    || value === '当前定位'
    || value === 'Current position';
}

export function isCoordinateAddress(address: string | undefined) {
  const value = address?.trim() ?? '';
  return /^经纬度点\s+-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(value)
    || /^Coordinate\s+-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(value);
}

export async function reverseGeocode(point: PointLike, locale: Locale): Promise<string | undefined> {
  const resolved = await resolveMapPoint(point, locale);
  return resolved.address
    ?? locationSuggestionLabel(resolved.suggestions[0], locale)
    ?? await reverseGeocodeByOsm(point, locale);
}

export async function resolveMapPoint(point: PointLike, locale: Locale): Promise<LocationResolveResult> {
  const backend = await resolveMapPointByBackend(point, locale);
  const amap = await resolveMapPointByAmap(point, locale);
  if (backend || amap) return mergeLocationResolve(backend, amap);

  const osmAddress = await reverseGeocodeByOsm(point, locale);
  return {
    address: osmAddress,
    suggestions: osmAddress ? [{ name: osmAddress, address: osmAddress }] : [],
    warnings: osmAddress ? [] : [locale === 'en'
      ? 'No readable address found nearby. Please choose a named point or entrance.'
      : '附近没有解析到可读地址，请选择具体门店、楼栋或入口。'],
  };
}

export async function reverseGeocodeByBackend(point: PointLike, locale: Locale): Promise<string | undefined> {
  return (await resolveMapPointByBackend(point, locale))?.address;
}

export async function reverseGeocodeByAmap(point: PointLike, locale: Locale): Promise<string | undefined> {
  return (await resolveMapPointByAmap(point, locale))?.address;
}

export async function resolveMapPointByBackend(point: PointLike, locale: Locale): Promise<LocationResolveResult | undefined> {
  const endpoint = envValue('VITE_LOCATION_REGEOCODE_URL') || envValue('VITE_AMAP_REGEOCODE_PROXY_URL') || defaultRegeocodeProxy();
  if (!endpoint) return undefined;
  const query = buildQuery([
    ['lng', String(point.lng)],
    ['lat', String(point.lat)],
    ['radius', '1000'],
    ['extensions', 'all'],
  ]);
  const data = await requestJson<BackendReversePayload>(`${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`);
  if (!data) return undefined;
  if (data?.code && data.code !== 0) return undefined;
  if ('status' in data || 'regeocode' in data) return compactAmapLocationResolve(data as AmapReversePayload, undefined, locale);
  return {
    address: compactBackendAddress(data, locale),
    suggestions: [],
    warnings: [],
  };
}

export async function resolveMapPointByAmap(point: PointLike, locale: Locale): Promise<LocationResolveResult | undefined> {
  const key = envValue('VITE_AMAP_WEB_SERVICE_KEY') || envValue('VITE_AMAP_API_KEY') || envValue('VITE_AMAP_WEB_KEY');
  const aroundProxy = envValue('VITE_AMAP_PLACE_AROUND_PROXY_URL') || defaultPlaceAroundProxy();
  if (!key && !aroundProxy) return undefined;
  const regeoParams = [
    ...(key ? [['key', key]] : []),
    ['location', `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`],
    ['output', 'JSON'],
    ['extensions', 'all'],
    ['radius', '1000'],
  ];
  const regeo = key ? await requestJson<AmapReversePayload>(`${AMAP_REGEOCODE_URL}?${buildQuery(regeoParams)}`) : undefined;
  const around = await requestAmapPlaceAround(point, key, aroundProxy);
  return compactAmapLocationResolve(regeo, around, locale);
}

export async function reverseGeocodeByOsm(point: PointLike, locale: Locale): Promise<string | undefined> {
  const params = [
    ['format', 'jsonv2'],
    ['addressdetails', '1'],
    ['zoom', '18'],
    ['lat', String(point.lat)],
    ['lon', String(point.lng)],
    ['accept-language', locale === 'zh' ? 'zh-CN,zh,en' : 'en,zh-CN'],
  ];
  const query = buildQuery(params);
  const data = await requestJson<OsmReversePayload>(`${OSM_REGEOCODE_URL}?${query}`);
  return compactOsmAddress(data, locale);
}

export function compactAmapAddress(data: AmapReversePayload | undefined, locale: Locale): string | undefined {
  if (!data || data.status === '0') return undefined;
  const formatted = data.regeocode?.formatted_address?.trim();
  if (formatted) return formatted;
  const component = data.regeocode?.addressComponent;
  return compactAddressParts({
    province: flexText(component?.province),
    city: flexText(component?.city),
    district: flexText(component?.district),
    township: flexText(component?.township),
    street: flexText(component?.streetNumber?.street),
    number: flexText(component?.streetNumber?.number),
  }, locale);
}

export function compactAmapLocationResolve(
  regeo: AmapReversePayload | undefined,
  around: AmapPlaceAroundPayload | undefined,
  locale: Locale,
): LocationResolveResult | undefined {
  if ((!regeo || regeo.status === '0') && (!around || around.status === '0')) return undefined;
  const address = compactAmapAddress(regeo, locale);
  const suggestions = uniqueSuggestions([
    ...compactAmapPois(extractAmapPois(around?.pois)),
    ...compactAmapPois(extractAmapPois(regeo?.regeocode?.pois)),
    ...compactAmapAois(extractAmapAois(regeo?.regeocode?.aois)),
  ]);
  return {
    address: address ?? locationSuggestionLabel(suggestions[0], locale),
    suggestions,
    warnings: amapWarnings(regeo, suggestions, locale),
  };
}

export function compactBackendAddress(data: BackendReversePayload | undefined, locale: Locale): string | undefined {
  const raw = data?.data ?? data;
  if (!raw) return undefined;
  const formatted = 'formatted_address' in raw ? raw.formatted_address?.trim() : undefined;
  if (formatted) return formatted;
  if ('addressComponent' in raw) {
    return compactAmapAddress({ status: '1', regeocode: raw }, locale);
  }
  const plain = raw as {
    province?: string;
    city?: string;
    district?: string;
    township?: string;
    street?: string;
    number?: string;
  };
  return compactAddressParts({
    province: plain.province,
    city: plain.city,
    district: plain.district,
    township: plain.township,
    street: plain.street,
    number: plain.number,
  }, locale);
}

export function compactOsmAddress(data: OsmReversePayload | undefined, locale: Locale): string | undefined {
  const address = data?.address;
  const primary = firstDefined(address?.amenity, address?.building, address?.shop, address?.tourism, address?.leisure, address?.office, data?.name);
  const road = withHouseNumber(firstDefined(address?.road, address?.pedestrian, address?.residential), address?.house_number);
  const area = firstDefined(
    address?.neighbourhood,
    address?.suburb,
    address?.city_district,
    address?.district,
    address?.village,
    address?.town,
    address?.city,
    address?.county,
  );
  const region = firstDefined(address?.city, address?.county, address?.state);
  const parts = uniqueCompact([primary, road, area, region]).slice(0, 3);
  if (parts.length) return parts.join(locale === 'en' ? ', ' : ' · ');

  const displayParts = uniqueCompact(data?.display_name?.split(',').map((item) => item.trim()) ?? []);
  if (displayParts.length) return displayParts.slice(0, 3).join(locale === 'en' ? ', ' : ' · ');
  return undefined;
}

export function locationSuggestionLabel(suggestion: LocationSuggestion | undefined, locale: Locale) {
  if (!suggestion) return undefined;
  return uniqueCompact([suggestion.name, suggestion.address]).join(locale === 'en' ? ', ' : ' · ');
}

function compactAddressParts(parts: {
  province?: string;
  city?: string;
  district?: string;
  township?: string;
  street?: string;
  number?: string;
}, locale: Locale) {
  const road = withHouseNumber(parts.street, parts.number);
  const values = uniqueCompact([parts.province, parts.city, parts.district, parts.township, road]);
  if (!values.length) return undefined;
  return values.join(locale === 'en' ? ', ' : '');
}

function requestJson<T>(url: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    let done = false;
    const state: {
      task?: { abort?: () => void };
      timer?: ReturnType<typeof setTimeout>;
    } = {};
    const finish = (value: T | undefined) => {
      if (done) return;
      done = true;
      if (state.timer) clearTimeout(state.timer);
      resolve(value);
    };
    state.timer = setTimeout(() => {
      state.task?.abort?.();
      finish(undefined);
    }, REQUEST_TIMEOUT_MS);
    state.task = uni.request({
      url,
      method: 'GET',
      header: { Accept: 'application/json' },
      success: (result: any) => {
        finish(typeof result.data === 'object' && result.data ? result.data as T : undefined);
      },
      fail: () => finish(undefined),
    });
  });
}

function firstDefined(...values: Array<string | undefined>) {
  return values.find((value) => Boolean(value?.trim()))?.trim();
}

function withHouseNumber(road: string | undefined, houseNumber: string | undefined) {
  if (!road) return undefined;
  return houseNumber ? `${road} ${houseNumber}` : road;
}

function uniqueCompact(values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) return false;
    seen.add(trimmed);
    return true;
  });
}

function buildQuery(params: string[][]) {
  return params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}

function envValue(key: string) {
  const env = import.meta.env as Record<string, string | undefined>;
  return typeof env?.[key] === 'string' ? env[key].trim() : '';
}

function defaultRegeocodeProxy() {
  return import.meta.env.DEV ? '/__amap/regeocode' : '';
}

function defaultPlaceAroundProxy() {
  return import.meta.env.DEV ? '/__amap/place-around' : '';
}

async function requestAmapPlaceAround(point: PointLike, key: string, proxyEndpoint: string): Promise<AmapPlaceAroundPayload | undefined> {
  const params = [
    ...(key ? [['key', key]] : []),
    ['location', `${point.lng.toFixed(6)},${point.lat.toFixed(6)}`],
    ['radius', '600'],
    ['sortrule', 'distance'],
    ['page_size', '6'],
    ['page_num', '1'],
    ['show_fields', 'indoor,navi'],
    ['output', 'json'],
  ];
  if (key) return await requestJson<AmapPlaceAroundPayload>(`${AMAP_PLACE_AROUND_URL}?${buildQuery(params)}`);
  if (!proxyEndpoint) return undefined;
  const query = buildQuery([
    ['lng', String(point.lng)],
    ['lat', String(point.lat)],
    ['radius', '600'],
  ]);
  return await requestJson<AmapPlaceAroundPayload>(`${proxyEndpoint}${proxyEndpoint.includes('?') ? '&' : '?'}${query}`);
}

function mergeLocationResolve(primary: LocationResolveResult | undefined, secondary: LocationResolveResult | undefined): LocationResolveResult {
  return {
    address: primary?.address ?? secondary?.address,
    suggestions: uniqueSuggestions([...(primary?.suggestions ?? []), ...(secondary?.suggestions ?? [])]),
    warnings: uniqueCompact([...(primary?.warnings ?? []), ...(secondary?.warnings ?? [])]),
  };
}

function compactAmapPois(pois: AmapPoi[]) {
  return pois.map((poi): LocationSuggestion | undefined => {
    const name = flexText(poi.name);
    if (!name) return undefined;
    return {
      id: flexText(poi.id),
      name,
      address: flexText(poi.address),
      distanceM: parseMeters(poi.distance),
      type: flexText(poi.type),
      typecode: flexText(poi.typecode),
      location: parseLngLat(poi.location),
      entrance: parseLngLat(poi.navi?.entr_location),
      indoor: {
        indoorMap: poi.indoor?.indoor_map === '1',
        floor: flexText(poi.indoor?.floor),
        truefloor: flexText(poi.indoor?.truefloor),
      },
    };
  }).filter((item): item is LocationSuggestion => Boolean(item));
}

function compactAmapAois(aois: AmapAoi[]) {
  return aois.map((aoi): LocationSuggestion | undefined => {
    const name = flexText(aoi.name);
    if (!name) return undefined;
    return {
      id: `${name}-${aoi.location ?? ''}`,
      name,
      address: flexText(aoi.type),
      distanceM: parseMeters(aoi.distance),
      type: flexText(aoi.type),
      location: parseLngLat(aoi.location),
    };
  }).filter((item): item is LocationSuggestion => Boolean(item));
}

function amapWarnings(regeo: AmapReversePayload | undefined, suggestions: LocationSuggestion[], locale: Locale) {
  const warnings: string[] = [];
  const indoor = suggestions.find((item) => item.indoor?.indoorMap);
  if (indoor) {
    warnings.push(locale === 'en'
      ? `${indoor.name} may be indoors or on a floor. Confirm an outdoor loading/unloading point.`
      : `${indoor.name} 可能位于室内或楼层内，请确认室外可起吊/装卸点。`);
  }
  const aoi = extractAmapAois(regeo?.regeocode?.aois).find((item) => parseMeters(item.distance) === 0);
  if (aoi?.name) {
    warnings.push(locale === 'en'
      ? `This point is inside ${aoi.name}; access gates or restricted roads may apply.`
      : `该点位于${aoi.name}范围内，可能涉及门禁、园区道路或车辆禁行，请确认可进场点。`);
  }
  const nearestRoad = extractAmapRoads(regeo?.regeocode?.roads)
    .map((road) => ({ name: flexText(road.name), distanceM: parseMeters(road.distance) }))
    .filter((road) => Number.isFinite(road.distanceM))
    .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))[0];
  if (nearestRoad?.distanceM && nearestRoad.distanceM > 80) {
    warnings.push(locale === 'en'
      ? `Nearest mapped road is about ${Math.round(nearestRoad.distanceM)}m away. Prefer a gate or roadside point.`
      : `最近道路约 ${Math.round(nearestRoad.distanceM)}m，建议选择门口、路边或明确装卸点。`);
  }
  if (!suggestions.length) {
    warnings.push(locale === 'en'
      ? 'No nearby POI was returned. Zoom in and choose a named place or entrance.'
      : '附近没有返回推荐 POI，请放大地图并选择具体门店、楼栋或入口。');
  }
  return uniqueCompact(warnings);
}

function uniqueSuggestions(values: LocationSuggestion[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = item.id || `${item.name}|${item.address ?? ''}|${item.location?.lng ?? ''},${item.location?.lat ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function extractAmapPois(value: AmapPoisField | undefined): AmapPoi[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if ('poi' in value) return normalizeArray(value.poi);
  return [value as AmapPoi];
}

function extractAmapAois(value: AmapAoisField | undefined): AmapAoi[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if ('aoi' in value) return normalizeArray(value.aoi);
  return [value as AmapAoi];
}

function extractAmapRoads(value: AmapRoadsField | undefined): AmapRoad[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if ('road' in value) return normalizeArray(value.road);
  return [value as AmapRoad];
}

function normalizeArray<T>(value: T | T[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseMeters(value: string | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseLngLat(value: string | undefined): GeoPoint | undefined {
  const [lngRaw, latRaw] = value?.split(',') ?? [];
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
  return { lng, lat };
}

function flexText(value: string | unknown[] | undefined) {
  return typeof value === 'string' ? value.trim() : undefined;
}
