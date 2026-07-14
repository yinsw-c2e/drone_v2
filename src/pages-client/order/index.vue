<template>
  <view class="mission-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="mission-topbar">
      <view class="top-left">
        <view class="icon-button" hover-class="tap-press" @click="back">
          <StitchIcon name="arrow_back" size="38rpx" />
        </view>
        <text class="brand-title">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="icon-button signal" hover-class="tap-press" @click="toast(copy.signalToast)">
          <StitchIcon name="signal_cellular_alt" size="38rpx" />
        </view>
      </view>
    </view>

    <view class="mission-main">
      <view class="step-track">
        <view v-for="(step, index) in steps" :key="step.label" class="step-node" :class="{ active: index === 0 }">
          <view class="step-dot">
            <view v-if="index === 0" class="inner-dot" />
            <text v-else>{{ step.code }}</text>
          </view>
          <text>{{ step.label }}</text>
        </view>
      </view>

      <view class="panel payload-panel">
        <view class="corner-accent" />
        <view class="panel-head">
          <StitchIcon name="category" size="34rpx" />
          <text>{{ copy.payloadTitle }}</text>
        </view>

        <view class="field-block">
          <text class="field-label">{{ copy.classification }}</text>
          <view class="type-grid">
            <view
              v-for="item in cargoTypes"
              :key="item.value"
              :class="['type-button', draft.cargoType === item.value ? 'active' : '']"
              hover-class="tap-press"
              @click="draft.cargoType = item.value"
            >
              <StitchIcon :name="item.icon" size="31rpx" />
              <text>{{ item.label }}</text>
            </view>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">{{ copy.grossMass }}</text>
          <view class="input-row">
            <input v-model="draft.weightKg" class="mission-input" type="number" placeholder="00.00" />
            <view class="unit-cell">KG</view>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">{{ copy.volume }}</text>
          <view class="input-row">
            <input v-model="draft.volume" class="mission-input" placeholder="0.00" />
            <view class="unit-cell">M³</view>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">{{ copy.declaredValue }}</text>
          <view class="input-row value-row">
            <view class="currency-cell">¥</view>
            <input v-model="draft.valueYuan" class="mission-input" type="number" placeholder="0.00" />
          </view>
        </view>
      </view>

      <view class="panel route-panel">
        <view class="panel-head">
          <StitchIcon name="route" size="34rpx" />
          <text>{{ copy.routeTitle }}</text>
        </view>

        <view class="point-card" hover-class="item-press" @click="pickLocation('from')">
          <view class="point-icon"><StitchIcon name="flight_takeoff" size="26rpx" /></view>
          <view class="point-copy">
            <text class="field-label">{{ copy.originLabel }}</text>
            <text class="point-title">{{ locationTitle(draft.from) }}</text>
            <text class="point-meta">{{ originMeta }}</text>
          </view>
        </view>

        <view class="vector-line"><StitchIcon name="arrow_downward" size="22rpx" /></view>

        <view class="point-card destination" hover-class="item-press" @click="pickLocation('to')">
          <view class="point-icon"><StitchIcon name="location_on" size="26rpx" /></view>
          <view class="point-copy">
            <text class="field-label cyan-text">{{ copy.destinationLabel }}</text>
            <text class="point-title">{{ draft.to ? locationTitle(draft.to) : copy.destinationTitle }}</text>
            <text v-if="draft.to" class="point-meta">{{ routeMeta }}</text>
            <text v-else class="point-meta">{{ copy.mapSelectHint }}</text>
          </view>
        </view>

        <view class="execution">
          <text class="field-label">{{ copy.executionWindow }}</text>
          <view class="mode-switch">
            <view :class="['mode-button', draft.timeMode === 'instant' ? 'active' : '']" @click="draft.timeMode = 'instant'">{{ copy.instant }}</view>
            <view :class="['mode-button', draft.timeMode === 'scheduled' ? 'active' : '']" @click="draft.timeMode = 'scheduled'">{{ copy.scheduled }}</view>
          </view>
          <picker v-if="draft.timeMode === 'scheduled'" mode="time" :value="draft.scheduledTime" @change="onScheduleChange">
            <view class="schedule-row" hover-class="item-press">
              <StitchIcon name="schedule" size="26rpx" />
              <text>{{ copy.scheduledAtLabel }}: {{ draft.scheduledTime }}</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="panel protect-panel">
        <view class="panel-head">
          <StitchIcon name="shield" size="34rpx" />
          <text>{{ copy.protectionTitle }}</text>
        </view>

        <view class="field-block">
          <text class="field-label">{{ copy.indemnity }}</text>
          <view :class="['cover-option', draft.insured ? 'active' : '']" hover-class="item-press" @click="draft.insured = true">
            <view class="radio"><view v-if="draft.insured" /></view>
            <view>
              <text class="cover-title">{{ copy.premiumTitle }}</text>
              <text class="cover-desc">{{ copy.premiumDesc }}</text>
            </view>
          </view>
          <view :class="['cover-option', !draft.insured ? 'active' : '']" hover-class="item-press" @click="draft.insured = false">
            <view class="radio"><view v-if="!draft.insured" /></view>
            <view>
              <text class="cover-title">{{ copy.standardTitle }}</text>
              <text class="cover-desc">{{ copy.standardDesc }}</text>
            </view>
          </view>
        </view>

        <view class="field-block">
          <text class="field-label">{{ copy.remarksLabel }}</text>
          <textarea v-model="draft.special" class="remarks" :placeholder="copy.remarksPlaceholder" />
        </view>
      </view>
    </view>

    <view class="mission-action-bar">
      <view class="total-block">
        <text class="total-label">{{ copy.totalLabel }}</text>
        <view class="total-value">
          <text class="currency">¥</text>
          <text class="amount">{{ estimateMain }}</text>
          <text class="decimal">{{ estimateDecimal }}</text>
        </view>
      </view>
      <view class="init-button" :class="{ loading }" hover-class="tap-press" @click="submit">
        <view class="init-copy">
          <text>{{ loading ? copy.processing : copy.initiate }}</text>
          <text v-if="!loading">{{ copy.mission }}</text>
        </view>
        <StitchIcon name="rocket_launch" size="26rpx" />
      </view>
    </view>
    <text v-if="error" class="error-toast">{{ error }}</text>
    <MapPointPicker
      :visible="mapPicker.visible"
      :title="mapPickerTitle"
      :subtitle="copy.mapPickerSubtitle"
      :initial="mapPickerInitial"
      :counterpart="mapPickerCounterpart"
      :counterpart-label="mapPickerCounterpartLabel"
      :confirm-text="copy.mapConfirm"
      :cancel-text="copy.mapCancel"
      :locale="localeStore.locale"
      @confirm="onMapConfirm"
      @cancel="closeMapPicker"
    />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import MapPointPicker from '@/components/MapPointPicker.vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { CargoType, PaymentMode, Role } from '@/models';
import type { GeoPoint, Order } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { findCommonRoutePreset } from '@/services/common-routes';
import { coordinateAddress, isCoordinateAddress, isGenericMapAddress, locationSuggestionLabel, resolveMapPoint, reverseGeocode } from '@/services/geocoding';
import type { LocationSuggestion } from '@/services/geocoding';
import { estimateDroneForWeight } from '@/services/order-estimate';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { distanceKm } from '@/utils/geo';
import { etaMinutes, priceOrder } from '@/utils/price';

const orderStore = useOrderStore();
const userStore = useUserStore();
const localeStore = useLocaleStore();
ensureRole(Role.Client);
const loading = ref(false);
const error = ref('');
const ERROR_TOAST_DURATION_MS = 3000;
let errorTimer: ReturnType<typeof setTimeout> | undefined;
let locatingOrigin = false;
const appliedPresetId = ref('');

const ORDER_COPY = {
  en: {
    brand: 'SKYLINK LOGISTICS',
    signalToast: 'Link signal nominal',
    languageToast: 'Switched to English',
    steps: ['Payload', 'Route', 'Protection', 'Budget'],
    payloadTitle: 'PAYLOAD SPECIFICATIONS',
    classification: 'CLASSIFICATION_TYPE',
    grossMass: 'GROSS_MASS',
    volume: 'VOLUMETRIC_CUBE',
    declaredValue: 'DECLARED_VALUE (CNY)',
    scheduledAtLabel: 'Scheduled at',
    cargoStandard: 'STANDARD',
    cargoOversized: 'OVERSIZED',
    cargoHazmat: 'HAZMAT',
    cargoClimate: 'CLIMATE',
    routeTitle: 'ROUTING VECTOR',
    originToast: 'Origin point locked',
    destinationToast: 'Select a target zone first',
    originFallbackTitle: 'Order origin',
    originPendingTitle: 'Loading point pending',
    originConcreteToast: 'Confirm a specific loading point first',
    locatingOriginToast: 'Locating origin...',
    locationFailedToast: 'Location unavailable',
    originLabel: 'ORIGIN_POINT',
    originTitle: 'Sector 4 Storage Facility',
    originMeta: 'LAT: 34.0522 N / LNG: 118.2437 W',
    destinationLabel: 'DESTINATION_POINT',
    destinationTitle: 'Select Target Zone...',
    mapSelectHint: 'Tap to pick on live map',
    mapPickerSubtitle: 'LIVE MAP PICKER',
    originMapTitle: 'Pick origin point',
    destinationMapTitle: 'Pick destination point',
    mapConfirm: 'Use this point',
    mapCancel: 'Cancel',
    mapResolveFailed: 'Choose a specific named place or entrance',
    originCounterpart: 'DEST',
    destinationCounterpart: 'ORIGIN',
    samePointError: 'Origin and destination must be different',
    executionWindow: 'EXECUTION_WINDOW',
    instant: 'IMMEDIATE',
    scheduled: 'SCHEDULED',
    protectionTitle: 'MISSION PARAMETERS & PROTECTION',
    indemnity: 'INDEMNITY_LEVEL',
    premiumTitle: 'Premium Coverage',
    premiumDesc: 'Full value protection + disruption compensation.',
    standardTitle: 'Standard Liability',
    standardDesc: 'Statutory limits apply. High risk.',
    remarksLabel: 'SPECIAL_DIRECTIVES / REMARKS',
    remarksPlaceholder: 'Enter specific handling instructions, access codes, or environmental requirements...',
    totalLabel: 'EST. TOTAL COMPUTATION',
    processing: 'PROCESSING',
    initiate: 'INITIATE',
    mission: 'MISSION',
    submitFallback: 'Premium coverage mission',
    routePresetApplied: 'Common route applied. Confirm payload and protection.',
    invoiceTitle: 'SkyLink Logistics',
    routeFrom: 'Sector 4 Storage Facility',
    routeTo: 'Select Target Zone',
    remark: 'Mission payload operation',
    error: 'Mission initiation failed',
  },
  zh: {
    brand: '天链物流',
    signalToast: '链路信号正常',
    languageToast: '已切换为中文',
    steps: ['货物参数', '航线规划', '保障预案', '预算结算'],
    payloadTitle: '吊运货物参数',
    classification: '货物类别',
    grossMass: '货物重量',
    volume: '体积尺寸',
    declaredValue: '申报价值 (CNY)',
    scheduledAtLabel: '预约时间',
    cargoStandard: '普货',
    cargoOversized: '大件',
    cargoHazmat: '危化',
    cargoClimate: '温控',
    routeTitle: '航线向量',
    originToast: '起点已锁定',
    destinationToast: '请先选择目标区域',
    originFallbackTitle: '订单起点',
    originPendingTitle: '装货点待确认',
    originConcreteToast: '请先确认具体装货点',
    locatingOriginToast: '正在定位起点...',
    locationFailedToast: '无法获取当前位置',
    originLabel: '起点坐标',
    originTitle: '4区仓储设施',
    originMeta: '纬度: 34.0522 N / 经度: 118.2437 W',
    destinationLabel: '目的地坐标',
    destinationTitle: '选择目标区域...',
    mapSelectHint: '在地图上选择装卸货地点',
    mapPickerSubtitle: '地图选点',
    originMapTitle: '选择起点位置',
    destinationMapTitle: '选择目的地位置',
    mapConfirm: '使用该点',
    mapCancel: '取消',
    mapResolveFailed: '请选择具体门店、楼栋或入口',
    originCounterpart: '终点',
    destinationCounterpart: '起点',
    samePointError: '起点和目的地不能重合',
    executionWindow: '执行时段',
    instant: '立即执行',
    scheduled: '预约执行',
    protectionTitle: '任务参数与保障',
    indemnity: '保障等级',
    premiumTitle: '高级保障',
    premiumDesc: '全额价值保障 + 延误补偿。',
    standardTitle: '标准责任',
    standardDesc: '按法定限额赔付，风险较高。',
    remarksLabel: '特殊要求 / 备注',
    remarksPlaceholder: '填写装卸要求、门禁信息或环境限制...',
    totalLabel: '预计合计',
    processing: '处理中',
    initiate: '发起',
    mission: '任务',
    submitFallback: '高级保障任务',
    routePresetApplied: '已套用常用航线，请继续确认货物和保障信息',
    invoiceTitle: '天链物流',
    routeFrom: '4区仓储设施',
    routeTo: '目标区域',
    remark: '吊运任务载荷作业',
    error: '任务发起失败',
  },
} as const;

const copy = computed(() => ORDER_COPY[localeStore.locale]);

const steps = computed(() => copy.value.steps.map((label, index) => ({ code: `0${index + 1}`, label })));

const cargoTypes = computed(() => [
  { label: copy.value.cargoStandard, value: CargoType.Normal, icon: 'box' },
  { label: copy.value.cargoOversized, value: CargoType.Valuable, icon: 'local_shipping' },
  { label: copy.value.cargoHazmat, value: CargoType.Dangerous, icon: 'science' },
  { label: copy.value.cargoClimate, value: CargoType.Agricultural, icon: 'ac_unit' },
]);

const DEFAULT_ROUTE_POINTS: GeoPoint[] = [
  { lng: 113.125213, lat: 23.020498, address: '普君新城华府2期 · 同济东路41号' },
  { lng: 113.13288, lat: 23.02296, address: '岭南天地东门临停点' },
];
const DEFAULT_ROUTE_OFFSET = {
  lng: DEFAULT_ROUTE_POINTS[1].lng - DEFAULT_ROUTE_POINTS[0].lng,
  lat: DEFAULT_ROUTE_POINTS[1].lat - DEFAULT_ROUTE_POINTS[0].lat,
};

const draft = reactive({
  cargoType: CargoType.Normal,
  weightKg: '8',
  volume: '0.50',
  valueYuan: '3000',
  timeMode: 'instant' as 'instant' | 'scheduled',
  scheduledTime: defaultScheduleTime(),
  insured: true,
  special: '',
  from: undefined as GeoPoint | undefined,
  to: undefined as GeoPoint | undefined,
});

const mapPicker = reactive({
  visible: false,
  field: 'to' as 'from' | 'to',
  initial: DEFAULT_ROUTE_POINTS[1],
});
const originMeta = computed(() => draft.from && hasConfirmedAddress(draft.from.address) ? `LNG ${draft.from.lng.toFixed(3)} / LAT ${draft.from.lat.toFixed(3)}` : '');
const routeMeta = computed(() => {
  if (!draft.from || !hasConfirmedAddress(draft.from.address) || !draft.to) return '';
  const km = distanceKm(draft.from, draft.to);
  return `LNG ${draft.to.lng.toFixed(3)} / LAT ${draft.to.lat.toFixed(3)} · ${km.toFixed(1)} km · ETA ${etaMinutes(km)} min`;
});
const mapPickerTitle = computed(() => mapPicker.field === 'from' ? copy.value.originMapTitle : copy.value.destinationMapTitle);
const mapPickerInitial = computed(() => mapPicker.initial);
const mapPickerCounterpart = computed(() => mapPicker.field === 'from' ? draft.to : draft.from);
const mapPickerCounterpartLabel = computed(() => mapPicker.field === 'from' ? copy.value.originCounterpart : copy.value.destinationCounterpart);

// 用在线运力中的最优设备做实时估价，与匹配阶段的计价口径一致
const estimateDrone = computed(() => {
  const weight = Number(draft.weightKg) || 8;
  return estimateDroneForWeight(weight);
});

const estimateCent = computed(() => {
  const drone = estimateDrone.value;
  if (!drone || !draft.from || !hasConfirmedAddress(draft.from.address)) return 0;
  const to = draft.to ?? estimatePlaceholderDestination(draft.from);
  const km = distanceKm(draft.from, to);
  const estimateOrder = {
    cargo: { type: draft.cargoType, weightKg: Number(draft.weightKg) || 8, valueCent: Math.max(0, Math.round(Number(draft.valueYuan || 0) * 100)), photos: [] },
    needs: { insurance: draft.insured, shockProof: true, tempControl: draft.cargoType === CargoType.Agricultural },
    scheduledAt: draft.timeMode === 'scheduled' ? scheduledAtIso() : undefined,
    from: draft.from,
    to,
  } as unknown as Order;
  return priceOrder(estimateOrder, drone, etaMinutes(km), km).totalCent;
});

const estimateMain = computed(() => Math.floor(estimateCent.value / 100).toLocaleString('en-US'));
const estimateDecimal = computed(() => `.${String(estimateCent.value % 100).padStart(2, '0')}`);

function defaultScheduleTime() {
  const date = new Date(Date.now() + 2 * 3600 * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function scheduledAtIso() {
  const [hours, minutes] = draft.scheduledTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  if (date.getTime() < Date.now()) date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function onScheduleChange(event: { detail: { value: string } }) {
  draft.scheduledTime = event.detail.value;
}

onLoad((query: Record<string, string | undefined> = {}) => {
  applyRoutePreset(query.preset);
});

function applyRoutePreset(presetId: string | undefined) {
  const preset = findCommonRoutePreset(presetId);
  if (!preset) return;
  appliedPresetId.value = preset.id;
  draft.cargoType = preset.cargoType;
  draft.weightKg = String(preset.weightKg);
  draft.volume = preset.volume;
  draft.valueYuan = String(preset.valueYuan);
  draft.insured = preset.insured;
  draft.special = preset.labels[localeStore.locale].special;
  draft.from = { ...preset.from };
  draft.to = { ...preset.to };
}

function pickLocation(field: 'from' | 'to', options: { preserveError?: boolean } = {}) {
  if (!options.preserveError) clearError();
  if (field === 'to' && locatingOrigin) {
    showError(copy.value.locatingOriginToast);
    return;
  }
  if (field === 'to' && (!draft.from || !hasConfirmedAddress(draft.from.address))) {
    showError(copy.value.originConcreteToast);
    pickLocation('from', { preserveError: true });
    return;
  }
  if (isH5Runtime()) {
    openMapPicker(field);
    return;
  }
  openNativeLocationPicker(field);
}

function openNativeLocationPicker(field: 'from' | 'to') {
  const current = currentPointFor(field);
  if (typeof uni.chooseLocation !== 'function') {
    openMapPicker(field);
    return;
  }
  uni.chooseLocation({
    latitude: current.lat,
    longitude: current.lng,
    success: (result: any) => {
      const lat = Number(result.latitude);
      const lng = Number(result.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        openMapPicker(field);
        return;
      }
      void resolveNativePickedLocation(field, {
        lat,
        lng,
        address: nativeLocationAddress(result.name, result.address),
      });
    },
    fail: (err?: { errMsg?: string }) => {
      // 用户主动取消时直接退出；只有真正失败（无 key/加载异常）才落兜底选点
      if (err?.errMsg?.includes('cancel')) return;
      openMapPicker(field);
    },
  });
}

function openMapPicker(field: 'from' | 'to') {
  mapPicker.field = field;
  mapPicker.initial = { ...currentPointFor(field) };
  mapPicker.visible = true;
}

function closeMapPicker() {
  mapPicker.visible = false;
}

function onMapConfirm(point: GeoPoint) {
  if (!applyLocation(mapPicker.field, point)) return;
  closeMapPicker();
}

async function resolveNativePickedLocation(field: 'from' | 'to', point: GeoPoint) {
  if (readableAddress(point.address)) {
    applyLocation(field, point);
    return;
  }
  const resolved = await resolveMapPoint(point, localeStore.locale);
  const best = resolved.suggestions[0];
  const picked = pointFromSuggestion(best) ?? point;
  const address = resolved.address ?? locationSuggestionLabel(best, localeStore.locale);
  if (!readableAddress(address)) {
    showError(copy.value.mapResolveFailed);
    openMapPicker(field);
    return;
  }
  applyLocation(field, { ...picked, address });
}

function applyLocation(field: 'from' | 'to', point: GeoPoint) {
  const picked = { ...point, address: readableAddress(point.address) ? point.address : formatPickedAddress(point) };
  if (field === 'to') {
    const from = draft.from;
    if (!from || !hasConfirmedAddress(from.address)) {
      showError(copy.value.originConcreteToast);
      return false;
    }
    if (distanceKm(from, picked) < 0.05) {
      showError(copy.value.samePointError);
      return false;
    }
  }
  if (field === 'from') {
    if (draft.to && distanceKm(picked, draft.to) < 0.05) {
      showError(copy.value.samePointError);
      return false;
    }
    draft.from = picked;
  } else {
    draft.to = picked;
  }
  return true;
}

function currentPointFor(field: 'from' | 'to') {
  if (field === 'from') return draft.from ?? DEFAULT_ROUTE_POINTS[0];
  return draft.to ?? draft.from ?? DEFAULT_ROUTE_POINTS[1];
}

function estimatePlaceholderDestination(from: GeoPoint): GeoPoint {
  if (distanceKm(from, DEFAULT_ROUTE_POINTS[0]) < 0.05) return DEFAULT_ROUTE_POINTS[1];
  return {
    lng: roundCoord(from.lng + DEFAULT_ROUTE_OFFSET.lng),
    lat: roundCoord(from.lat + DEFAULT_ROUTE_OFFSET.lat),
    address: copy.value.routeTo,
  };
}

function roundCoord(value: number) {
  return Number(value.toFixed(6));
}

function formatPickedAddress(point: Pick<GeoPoint, 'lat' | 'lng'>) {
  return coordinateAddress(point, localeStore.locale);
}

function nativeLocationAddress(name: unknown, address: unknown) {
  return [name, address]
    .map((value) => typeof value === 'string' ? value.trim() : '')
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(localeStore.isZh ? ' · ' : ', ');
}

function pointFromSuggestion(suggestion: LocationSuggestion | undefined): GeoPoint | undefined {
  return suggestion?.entrance ?? suggestion?.location;
}

function locationTitle(point: GeoPoint | undefined) {
  if (!point) return '';
  if (isPendingLocationAddress(point.address)) return point.address;
  if (!point.address) return '';
  return readableAddress(point.address) ? point.address : formatPickedAddress(point);
}

function readableAddress(address: string | undefined) {
  return Boolean(address && !isGenericMapAddress(address) && !isCoordinateAddress(address));
}

function isPendingLocationAddress(address: string | undefined) {
  const value = address?.trim();
  return value === ORDER_COPY.zh.originPendingTitle || value === ORDER_COPY.en.originPendingTitle;
}

function hasConfirmedAddress(address: string | undefined) {
  return readableAddress(address) && !isPendingLocationAddress(address);
}

function isH5Runtime() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function toast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function showError(message: string) {
  if (errorTimer) clearTimeout(errorTimer);
  error.value = message;
  errorTimer = setTimeout(() => {
    if (error.value === message) error.value = '';
    errorTimer = undefined;
  }, ERROR_TOAST_DURATION_MS);
}

function clearError() {
  if (errorTimer) {
    clearTimeout(errorTimer);
    errorTimer = undefined;
  }
  error.value = '';
}

async function locateOrigin() {
  if (locatingOrigin) return;
  locatingOrigin = true;
  const point = await getCurrentGeoPoint();
  if (!point) {
    locatingOrigin = false;
    showError(copy.value.locationFailedToast);
    return;
  }
  draft.from = {
    ...point,
    address: await resolveLocatedOriginAddress(point),
  };
  locatingOrigin = false;
}

async function resolveLocatedOriginAddress(point: GeoPoint) {
  const resolved = await reverseGeocode(point, localeStore.locale);
  if (readableAddress(resolved)) return resolved;
  return '';
}

function getCurrentGeoPoint(): Promise<GeoPoint | undefined> {
  return new Promise((resolve) => {
    const finish = (point: GeoPoint | undefined) => resolve(point);
    if (typeof uni !== 'undefined' && typeof uni.getLocation === 'function') {
      uni.getLocation({
        type: 'gcj02',
        success: (result: any) => finish(normalizeLocationResult(result.latitude, result.longitude)),
        fail: () => requestBrowserGeoPoint().then(finish),
      } as any);
      return;
    }
    requestBrowserGeoPoint().then(finish);
  });
}

function requestBrowserGeoPoint(): Promise<GeoPoint | undefined> {
  return new Promise((resolve) => {
    const browserNavigator = isH5Runtime() ? window.navigator : undefined;
    if (!browserNavigator?.geolocation) {
      resolve(undefined);
      return;
    }
    browserNavigator.geolocation.getCurrentPosition(
      (position) => resolve(normalizeLocationResult(position.coords.latitude, position.coords.longitude)),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

function normalizeLocationResult(latitude: unknown, longitude: unknown): GeoPoint | undefined {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

function toggleLocale() {
  localeStore.toggleLocale();
  toast(copy.value.languageToast);
}

function back() {
  goClientHome();
}

function goClientHome() {
  uni.reLaunch({ url: '/pages-client/home/index' });
}

async function submit() {
  if (loading.value) return;
  const from = draft.from;
  if (!from || !hasConfirmedAddress(from.address)) {
    showError(copy.value.originConcreteToast);
    pickLocation('from', { preserveError: true });
    return;
  }
  if (!draft.to) {
    showError(copy.value.destinationToast);
    pickLocation('to', { preserveError: true });
    return;
  }
  loading.value = true;
  clearError();
  try {
    if (!userStore.hasActiveRole(Role.Client)) throw new Error('当前账号没有业主发单权限');
    const user = userStore.user;
    // 预算给实时估价留 10% 余量，保证匹配阶段报价不超预算
    const budgetCent = Math.max(Math.round(estimateCent.value * 1.1), 10000);
    await orderStore.createOrderDraftWithBackend({
      clientId: user.id,
      cargoType: draft.cargoType,
      weightKg: Number(draft.weightKg || 0) || 8,
      volume: `${draft.volume || '0.00'}m³`,
      valueCent: Math.max(0, Math.round(Number(draft.valueYuan || 0) * 100)),
      budgetCent,
      insured: draft.insured,
      shockProof: true,
      tempControl: draft.cargoType === CargoType.Agricultural,
      special: draft.special || (draft.insured ? copy.value.submitFallback : copy.value.standardTitle),
      timeMode: draft.timeMode,
      scheduledAt: draft.timeMode === 'scheduled' ? scheduledAtIso() : undefined,
      paymentMode: PaymentMode.Escrow,
      invoiceTitle: copy.value.invoiceTitle,
      from,
      to: draft.to,
      remark: copy.value.remark,
    });
    uni.navigateTo({ url: '/pages-client/match/index' });
  } catch (e) {
    showError(e instanceof Error ? e.message : copy.value.error);
  } finally {
    loading.value = false;
  }
}

onBeforeUnmount(() => {
  if (errorTimer) clearTimeout(errorTimer);
});

onMounted(() => {
  if (appliedPresetId.value) {
    toast(copy.value.routePresetApplied);
    return;
  }
  toast(copy.value.locatingOriginToast);
  void locateOrigin().catch(() => {
    locatingOrigin = false;
    showError(copy.value.locationFailedToast);
  });
});
</script>

<style lang="scss" scoped>
.mission-page {
  min-height: 100vh;
  color: #dfe2f0;
  background-color: #0b0e14;
  background-image:
    linear-gradient(0deg, rgba(58, 73, 75, .10) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(58, 73, 75, .10) 1rpx, transparent 1rpx);
  background-size: 46rpx 46rpx;
  padding-bottom: 176rpx;
  box-sizing: border-box;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.mission-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 120rpx;
  padding: 0 27rpx;
  border-bottom: 2rpx solid #3a494b;
  background: rgba(11, 14, 20, .94);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.top-left,
.icon-button,
.panel-head,
.type-button,
.point-card,
.mission-action-bar,
.init-button,
.total-value {
  display: flex;
  align-items: center;
}

.top-left {
  gap: 27rpx;
  min-width: 0;
}

.icon-button {
  width: 52rpx;
  height: 52rpx;
  justify-content: center;
  color: #e1fdff;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 15rpx;
  flex: 0 0 auto;
}

.language-switch {
  min-width: 81rpx;
  height: 52rpx;
  padding: 0 15rpx;
  border: 2rpx solid #3a494b;
  border-radius: 8rpx;
  background: rgba(49, 53, 64, .72);
  color: #00f2ff;
  font-size: 19rpx;
  line-height: 52rpx;
  font-family: "JetBrains Mono", "PingFang SC", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.brand-title {
  color: #00f2ff;
  font-size: 37rpx;
  line-height: 52rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand-title {
  font-size: 38rpx;
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  font-weight: 700;
}

.zh-copy .panel-head,
.zh-copy .field-label,
.zh-copy .type-button,
.zh-copy .mode-button,
.zh-copy .cover-desc,
.zh-copy .remarks,
.zh-copy .total-label,
.zh-copy .init-button,
.zh-copy .language-switch {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
}

.zh-copy .field-label,
.zh-copy .type-button,
.zh-copy .mode-button,
.zh-copy .total-label,
.zh-copy .init-button {
  font-weight: 700;
}

.zh-copy .field-label {
  font-size: 18rpx;
  line-height: 30rpx;
}

.mission-main {
  padding: 220rpx 27rpx 0;
}

.step-track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 90rpx;
}

.step-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 17rpx;
  min-width: 0;
}

.step-node::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 30rpx;
  width: 100%;
  border-top: 2rpx dashed #3a494b;
  z-index: 0;
}

.step-node:last-child::after {
  display: none;
}

.step-dot {
  position: relative;
  z-index: 1;
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  border: 3rpx solid #3a494b;
  background: #0b0e14;
  color: #3a494b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 19rpx;
  font-weight: 700;
}

.step-node.active .step-dot {
  background: #1b1f2a;
  border-color: #00f2ff;
  box-shadow: 0 0 23rpx rgba(0, 242, 255, .40);
}

.inner-dot {
  width: 19rpx;
  height: 19rpx;
  border-radius: 50%;
  background: #00f2ff;
  box-shadow: 0 0 12rpx #00f2ff;
}

.step-node > text {
  color: #b9cacb;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.step-node.active > text {
  color: #00f2ff;
}

.panel {
  position: relative;
  overflow: hidden;
  margin-top: 38rpx;
  padding: 38rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #0f131d;
  box-sizing: border-box;
}

.panel:first-of-type {
  margin-top: 0;
}

.corner-accent {
  position: absolute;
  top: 0;
  right: 0;
  width: 123rpx;
  height: 123rpx;
  background: linear-gradient(225deg, rgba(0, 242, 255, .12), transparent 62%);
}

.corner-accent::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 31rpx;
  height: 31rpx;
  border-top: 4rpx solid rgba(0, 242, 255, .55);
  border-right: 4rpx solid rgba(0, 242, 255, .55);
}

.panel-head {
  gap: 19rpx;
  padding-bottom: 27rpx;
  margin-bottom: 38rpx;
  border-bottom: 2rpx solid #3a494b;
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 38rpx;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-weight: 700;
  text-transform: uppercase;
}

.route-panel .panel-head {
  margin-bottom: 70rpx;
}

.panel-head :deep(.wd-icon),
.panel-head :deep(.stitch-icon) {
  color: #00f2ff;
}

.protect-panel .panel-head :deep(.wd-icon),
.protect-panel .panel-head :deep(.stitch-icon) {
  color: #f59e0b;
}

.field-block {
  margin-top: 38rpx;
}

.field-block:first-of-type {
  margin-top: 0;
}

.payload-panel .field-block {
  margin-top: 77rpx;
}

.payload-panel .field-block:first-of-type {
  margin-top: 0;
}

.field-label {
  display: block;
  color: #b9cacb;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.type-grid {
  margin-top: 19rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 19rpx;
}

.type-button {
  min-height: 104rpx;
  justify-content: center;
  flex-direction: column;
  gap: 8rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  color: #b9cacb;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.type-button.active {
  color: #0b0e14;
  background: #00f2ff;
  border-color: #00f2ff;
  box-shadow: 0 0 15rpx rgba(0, 242, 255, .24);
}

.input-row {
  min-height: 81rpx;
  margin-top: 15rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  overflow: hidden;
}

.mission-input {
  flex: 1;
  min-width: 0;
  height: 81rpx;
  padding: 0 23rpx;
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 38rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

.unit-cell,
.currency-cell {
  width: 81rpx;
  height: 81rpx;
  border-left: 2rpx solid #3a494b;
  background: #313540;
  color: #00f2ff;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.currency-cell {
  width: 73rpx;
  border-left: 0;
  background: transparent;
  color: #849495;
  font-size: 27rpx;
}

.value-row .mission-input {
  padding-left: 0;
}

.route-panel {
  min-height: 880rpx;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(59, 130, 246, .12), transparent 54%),
    rgba(15, 19, 29, .92);
}

.point-card {
  align-items: flex-start;
  gap: 23rpx;
  min-height: 210rpx;
  padding: 23rpx;
  border: 2rpx solid #3a494b;
  border-radius: 8rpx;
  background: rgba(11, 14, 20, .90);
  box-sizing: border-box;
}

.point-card.destination {
  min-height: 154rpx;
}

.point-icon {
  width: 54rpx;
  height: 54rpx;
  margin-top: 4rpx;
  border-radius: 50%;
  border: 2rpx solid #3a494b;
  background: #313540;
  color: #b9cacb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 54rpx;
}

.destination .point-icon {
  border-color: rgba(0, 242, 255, .50);
  background: rgba(0, 242, 255, .18);
  color: #00f2ff;
  box-shadow: 0 0 15rpx rgba(0, 242, 255, .20);
}

.point-copy {
  min-width: 0;
  flex: 1;
}

.point-title {
  display: block;
  margin-top: 4rpx;
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 38rpx;
  font-weight: 600;
  @include ellipsis(1);
}

.point-meta {
  display: block;
  margin-top: 4rpx;
  color: #849495;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

.cyan-text {
  color: #00f2ff;
}

.vector-line {
  position: relative;
  height: 92rpx;
  margin-left: 50rpx;
  color: #3a494b;
  display: flex;
  align-items: center;
}

.vector-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2rpx;
  background: linear-gradient(180deg, #3b82f6, #00f2ff);
}

.execution {
  margin-top: auto;
  padding-top: 27rpx;
  border-top: 2rpx solid rgba(58, 73, 75, .50);
}

.mode-switch {
  margin-top: 19rpx;
  padding: 8rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.schedule-row {
  margin-top: 19rpx;
  min-height: 58rpx;
  padding: 0 19rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  color: #dfe2f0;
  font-size: 21rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  display: flex;
  align-items: center;
  gap: 12rpx;
  box-sizing: border-box;
}

.mode-button {
  min-height: 58rpx;
  color: #b9cacb;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-button.active {
  color: #dfe2f0;
  background: #313540;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, .20);
}

.cover-option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 23rpx;
  min-height: 112rpx;
  margin-top: 19rpx;
  padding: 23rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  box-sizing: border-box;
}

.cover-option.active {
  border-color: #00f2ff;
  background: rgba(0, 242, 255, .05);
}

.cover-option.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  background: #00f2ff;
}

.radio {
  width: 31rpx;
  height: 31rpx;
  margin-top: 4rpx;
  border-radius: 50%;
  border: 3rpx solid #3a494b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 31rpx;
}

.cover-option.active .radio {
  border-color: #00f2ff;
}

.radio view {
  width: 15rpx;
  height: 15rpx;
  border-radius: 50%;
  background: #00f2ff;
}

.cover-title {
  display: block;
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 38rpx;
  font-weight: 500;
}

.cover-desc {
  display: block;
  margin-top: 4rpx;
  color: #b9cacb;
  font-size: 19rpx;
  line-height: 27rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.remarks {
  width: 100%;
  min-height: 112rpx;
  margin-top: 19rpx;
  padding: 23rpx;
  border: 2rpx solid #3a494b;
  background: #0b0e14;
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 38rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  box-sizing: border-box;
}

.mission-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  min-height: 214rpx;
  padding: 15rpx 27rpx calc(15rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid #3a494b;
  background: rgba(15, 19, 29, .94);
  box-shadow: 0 -15rpx 58rpx rgba(0, 0, 0, .50);
  justify-content: space-between;
  gap: 19rpx;
  box-sizing: border-box;
}

.total-block {
  min-width: 0;
}

.total-label {
  display: block;
  color: #b9cacb;
  font-size: 19rpx;
  line-height: 23rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
}

.total-value {
  gap: 4rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}

.currency,
.decimal {
  color: #849495;
  font-size: 27rpx;
  line-height: 38rpx;
}

.amount {
  color: #00f2ff;
  font-size: 92rpx;
  line-height: 100rpx;
  font-weight: 700;
}

.init-button {
  position: relative;
  width: 438rpx;
  min-height: 123rpx;
  justify-content: center;
  color: #0b0e14;
  background: #00f2ff;
  box-shadow: 0 0 31rpx rgba(0, 242, 255, .40);
  font-size: 19rpx;
  line-height: 24rpx;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  text-align: center;
}

.init-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.init-button :deep(.wd-icon),
.init-button :deep(.stitch-icon) {
  position: absolute;
  right: 72rpx;
}

.init-button.loading {
  opacity: .7;
}

.tap-press,
.item-press {
  opacity: .84;
  transform: scale(.98);
}

.error-toast {
  position: fixed;
  left: 27rpx;
  right: 27rpx;
  bottom: 128rpx;
  z-index: 70;
  padding: 15rpx 23rpx;
  border-radius: 8rpx;
  background: rgba(147, 0, 10, .92);
  color: #ffdad6;
  font-size: 23rpx;
  line-height: 31rpx;
}
</style>
