<template>
  <view v-if="visible" class="map-picker">
    <view class="picker-backdrop" @tap="cancel" />
    <view class="picker-sheet">
      <view class="picker-head">
        <view class="head-copy">
          <text class="picker-kicker">{{ subtitle }}</text>
          <text class="picker-title">{{ title }}</text>
        </view>
        <view class="close-button" hover-class="tap-press" @tap="cancel">
          <StitchIcon name="close" size="32rpx" />
        </view>
      </view>

      <view class="map-toolbar">
        <view class="selected-readout">
          <text>{{ addressText }}</text>
          <text class="coord-line">{{ coordText }}</text>
          <text v-if="resolvingAddress" class="resolve-status">{{ resolveStatusText }}</text>
          <text v-if="selectionError" class="resolve-error">{{ selectionError }}</text>
        </view>
        <view class="zoom-controls">
          <view hover-class="tap-press" @tap="setZoom(1)">
            <StitchIcon name="add" size="28rpx" />
          </view>
          <view hover-class="tap-press" @tap="setZoom(-1)">
            <StitchIcon name="remove" size="28rpx" />
          </view>
        </view>
      </view>

      <view class="map-viewport" @tap="onMapTap">
        <image
          v-for="tile in tiles"
          :key="tile.key"
          class="map-tile"
          :src="tile.url"
          :style="tile.style"
          mode="scaleToFill"
        />
        <view class="map-tint" />
        <view v-if="counterpart" class="counterpart-marker" :style="counterpartStyle">
          <StitchIcon name="radio_button_checked" size="28rpx" />
          <text>{{ counterpartLabel }}</text>
        </view>
        <view class="center-cross horizontal" />
        <view class="center-cross vertical" />
        <view class="center-marker">
          <StitchIcon name="location_on" size="44rpx" fill />
        </view>
        <view class="tile-credit">高德地图</view>
      </view>

      <view v-if="warnings.length || suggestions.length" class="recommend-panel">
        <view v-if="warnings.length" class="warning-list">
          <text v-for="item in warnings" :key="item">{{ item }}</text>
        </view>
        <view v-if="suggestions.length" class="suggestion-list">
          <view
            v-for="item in suggestions"
            :key="suggestionKey(item)"
            :class="['suggestion-row', { active: isSuggestionActive(item) }]"
            hover-class="tap-press"
            @tap.stop="selectSuggestion(item)"
          >
            <view class="suggestion-pin"><StitchIcon name="location_on" size="24rpx" /></view>
            <view class="suggestion-copy">
              <text>{{ item.name }}</text>
              <text>{{ suggestionMeta(item) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="picker-actions">
        <view class="outline-action" hover-class="tap-press" @tap="cancel">{{ cancelText }}</view>
        <view :class="['primary-action', { disabled: confirmDisabled }]" hover-class="tap-press" @tap="confirm">{{ confirmText }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, reactive, ref, watch } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import type { GeoPoint } from '@/models';
import { coordinateAddress, isCoordinateAddress, isGenericMapAddress, locationSuggestionLabel, resolveMapPoint } from '@/services/geocoding';
import type { LocationSuggestion } from '@/services/geocoding';

const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const AMAP_TILE_HOSTS = 4;

const props = withDefaults(defineProps<{
  visible: boolean;
  title: string;
  subtitle?: string;
  initial: GeoPoint;
  counterpart?: GeoPoint;
  counterpartLabel?: string;
  confirmText: string;
  cancelText: string;
  locale?: 'zh' | 'en';
}>(), {
  subtitle: '',
  counterpart: undefined,
  counterpartLabel: '',
  locale: 'zh',
});

const emit = defineEmits<{
  (e: 'confirm', point: GeoPoint): void;
  (e: 'cancel'): void;
}>();

const instance = getCurrentInstance();
const zoom = reactive({ value: 13 });
const viewport = reactive({ width: 360, height: 300, left: 0, top: 0 });
const selected = reactive<GeoPoint>({ lng: props.initial.lng, lat: props.initial.lat, address: props.initial.address });
const resolvingAddress = ref(false);
const resolveSeq = ref(0);
const pendingAddress = ref<Promise<string | undefined> | undefined>();
const suggestions = ref<LocationSuggestion[]>([]);
const warnings = ref<string[]>([]);
const selectionError = ref('');

const coordText = computed(() => `LNG ${selected.lng.toFixed(5)} / LAT ${selected.lat.toFixed(5)}`);
const addressText = computed(() => selected.address || coordinateAddress(selected, props.locale));
const resolveStatusText = computed(() => props.locale === 'en' ? 'Resolving address...' : '正在解析地址...');
const confirmDisabled = computed(() => resolvingAddress.value || !hasReadableAddress(addressText.value));

const tiles = computed(() => {
  const center = project(selected, zoom.value);
  const minX = Math.floor((center.x - viewport.width / 2) / TILE_SIZE) - 1;
  const maxX = Math.floor((center.x + viewport.width / 2) / TILE_SIZE) + 1;
  const minY = Math.floor((center.y - viewport.height / 2) / TILE_SIZE) - 1;
  const maxY = Math.floor((center.y + viewport.height / 2) / TILE_SIZE) + 1;
  const maxTile = 2 ** zoom.value;
  const out: Array<{ key: string; url: string; style: Record<string, string> }> = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      if (y < 0 || y >= maxTile) continue;
      const wrappedX = ((x % maxTile) + maxTile) % maxTile;
      out.push({
        key: `${zoom.value}-${x}-${y}`,
        url: amapTileUrl(zoom.value, wrappedX, y),
        style: {
          left: `${Math.round(x * TILE_SIZE - center.x + viewport.width / 2)}px`,
          top: `${Math.round(y * TILE_SIZE - center.y + viewport.height / 2)}px`,
        },
      });
    }
  }
  return out;
});

function amapTileUrl(z: number, x: number, y: number) {
  const host = String((Math.abs(x + y) % AMAP_TILE_HOSTS) + 1).padStart(2, '0');
  return `https://webrd${host}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=${x}&y=${y}&z=${z}`;
}

const counterpartStyle = computed(() => {
  if (!props.counterpart) return {};
  const center = project(selected, zoom.value);
  const point = project(props.counterpart, zoom.value);
  return {
    left: `${Math.round(viewport.width / 2 + point.x - center.x)}px`,
    top: `${Math.round(viewport.height / 2 + point.y - center.y)}px`,
  };
});

watch(() => props.visible, (visible) => {
  if (!visible) return;
  selected.lng = props.initial.lng;
  selected.lat = props.initial.lat;
  selected.address = displayAddress(props.initial);
  suggestions.value = [];
  warnings.value = [];
  selectionError.value = '';
  measureViewport();
  void resolveSelectedAddress({ lng: selected.lng, lat: selected.lat });
});

watch(() => props.initial, (point) => {
  if (!props.visible) return;
  selected.lng = point.lng;
  selected.lat = point.lat;
  selected.address = displayAddress(point);
  suggestions.value = [];
  warnings.value = [];
  selectionError.value = '';
  void resolveSelectedAddress({ lng: selected.lng, lat: selected.lat });
});

function setZoom(delta: number) {
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + delta));
}

function onMapTap(event: any) {
  const local = localPoint(event);
  if (!local) return;
  const center = project(selected, zoom.value);
  const next = unproject(
    center.x + local.x - viewport.width / 2,
    center.y + local.y - viewport.height / 2,
    zoom.value,
  );
  selected.lng = next.lng;
  selected.lat = next.lat;
  selected.address = coordinateAddress(next, props.locale);
  suggestions.value = [];
  warnings.value = [];
  selectionError.value = '';
  void resolveSelectedAddress(next);
}

async function confirm() {
  const resolved = await ensureReadableAddress();
  if (!resolved) {
    selectionError.value = props.locale === 'en'
      ? 'Choose a recommended named place before confirming.'
      : '请先选择推荐的具体地址后再确认。';
    return;
  }
  emit('confirm', {
    lng: roundCoord(selected.lng),
    lat: roundCoord(selected.lat),
    address: resolved,
  });
}

function cancel() {
  emit('cancel');
}

function displayAddress(point: GeoPoint) {
  return hasReadableAddress(point.address) ? point.address : coordinateAddress(point, props.locale);
}

async function resolveSelectedAddress(point: GeoPoint) {
  const seq = resolveSeq.value + 1;
  resolveSeq.value = seq;
  resolvingAddress.value = true;
  const promise = resolveReadableAddress(point, seq);
  pendingAddress.value = promise;
  const address = await promise;
  if (resolveSeq.value === seq) {
    pendingAddress.value = undefined;
    resolvingAddress.value = false;
  }
  return address;
}

async function resolveReadableAddress(point: GeoPoint, seq: number) {
  const result = await resolveMapPoint(point, props.locale);
  if (resolveSeq.value !== seq) return undefined;
  suggestions.value = result.suggestions;
  warnings.value = result.warnings;
  const first = result.suggestions[0];
  if (first) {
    applySuggestion(first);
    return selected.address;
  }
  if (hasReadableAddress(result.address)) {
    selected.address = result.address;
    selectionError.value = '';
    return result.address;
  }
  return undefined;
}

async function ensureReadableAddress() {
  const current = addressText.value;
  if (hasReadableAddress(current)) return current;
  if (suggestions.value[0]) {
    applySuggestion(suggestions.value[0]);
    return selected.address;
  }
  const latest = { lng: selected.lng, lat: selected.lat };
  const address = await (pendingAddress.value ?? resolveSelectedAddress(latest));
  if (hasReadableAddress(address)) {
    selected.address = address;
    return address;
  }
  return undefined;
}

async function selectSuggestion(item: LocationSuggestion) {
  applySuggestion(item);
  await confirm();
}

function applySuggestion(item: LocationSuggestion) {
  const point = item.entrance ?? item.location;
  if (point) {
    selected.lng = point.lng;
    selected.lat = point.lat;
  }
  selected.address = locationSuggestionLabel(item, props.locale) ?? item.name;
  selectionError.value = '';
}

function suggestionKey(item: LocationSuggestion) {
  return item.id || `${item.name}-${item.address ?? ''}-${item.location?.lng ?? ''}-${item.location?.lat ?? ''}`;
}

function suggestionMeta(item: LocationSuggestion) {
  const parts = [
    item.address,
    item.distanceM !== undefined ? `${Math.round(item.distanceM)}m` : undefined,
    item.indoor?.truefloor || item.indoor?.floor,
    item.entrance ? (props.locale === 'en' ? 'entrance point' : '入口导航点') : undefined,
  ].filter(Boolean);
  return parts.join(props.locale === 'en' ? ' · ' : ' · ') || (props.locale === 'en' ? 'Recommended point' : '推荐地址');
}

function isSuggestionActive(item: LocationSuggestion) {
  return locationSuggestionLabel(item, props.locale) === selected.address;
}

function hasReadableAddress(address: string | undefined) {
  return Boolean(address && !isGenericMapAddress(address) && !isCoordinateAddress(address));
}

function measureViewport() {
  nextTick(() => {
    uni.createSelectorQuery()
      .in(instance?.proxy)
      .select('.map-viewport')
      .boundingClientRect((rect: any) => {
        if (!rect) return;
        viewport.width = Number(rect.width) || viewport.width;
        viewport.height = Number(rect.height) || viewport.height;
        viewport.left = Number(rect.left) || 0;
        viewport.top = Number(rect.top) || 0;
      })
      .exec();
  });
}

function localPoint(event: any): { x: number; y: number } | undefined {
  const touch = event?.changedTouches?.[0] ?? event?.touches?.[0] ?? event;
  const domRect = event?.currentTarget?.getBoundingClientRect?.();
  const clientX = Number(touch?.clientX);
  const clientY = Number(touch?.clientY);
  if (domRect && Number.isFinite(clientX) && Number.isFinite(clientY)) {
    const x = clientX - domRect.left;
    const y = clientY - domRect.top;
    if (x < 0 || y < 0 || x > domRect.width || y > domRect.height) return undefined;
    return { x, y };
  }
  const rawX = Number(event?.detail?.x ?? clientX ?? touch?.pageX);
  const rawY = Number(event?.detail?.y ?? clientY ?? touch?.pageY);
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return undefined;
  const x = rawX > viewport.width ? rawX - viewport.left : rawX;
  const y = rawY > viewport.height ? rawY - viewport.top : rawY;
  if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) return undefined;
  return { x, y };
}

function project(point: GeoPoint, z: number) {
  const sinLat = Math.sin((clampLat(point.lat) * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** z;
  return {
    x: ((point.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, z: number): GeoPoint {
  const scale = TILE_SIZE * 2 ** z;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lng, lat: clampLat(lat) };
}

function clampLat(lat: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}

function roundCoord(value: number) {
  return Math.round(value * 1000000) / 1000000;
}
</script>

<style lang="scss" scoped>
.map-picker {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  color: $ink-900;
}

.picker-backdrop {
  position: absolute;
  inset: 0;
  background: $overlay;
}

.picker-sheet {
  position: absolute;
  left: $sp-3;
  right: $sp-3;
  bottom: $sp-3;
  overflow: hidden;
  border: 2rpx solid $line-strong;
  border-radius: $r-md;
  background: $bg-card;
  box-shadow: $shadow-float;
}

.picker-head,
.map-toolbar,
.picker-actions,
.close-button,
.zoom-controls,
.zoom-controls view,
.center-marker,
.counterpart-marker {
  display: flex;
  align-items: center;
}

.picker-head {
  min-height: 104rpx;
  padding: $sp-3;
  justify-content: space-between;
  gap: $sp-3;
  border-bottom: 2rpx solid $line-strong;
  box-sizing: border-box;
}

.head-copy {
  min-width: 0;
}

.picker-kicker,
.coord-line,
.resolve-status,
.resolve-error,
.tile-credit,
.counterpart-marker text {
  font-family: "JetBrains Mono", monospace;
}

.picker-kicker {
  display: block;
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.2;
  font-weight: $fw-bold;
  letter-spacing: 2rpx;
}

.picker-title {
  display: block;
  margin-top: $sp-1;
  color: $blue-50;
  font-size: $fs-h2;
  line-height: 1.15;
  font-weight: $fw-bold;
}

.close-button {
  width: 56rpx;
  height: 56rpx;
  justify-content: center;
  color: $ink-700;
}

.map-toolbar {
  padding: $sp-3;
  justify-content: space-between;
  gap: $sp-3;
  background: $bg-sunken;
}

.selected-readout {
  min-width: 0;
}

.selected-readout text {
  display: block;
}

.selected-readout text:first-child {
  color: $ink-900;
  font-size: $fs-body;
  line-height: 1.25;
  font-weight: $fw-bold;
}

.selected-readout .coord-line {
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.2;
}

.selected-readout .resolve-status {
  margin-top: $sp-1;
  color: $color-primary;
  font-size: $fs-cap;
  line-height: 1.2;
}

.selected-readout .resolve-error {
  margin-top: $sp-1;
  color: $danger-ink;
  font-size: $fs-cap;
  line-height: 1.3;
}

.zoom-controls {
  gap: $sp-1;
  flex: 0 0 auto;
}

.zoom-controls view {
  width: 56rpx;
  height: 56rpx;
  justify-content: center;
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  color: $blue-50;
  background: $surface-panel;
}

.map-viewport {
  position: relative;
  height: 520rpx;
  overflow: hidden;
  background: $bg-sunken;
}

.map-tile {
  position: absolute;
  width: 256px;
  height: 256px;
}

.map-tint {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(0deg, rgba(11, 14, 20, .12), rgba(11, 14, 20, .12)),
    linear-gradient(90deg, rgba(0, 242, 255, .10) 1rpx, transparent 1rpx),
    linear-gradient(0deg, rgba(0, 242, 255, .10) 1rpx, transparent 1rpx);
  background-size: auto, 64rpx 64rpx, 64rpx 64rpx;
}

.center-cross {
  position: absolute;
  left: 50%;
  top: 50%;
  pointer-events: none;
  background: $color-primary;
  opacity: .72;
  transform: translate(-50%, -50%);
}

.center-cross.horizontal {
  width: 96rpx;
  height: 2rpx;
}

.center-cross.vertical {
  width: 2rpx;
  height: 96rpx;
}

.center-marker {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 72rpx;
  height: 72rpx;
  justify-content: center;
  color: $color-primary;
  transform: translate(-50%, -100%);
  filter: drop-shadow(0 8rpx 18rpx rgba(0, 0, 0, .45));
}

.counterpart-marker {
  position: absolute;
  gap: $sp-1;
  min-width: 132rpx;
  min-height: 44rpx;
  padding: 0 $sp-2;
  border: 2rpx solid $warning-line;
  border-radius: $r-pill;
  color: $warning-ink;
  background: $warning-bg;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
}

.counterpart-marker text {
  font-size: $fs-cap;
  line-height: 1.2;
  font-weight: $fw-bold;
}

.tile-credit {
  position: absolute;
  right: $sp-2;
  bottom: $sp-2;
  padding: 4rpx $sp-1;
  border-radius: $r-sm;
  color: $ink-700;
  background: $overlay;
  font-size: $fs-cap;
  line-height: 1.2;
}

.recommend-panel {
  max-height: 320rpx;
  overflow-y: auto;
  padding: $sp-2 $sp-3;
  border-top: 2rpx solid $line-strong;
  background: $bg-sunken;
}

.warning-list {
  display: grid;
  gap: $sp-1;
  margin-bottom: $sp-2;
}

.warning-list text {
  display: block;
  padding: 12rpx 16rpx;
  border: 2rpx solid $warning-line;
  border-radius: $r-sm;
  color: $warning-ink;
  background: $warning-bg;
  font-size: $fs-cap;
  line-height: 1.35;
}

.suggestion-list {
  display: grid;
  gap: $sp-2;
}

.suggestion-row {
  display: flex;
  align-items: flex-start;
  gap: $sp-2;
  min-height: 82rpx;
  padding: 14rpx 16rpx;
  border: 2rpx solid $line-strong;
  border-radius: $r-sm;
  background: $bg-card;
  box-sizing: border-box;
}

.suggestion-row.active {
  border-color: $color-primary;
  box-shadow: 0 0 0 2rpx rgba(0, 242, 255, .12);
}

.suggestion-pin {
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  color: $color-primary;
  background: rgba(0, 242, 255, .12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 38rpx;
}

.suggestion-copy {
  min-width: 0;
}

.suggestion-copy text {
  display: block;
  @include ellipsis(1);
}

.suggestion-copy text:first-child {
  color: $ink-900;
  font-size: $fs-sm;
  line-height: 1.3;
  font-weight: $fw-bold;
}

.suggestion-copy text:last-child {
  margin-top: 4rpx;
  color: $ink-500;
  font-size: $fs-cap;
  line-height: 1.25;
}

.picker-actions {
  gap: $sp-2;
  padding: $sp-3;
  border-top: 2rpx solid $line-strong;
  background: $bg-card;
}

.outline-action,
.primary-action {
  flex: 1;
  min-height: 76rpx;
  border-radius: $r-sm;
  font-size: $fs-body;
  line-height: 76rpx;
  font-weight: $fw-bold;
  text-align: center;
}

.outline-action {
  border: 2rpx solid $line-strong;
  color: $ink-700;
}

.primary-action {
  color: $on-primary;
  background: $color-primary;
  box-shadow: $shadow-glow-primary;
}

.primary-action.disabled {
  opacity: .45;
}

.tap-press {
  opacity: .78;
}
</style>
