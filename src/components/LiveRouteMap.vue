<template>
  <view class="live-route-map">
    <map
      :id="mapId"
      class="native-route-map"
      :latitude="mapCenter.latitude"
      :longitude="mapCenter.longitude"
      :scale="mapScale"
      :markers="mapMarkers"
      :polyline="mapPolyline"
      :circles="mapCircles"
      :include-points="includePoints"
      :show-location="false"
    >
      <cover-view class="map-badges">
        <cover-view class="map-badge">
          <cover-view class="badge-dot" />
          <cover-view class="badge-text">{{ gpsBadgeText }}</cover-view>
        </cover-view>
        <cover-view class="map-badge cyan">
          <cover-view class="badge-text">{{ distanceText }}</cover-view>
        </cover-view>
      </cover-view>

      <cover-view class="address-panel">
        <cover-view class="address-card">
          <cover-view class="addr-kicker">{{ startLabel }}</cover-view>
          <cover-view class="addr-title">{{ fromPointTitle }}</cover-view>
        </cover-view>
        <cover-view class="address-card">
          <cover-view class="addr-kicker">{{ endLabel }}</cover-view>
          <cover-view class="addr-title">{{ toPointTitle }}</cover-view>
        </cover-view>
      </cover-view>
    </map>

    <view v-if="showMapKeyHint" class="map-key-hint">
      <text>{{ mapKeyHint }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { GeoPoint, Telemetry } from '@/models';
import { isCoordinateAddress, isGenericMapAddress } from '@/services/geocoding';
import { distanceKm } from '@/utils/geo';
import { MAP_LINE_STRONG, MAP_PRIMARY, MAP_PRIMARY_SOFT, MAP_TEXT_LIGHT, MAP_WHITE, mapPrimaryAlpha } from '@/utils/map-colors';
import { configureH5MapProvider, h5MapProviderConfigured } from '@/utils/native-map';

const ORIGIN_ICON = '/static/map/marker-origin.svg';
const DESTINATION_ICON = '/static/map/marker-destination.svg';
const AIRCRAFT_ICON = '/static/map/marker-drone-stitch.png';
const AIRCRAFT_MARKER_WIDTH = 50;
const AIRCRAFT_MARKER_HEIGHT = 54;
const FLOW_SEGMENTS = 14;
const FLOW_GAP = 0.075;
const FLOW_LENGTH = 0.047;

const props = withDefaults(defineProps<{
  from: GeoPoint;
  to: GeoPoint;
  frame?: Telemetry;
  craftTag: string;
  locale?: 'zh' | 'en';
  live?: boolean;
  gpsStatus?: 'standby' | 'live' | 'arrived';
}>(), {
  frame: undefined,
  locale: 'zh',
  live: false,
  gpsStatus: undefined,
});

const mapProviderReady = ref(configureH5MapProvider());
const flowPhase = ref(0);
const pulsePhase = ref(0);
let flowTimer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  mapProviderReady.value = h5MapProviderConfigured();
  flowTimer = setInterval(() => {
    flowPhase.value = (flowPhase.value + 0.009) % FLOW_GAP;
    pulsePhase.value = (pulsePhase.value + 0.035) % 1;
  }, 120);
});

onBeforeUnmount(() => {
  if (flowTimer) clearInterval(flowTimer);
});

const fromPointTitle = computed(() => pointTitle(props.from, startLabel.value));
const toPointTitle = computed(() => pointTitle(props.to, endLabel.value));
const currentPoint = computed(() => props.frame?.pos ?? props.from);
const routeDistance = computed(() => distanceKm(props.from, props.to));
const mapId = computed(() => `live-route-map-${safeId(props.craftTag)}`);
const startLabel = computed(() => props.locale === 'en' ? 'LOADING POINT' : '装货点');
const endLabel = computed(() => props.locale === 'en' ? 'DELIVERY POINT' : '卸货点');
const gpsBadgeText = computed(() => {
  const status = props.gpsStatus ?? (props.live ? 'live' : 'standby');
  if (status === 'live') return props.locale === 'en' ? 'GPS: LIVE' : 'GPS：实时';
  if (status === 'arrived') return props.locale === 'en' ? 'GPS: ARRIVED' : 'GPS：已到达';
  return props.locale === 'en' ? 'GPS: STANDBY' : 'GPS：待起飞';
});
const distanceText = computed(() => `${routeDistance.value.toFixed(1)} km`);
const mapKeyHint = computed(() => props.locale === 'en'
  ? 'The map is temporarily unavailable. Please try again later.'
  : '地图暂时无法加载，请稍后重试。');
const showMapKeyHint = computed(() => isH5Runtime() && !mapProviderReady.value);

const mapCenter = computed(() => {
  const points = [props.from, props.to, currentPoint.value];
  return {
    latitude: average(points.map((point) => point.lat)),
    longitude: average(points.map((point) => point.lng)),
  };
});

const mapScale = computed(() => {
  const km = routeDistance.value;
  if (km > 60) return 8;
  if (km > 25) return 10;
  if (km > 10) return 11;
  if (km > 4) return 12;
  if (km > 1.2) return 13;
  return 15;
});

// uni-h5 会把 include-points 全量展开传给高德 2.0 的 Bounds(southWest, northEast)，
// 多于两点必然抛 Invalid Object: Bounds；H5 视野由 mapCenter + mapScale 控制，这里只在非 H5 传点。
const includePoints = computed(() => {
  if (isH5Runtime()) return [];
  return [
    toMapPoint(props.from),
    toMapPoint(props.to),
    toMapPoint(currentPoint.value),
  ];
});

const mapMarkers = computed(() => [
  markerOf(1, props.from, startLabel.value, ORIGIN_ICON, 26, 26),
  markerOf(2, props.to, endLabel.value, DESTINATION_ICON, 26, 26),
  {
    ...markerOf(3, currentPoint.value, '', AIRCRAFT_ICON, AIRCRAFT_MARKER_WIDTH, AIRCRAFT_MARKER_HEIGHT),
    anchor: { x: 0.5, y: 0.42 },
    zIndex: 30,
  },
]);

const mapCircles = computed(() => {
  const radius = Math.max(1250, Math.min(2050, routeDistance.value * 155));
  const pulse = pulsePhase.value;
  const pulseRadius = radius * (0.76 + pulse * 0.7);
  const pulseAlpha = Math.max(0, 0.34 * (1 - pulse));
  return [
    {
      ...toMapPoint(currentPoint.value),
      color: MAP_PRIMARY,
      fillColor: mapPrimaryAlpha(0.14),
      radius,
      strokeWidth: 1,
    },
    {
      ...toMapPoint(currentPoint.value),
      color: MAP_PRIMARY,
      fillColor: mapPrimaryAlpha(0.07),
      radius: radius * 0.68,
      strokeWidth: 2,
    },
    {
      ...toMapPoint(currentPoint.value),
      color: mapPrimaryAlpha(pulseAlpha + 0.1),
      fillColor: mapPrimaryAlpha(pulseAlpha),
      radius: pulseRadius,
      strokeWidth: 2,
    },
  ];
});

const mapPolyline = computed(() => {
  const full = [toMapPoint(props.from), toMapPoint(props.to)];
  const flow = Array.from({ length: FLOW_SEGMENTS }, (_, index) => {
    const start = (flowPhase.value + index * FLOW_GAP) % 1;
    const end = Math.min(start + FLOW_LENGTH, 1);
    return {
      points: [pointAtRoute(start), pointAtRoute(end)],
      color: MAP_WHITE,
      width: 2,
      dottedLine: false,
      arrowLine: false,
    };
  });

  return [
    {
      points: full,
      color: MAP_PRIMARY_SOFT,
      width: 5,
      dottedLine: false,
      arrowLine: false,
    },
    {
      points: full,
      color: MAP_PRIMARY,
      width: 3,
      dottedLine: false,
      arrowLine: false,
    },
    ...flow,
  ];
});

function markerOf(id: number, point: GeoPoint, label: string, iconPath: string, width: number, height: number) {
  const marker: Record<string, unknown> = {
    id,
    latitude: point.lat,
    longitude: point.lng,
    iconPath,
    width,
    height,
    zIndex: id,
  };

  if (label) {
    marker.label = {
      content: label,
      color: MAP_TEXT_LIGHT,
      fontSize: 12,
      borderRadius: 4,
      bgColor: 'rgba(20, 24, 34, 0.92)',
      borderWidth: 1,
      borderColor: MAP_LINE_STRONG,
      padding: 6,
      anchorX: -14,
      anchorY: -46,
    };
  }

  return marker;
}

function toMapPoint(point: GeoPoint) {
  return {
    latitude: point.lat,
    longitude: point.lng,
  };
}

function pointAtRoute(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  return {
    latitude: props.from.lat + (props.to.lat - props.from.lat) * clamped,
    longitude: props.from.lng + (props.to.lng - props.from.lng) * clamped,
  };
}

function average(values: number[]) {
  return values.reduce((sum, item) => sum + item, 0) / Math.max(1, values.length);
}

function pointTitle(point: GeoPoint, label: string) {
  const address = point.address?.trim();
  if (address && !isGenericMapAddress(address) && !isCoordinateAddress(address)) return address;
  return props.locale === 'en' ? `${label} pending` : `${label}待确认`;
}

function safeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40) || 'default';
}

function isH5Runtime() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}
</script>

<style lang="scss" scoped>
.live-route-map {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 760rpx;
  border-radius: 14rpx;
  border: 2rpx solid $line-strong;
  background: $bg-card;
  box-sizing: border-box;
}

.native-route-map {
  width: 100%;
  height: 100%;
}

.map-badges {
  position: absolute;
  left: 30rpx;
  top: 30rpx;
  z-index: 5;
  display: flex;
}

.map-badge {
  height: 42rpx;
  margin-right: 12rpx;
  padding: 0 16rpx;
  border-radius: 6rpx;
  border: 2rpx solid rgba(58, 73, 75, .78);
  background: rgba(20, 24, 34, .88);
  color: $warning;
  display: flex;
  align-items: center;
}

.map-badge.cyan {
  color: $color-primary;
}

.badge-dot {
  width: 14rpx;
  height: 14rpx;
  margin-right: 10rpx;
  border-radius: 50%;
  background: $success;
}

.badge-text {
  color: $blue-50;
  font-size: 18rpx;
  line-height: 42rpx;
  font-weight: 800;
}

.address-panel {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  z-index: 5;
  display: flex;
}

.address-card {
  min-width: 0;
  flex: 1;
  margin-right: 14rpx;
  padding: 14rpx 16rpx;
  border: 2rpx solid rgba(58, 73, 75, .78);
  border-radius: 8rpx;
  background: rgba(20, 24, 34, .88);
  box-sizing: border-box;
}

.address-card:last-child {
  margin-right: 0;
}

.addr-kicker {
  color: $color-primary;
  font-size: 17rpx;
  line-height: 24rpx;
  font-weight: 800;
}

.addr-title {
  margin-top: 5rpx;
  color: $blue-50;
  font-size: 21rpx;
  line-height: 30rpx;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-key-hint {
  position: absolute;
  inset: 0;
  z-index: 8;
  padding: 0 42rpx;
  background: rgba(7, 11, 18, .82);
  color: $blue-50;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
}

.map-key-hint text {
  color: $blue-50;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 700;
}

:deep(.amap-icon) {
  overflow: visible !important;
}

:deep(.amap-icon img[src*="marker-drone-stitch.png"]) {
  transform: translateY(28px) !important;
}
</style>
