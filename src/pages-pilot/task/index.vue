<template>
  <view class="mission-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="mission-header">
      <navigator class="header-icon" url="/pages-pilot/home/index" open-type="reLaunch" hover-class="tap-press" aria-label="返回飞手首页">
        <StitchIcon name="arrow_back" size="46rpx" />
      </navigator>
      <text class="mission-title">{{ missionTitle }}</text>
      <view class="header-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="header-icon more-button" hover-class="tap-press" @click="showEvents">
          <StitchIcon name="more_vert" size="46rpx" />
        </view>
      </view>
    </view>

    <view class="route-map-shell">
      <LiveRouteMap
        v-if="order"
        class="pilot-route-map"
        :from="order.from"
        :to="order.to"
        :frame="mapFrame"
        :craft-tag="craftTag"
        :locale="localeStore.locale"
        :live="order.status === OrderStatus.InFlight"
        :gps-status="routeMapGpsStatus"
      />
      <view v-else class="empty-route-map">
        <StitchIcon name="route" size="54rpx" />
        <text>{{ copy.noMissionNext }}</text>
      </view>
      <view :class="['tracking-pill', alerts.length ? 'alert' : '']">
        <view class="tracking-dot" />
        <text>{{ trackingStatusLabel }}</text>
      </view>
    </view>

    <view v-if="cockpitNotice" class="notice-strip">
      <text>{{ cockpitNotice }}</text>
    </view>

    <view class="mission-content">
      <view :class="['mission-status', missionStatusTone]">
        <view class="status-ring">
          <StitchIcon name="check_circle" size="39rpx" fill />
        </view>
        <text>{{ missionStatusLabel }}</text>
      </view>

      <view class="route-progress-panel">
        <view class="route-progress-head">
          <text>{{ copy.routeProgress }}</text>
          <text>{{ routeProgressText }}</text>
        </view>
        <view class="route-progress-track">
          <view class="route-progress-fill" :style="{ width: routeProgressText }" />
        </view>
        <view class="route-progress-metrics">
          <view>
            <text>{{ copy.flownDistance }}</text>
            <text>{{ flownDistanceText }}</text>
          </view>
          <view>
            <text>{{ positionMetricLabel }}</text>
            <text>{{ currentPositionText }}</text>
          </view>
        </view>
        <view class="route-stage-copy">
          <text>{{ copy.currentStage }}：{{ action.stage }}</text>
          <text>{{ copy.nextStep }}：{{ action.next }}</text>
        </view>
      </view>

      <view class="check-panel">
        <view class="panel-heading">
          <StitchIcon name="checklist" size="31rpx" />
          <text>{{ copy.preflightChecklist }}</text>
        </view>
        <view class="check-list">
          <view
            v-for="item in checklistRows"
            :key="item.key"
            :class="['check-row', { disabled: item.disabled }]"
            hover-class="tap-press"
            @click="toggleChecklist(item.key)"
          >
            <text>{{ checklistLabel(item.key) }}</text>
            <StitchIcon v-if="item.done" name="done" size="43rpx" />
          </view>
        </view>
      </view>

      <view class="telemetry-grid">
        <view v-for="g in telemetryCards" :key="g.label" :class="['telemetry-card', g.tone]">
          <text class="telemetry-label">{{ g.label }}</text>
          <view class="telemetry-value">
            <text class="value-main">{{ g.value }}</text>
            <text class="value-unit">{{ g.unit }}</text>
          </view>
          <view v-if="g.kind !== 'yaw'" class="metric-track">
            <view class="metric-fill" :style="{ width: g.pct + '%' }" />
          </view>
          <view v-else class="yaw-scale">
            <view class="yaw-tick" />
            <view class="yaw-tick active" />
            <view class="yaw-tick" />
          </view>
        </view>
      </view>
    </view>

    <view class="cockpit-bar">
      <view class="bar-btn ghost" hover-class="tap-press" @click="showEmergencySheet = true">
        <StitchIcon name="assignment_turned_in" size="38rpx" />
        <text>{{ copy.disposalInst }}</text>
      </view>
      <view class="bar-btn primary" :class="{ disabled: primaryDisabled }" hover-class="tap-press" @click="advance">
        <StitchIcon name="receipt_long" size="39rpx" />
        <text>{{ orderStore.loading ? copy.processing : primaryActionLabel }}</text>
      </view>
    </view>

    <view v-if="showEmergencySheet" class="sheet-mask" @click="showEmergencySheet = false">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ hasExecutableDisposal ? copy.flightDisposal : copy.disposalNote }}</text>
          <view class="sheet-close" hover-class="hud-btn--press" @click="showEmergencySheet = false"><StitchIcon name="close" size="28rpx" /></view>
        </view>
        <view v-if="!hasExecutableDisposal" class="sheet-closed">
          <view class="closed-icon"><StitchIcon name="info" size="34rpx" /></view>
          <text class="closed-title">{{ copy.disposalUnavailable }}</text>
          <text class="closed-desc">{{ disposalClosedReason }}</text>
          <view class="closed-actions">
            <view v-if="order?.status === OrderStatus.Settled" class="primary-button closed-btn" hover-class="bar-btn--press" @click="openWalletFromSheet">{{ copy.viewWallet }}</view>
            <view class="secondary-button closed-btn" hover-class="bar-btn--press" @click="showEmergencySheet = false">{{ copy.gotIt }}</view>
          </view>
        </view>
        <template v-else>
          <view
            v-for="act in emergencyActions"
            :key="act.key"
            :class="['sheet-row', { disabled: act.disabled }]"
            @click="handleEmergencySelect({ item: act }); showEmergencySheet = false"
          >
            <view class="sheet-copy">
              <text class="sheet-name">{{ act.name }}</text>
              <text class="sheet-sub">{{ act.subname }}</text>
            </view>
            <StitchIcon name="arrow_forward" size="26rpx" />
          </view>
        </template>
      </view>
    </view>

    <view v-if="showEventsSheet" class="sheet-mask" @click="showEventsSheet = false">
      <view class="sheet events-sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ copy.eventsTitle }}</text>
          <view class="sheet-close" hover-class="hud-btn--press" @click="showEventsSheet = false"><StitchIcon name="close" size="28rpx" /></view>
        </view>
        <view v-if="!eventRows.length" class="sheet-closed compact">
          <view class="closed-icon"><StitchIcon name="info" size="34rpx" /></view>
          <text class="closed-title">{{ copy.noEvents }}</text>
        </view>
        <view v-else class="event-list">
          <view v-for="event in eventRows" :key="event.key" class="event-row">
            <text class="event-time">{{ event.time }}</text>
            <view class="event-copy">
              <text class="event-status">{{ event.status }}</text>
              <text class="event-note">{{ event.note }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import LiveRouteMap from '@/components/LiveRouteMap.vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { isProductionBackendRequired } from '@/api/backend';
import { AuditAction, OrderStatus, Role } from '@/models';
import type { GeoPoint, Order, Telemetry } from '@/models';
import { canTriggerEmergency, emergencyClosedReason } from '@/services/action-plans';
import { ensureRole } from '@/services/auth-guard';
import { orderRequiresPilotQualification, pilotQualificationIssue } from '@/services/compliance';
import { demoBatteryPct } from '@/services/device-status';
import { orderStatusLabel } from '@/services/display-labels';
import { currentPilotOrder, recordAudit } from '@/services/app-flow';
import { isCoordinateAddress, isGenericMapAddress } from '@/services/geocoding';
import { taskActionForStatus } from '@/services/task-guidance';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { useTelemetryStore } from '@/stores/telemetry';
import { useUserStore } from '@/stores/user';
import { bearing, distanceKm, lerp, routeProgressRatio } from '@/utils/geo';
import { transition } from '@/utils/order-machine';
import { repo } from '@/utils/repo';
import { displayTelemetryAlert } from '@/utils/telemetry-alerts';

const orderStore = useOrderStore();
const telemetryStore = useTelemetryStore();
const localeStore = useLocaleStore();
const userStore = useUserStore();
const productionRuntime = isProductionBackendRequired();
const error = ref('');
const feedback = ref('');
const showEmergencySheet = ref(false);
const showEventsSheet = ref(false);

ensureRole(Role.Pilot);

const TASK_COPY = {
  en: {
    titlePrefix: 'MISSION ',
    eventsTitle: 'Mission Events',
    noEvents: 'No mission events yet',
    alert: 'ALERT',
    tracking: 'TRACKING',
    waitingTakeoff: 'STANDBY',
    waitingAirspace: 'AIRSPACE REVIEW',
    airspaceApproved: 'AIRSPACE APPROVED',
    arrived: 'ARRIVED',
    preflightChecklist: 'PRE-FLIGHT CHECKLIST',
    routeProgress: 'ROUTE PROGRESS',
    flownDistance: 'Flown',
    livePosition: 'Live Position',
    taskPosition: 'Task Position',
    loadingPoint: 'Loading point',
    deliveryPoint: 'Delivery point',
    pointPending: 'pending',
    enRoutePosition: 'En route',
    loadingPointRequiredAction: 'Loading point pending',
    deliveryPointRequiredAction: 'Delivery point pending',
    loadingPointRequired: 'Loading point is not confirmed. Ask the owner to confirm the loading address before airspace application or takeoff.',
    deliveryPointRequired: 'Delivery point is not confirmed. Ask the owner to confirm the delivery address before airspace application or takeoff.',
    qualificationBlockedAction: 'Qualification blocked',
    currentStage: 'Current',
    nextStep: 'Next',
    systemsCalibration: 'Systems Calibration',
    payloadSecure: 'Payload Secure',
    airspaceClearance: 'Airspace Clearance',
    disposalInst: 'DISPOSAL INST.',
    processing: 'PROCESSING...',
    missionAlert: 'MISSION ALERT',
    missionSettled: 'MISSION SETTLED',
    viewSettlement: 'VIEW SETTLEMENT',
    noMissionStage: 'Pending',
    noMissionNext: 'No mission. Return to task list.',
    returnTaskList: 'Return to Task List',
    altitude: 'ALTITUDE',
    speed: 'SPEED',
    battery: 'BATTERY',
    yawDev: 'YAW (DEV)',
    flightDisposal: 'Flight Disposal',
    disposalNote: 'Disposal Note',
    disposalUnavailable: 'Flight disposal is unavailable now',
    viewWallet: 'View Wallet',
    gotIt: 'Got it',
    noTaskDisposal: 'No active flight mission. Return, landing, low-battery and emergency actions open after entering a task.',
    settledDisposal: 'This order has settled. Flight disposal is closed; use insurance or support for disputes, and check earnings in wallet.',
    completedDisposal: 'Mission completed. Return, landing and low-battery actions are closed; use insurance for cargo damage.',
    currentStageUnavailable: 'No executable flight disposal at this stage. Use the primary stage action first.',
    returnHome: 'Return',
    returnHomeSub: 'Record return command',
    landing: 'Landing',
    landingSub: 'Record nearest landing command',
    lowBattery: 'Low Battery',
    lowBatterySub: 'Inject 30% battery alert',
    emergency: 'Emergency',
    emergencySub: 'Enter exception flow',
    unavailableFlightSub: 'Flight disposal unavailable at this stage',
    lowBatteryUnavailable: 'Available after entering in-flight status',
    disabledAction: 'This action is unavailable at the current stage.',
    settledWalletNotice: 'Opened pilot wallet for this order split.',
    returnedToHall: 'Returned to task hall for more missions.',
    unchanged: 'Status did not change. Review the stage note and try again.',
    enteredStagePrefix: 'Entered ',
    taskCompletedNotice: 'Mission completed',
    settlementGeneratedNotice: 'Settlement generated',
    advanceFailed: 'Failed to advance task flow',
    lowBatteryInjected: 'Low battery alert injected; battery is now 30%.',
    lowBatteryNoTelemetry: 'No mission telemetry yet. Low-battery alert can be injected after in-flight status.',
    unloadingNotArrived: 'Not at destination',
    destinationFenceRequired: 'Confirm unloading after entering the destination 200m geofence',
    criticalBatteryBlock: 'Battery is depleted. Use disposal command for nearest landing or ground recovery.',
    returnRecorded: 'Return command recorded. Production can connect to the drone SDK for auto-return.',
    landRecorded: 'Landing command recorded. Production can connect to the drone SDK for nearest landing.',
    emergencyForbidden: 'Emergency handling is unavailable in the current status.',
    exceptionNote: 'Pilot triggered emergency',
    exceptionDone: 'Order moved to exception status; owner and admin views can sync it.',
    illegalTransition: 'Emergency handling is unavailable at this stage. Review the stage note or contact support.',
    emergencyFailed: 'Emergency handling failed. Contact support.',
    languageToast: 'Switched to English',
  },
  zh: {
    titlePrefix: '任务 ',
    eventsTitle: '任务事件',
    noEvents: '暂无任务事件',
    alert: '告警',
    tracking: '追踪中',
    waitingTakeoff: '待起飞',
    waitingAirspace: '待空域审批',
    airspaceApproved: '空域已批准',
    arrived: '已到达',
    preflightChecklist: '起飞前检查',
    routeProgress: '航线进度',
    flownDistance: '已飞 / 总距',
    livePosition: '实时位置',
    taskPosition: '任务位置',
    loadingPoint: '装货点',
    deliveryPoint: '卸货点',
    pointPending: '待确认',
    enRoutePosition: '航线中',
    loadingPointRequiredAction: '装货点待确认',
    deliveryPointRequiredAction: '卸货点待确认',
    loadingPointRequired: '装货点尚未确认，请先让业主确认装货地址后再申请空域或起飞。',
    deliveryPointRequired: '卸货点尚未确认，请先让业主确认卸货地址后再申请空域或起飞。',
    qualificationBlockedAction: '资质待补',
    currentStage: '当前阶段',
    nextStep: '下一步',
    systemsCalibration: '系统校准',
    payloadSecure: '载荷确认',
    airspaceClearance: '空域放行',
    disposalInst: '处置指令',
    processing: '处理中...',
    missionAlert: '任务告警',
    missionSettled: '任务已确认',
    viewSettlement: '查看结算',
    noMissionStage: '待处理',
    noMissionNext: '暂无任务，请返回任务列表。',
    returnTaskList: '返回任务列表',
    altitude: '高度',
    speed: '速度',
    battery: '电量',
    yawDev: '偏航',
    flightDisposal: '飞行处置',
    disposalNote: '处置说明',
    disposalUnavailable: '当前阶段不开放飞行处置',
    viewWallet: '查看钱包',
    gotIt: '知道了',
    noTaskDisposal: '暂无飞行任务，进入任务后才会开放返航、降落、低电量和应急处置。',
    settledDisposal: '本单已结算，飞行处置已关闭；如有纠纷请走理赔或客服，收益可在钱包查看。',
    completedDisposal: '任务已完成，返航、降落和低电量处置已关闭；如有货损请走理赔。',
    currentStageUnavailable: '当前阶段暂无可执行飞行处置，请按阶段主按钮推进任务。',
    returnHome: '返航',
    returnHomeSub: '记录返航指令',
    landing: '降落',
    landingSub: '记录就近降落指令',
    lowBattery: '低电量',
    lowBatterySub: '注入 30% 低电告警',
    emergency: '应急',
    emergencySub: '进入异常处置流',
    unavailableFlightSub: '当前阶段不可发出飞行处置',
    lowBatteryUnavailable: '进入飞行中后才可注入低电告警',
    disabledAction: '当前阶段不可执行该处置。',
    settledWalletNotice: '已跳转到飞手钱包，可查看本单分账入账。',
    returnedToHall: '已返回任务列表，可继续查看其他任务。',
    unchanged: '当前状态未变化，请查看阶段说明后再操作',
    enteredStagePrefix: '已进入',
    taskCompletedNotice: '任务已完成',
    settlementGeneratedNotice: '结算已生成',
    advanceFailed: '流程推进失败',
    lowBatteryInjected: '已注入低电量告警，电量降至 30%。',
    lowBatteryNoTelemetry: '暂无任务遥测，进入飞行中后可注入低电量告警。',
    unloadingNotArrived: '未到达卸货点',
    destinationFenceRequired: '进入终点 200m 围栏后才能确认卸货',
    criticalBatteryBlock: '电量已耗尽，请先通过处置指令执行就近降落或地面救援。',
    returnRecorded: '返航指令已记录；生产环境接入真机 SDK 后执行自动返航。',
    landRecorded: '降落指令已记录；生产环境接入真机 SDK 后执行就近降落。',
    emergencyForbidden: '当前状态不能发起应急处置。',
    exceptionNote: '飞手触发应急',
    exceptionDone: '订单已进入异常状态，后台和业主端可同步看到。',
    illegalTransition: '当前阶段不能发起应急处置，请查看阶段说明或联系后台。',
    emergencyFailed: '应急处置失败，请联系后台处理。',
    languageToast: '已切换为中文',
  },
} as const;
const copy = computed(() => TASK_COPY[localeStore.locale]);
const DESTINATION_RADIUS_KM = 0.2;
type ChecklistKey = 'systems' | 'payload' | 'airspace';
const CHECKLIST_KEYS: ChecklistKey[] = ['systems', 'payload', 'airspace'];
const manualChecklist = ref<Record<Exclude<ChecklistKey, 'airspace'>, boolean>>({
  systems: false,
  payload: false,
});
const CHECKLIST_DONE_STATUSES: OrderStatus[] = [
  OrderStatus.Loading,
  OrderStatus.InFlight,
  OrderStatus.Unloading,
  OrderStatus.Completed,
  OrderStatus.Settled,
];
const ROUTE_POINT_REQUIRED_STATUSES: OrderStatus[] = [
  OrderStatus.Confirmed,
  OrderStatus.AirspaceApplying,
  OrderStatus.Preparing,
  OrderStatus.Loading,
];
type PrimaryBlock = { label: string; reason: string };
const user = computed(() => userStore.user);
const order = computed(() => {
  return currentPilotOrder(user.value.id, orderStore.activeOrder) ?? orderStore.activeOrder;
});
const eventRows = computed(() => (order.value?.events ?? []).slice(-8).reverse().map((event, index) => ({
  key: `${event.at}-${event.status}-${index}`,
  time: event.at.slice(11, 16),
  status: orderStatusLabel(event.status, localeStore.locale),
  note: event.note || '-',
})));
const pilotGateReason = computed(() => {
  const current = order.value;
  if (!current?.pilotId || !orderRequiresPilotQualification(current)) return '';
  return pilotQualificationIssue(repo.pilots.find(current.pilotId));
});
const latest = computed(() => {
  const current = order.value;
  if (!current) return undefined;
  if (telemetryStore.orderId === current.id) return telemetryStore.latest;
  return repo.telemetry.where((item) => item.orderId === current.id)[0]?.frame;
});
const alerts = computed(() => telemetryStore.alerts);
const airspace = computed(() => order.value ? repo.airspace.where((item) => item.orderId === order.value!.id)[0] : undefined);
const allChecked = computed(() => CHECKLIST_KEYS.every((key) => checklistDone(key)));
const action = computed(() => order.value ? taskActionForStatus(order.value, allChecked.value, airspace.value) : {
  stage: copy.value.noMissionStage,
  next: copy.value.noMissionNext,
  primary: copy.value.returnTaskList,
  disabled: false,
  reason: '',
  terminal: true,
});
const emergencyAvailable = computed(() => order.value ? canTriggerEmergency(order.value.status) : false);
const emergencyReason = computed(() => order.value ? emergencyClosedReason(order.value.status) : '');
const flightCommandAvailable = computed(() => {
  const status = order.value?.status;
  return status === OrderStatus.Preparing || status === OrderStatus.Loading || status === OrderStatus.InFlight || status === OrderStatus.Unloading;
});
const lowBatteryAvailable = computed(() => order.value?.status === OrderStatus.InFlight);
const hasExecutableDisposal = computed(() => emergencyActions.value.some((item) => !item.disabled));
const disposalClosedReason = computed(() => {
  const current = order.value;
  if (!current) return copy.value.noTaskDisposal;
  if (current.status === OrderStatus.Settled) return copy.value.settledDisposal;
  if (current.status === OrderStatus.Completed) return copy.value.completedDisposal;
  if (current.status === OrderStatus.Confirmed) return emergencyReason.value;
  if (current.status === OrderStatus.Cancelled || current.status === OrderStatus.Exception) return emergencyReason.value;
  return copy.value.currentStageUnavailable;
});
const telemetryAlert = computed(() => displayTelemetryAlert(alerts.value, latest.value, localeStore.locale));
const primaryAlertLabel = computed(() => telemetryAlert.value?.title ?? '');
const cockpitNotice = computed(() => error.value || feedback.value || pilotGateReason.value || telemetryAlert.value?.notice || '');
const trackingStatusLabel = computed(() => {
  if (primaryAlertLabel.value) return primaryAlertLabel.value;
  const status = order.value?.status;
  if (status === OrderStatus.InFlight) return copy.value.tracking;
  if (status === OrderStatus.Unloading || status === OrderStatus.Completed || status === OrderStatus.Settled) return copy.value.arrived;
  if (status === OrderStatus.AirspaceApplying && airspace.value?.status === 'approved') return copy.value.airspaceApproved;
  if (status === OrderStatus.Confirmed || status === OrderStatus.AirspaceApplying) return copy.value.waitingAirspace;
  return copy.value.waitingTakeoff;
});
const routeMapGpsStatus = computed<'standby' | 'live' | 'arrived'>(() => {
  const status = order.value?.status;
  if (status === OrderStatus.InFlight) return 'live';
  if (status === OrderStatus.Unloading || status === OrderStatus.Completed || status === OrderStatus.Settled) return 'arrived';
  return 'standby';
});
const emergencyActions = computed(() => [
  { key: 'return', name: copy.value.returnHome, subname: flightCommandAvailable.value ? copy.value.returnHomeSub : copy.value.unavailableFlightSub, disabled: !flightCommandAvailable.value },
  { key: 'land', name: copy.value.landing, subname: flightCommandAvailable.value ? copy.value.landingSub : copy.value.unavailableFlightSub, disabled: !flightCommandAvailable.value },
  { key: 'battery', name: copy.value.lowBattery, subname: lowBatteryAvailable.value ? copy.value.lowBatterySub : copy.value.lowBatteryUnavailable, disabled: !lowBatteryAvailable.value },
  { key: 'emergency', name: copy.value.emergency, subname: emergencyAvailable.value ? copy.value.emergencySub : emergencyReason.value, disabled: !emergencyAvailable.value },
]);

const missionTitle = computed(() => `${copy.value.titlePrefix}${order.value ? order.value.id.toUpperCase() : '—'}`);
const missionStatusLabel = computed(() => {
  if (primaryAlertLabel.value) return primaryAlertLabel.value;
  return action.value.stage;
});
const missionStatusTone = computed(() => (primaryAlertLabel.value ? 'warn' : 'ok'));
const craftTag = computed(() => {
  const droneId = order.value?.droneId;
  const drone = droneId ? repo.drones.find(droneId) : undefined;
  return drone?.sn ?? order.value?.id.toUpperCase() ?? '—';
});
const mapFrame = computed(() => {
  const current = order.value;
  if (!current) return undefined;
  if (productionRuntime && !latest.value) return undefined;
  return latest.value ?? fallbackRouteFrame(current);
});
const routeRatio = computed(() => {
  const current = order.value;
  const frame = mapFrame.value;
  if (!current || !frame) return 0;
  if (current.status === OrderStatus.Unloading || current.status === OrderStatus.Completed || current.status === OrderStatus.Settled) return 1;
  if (current.status !== OrderStatus.InFlight) return 0;
  return routeProgressRatio(frame.pos, current.from, current.to);
});
const routeRemainingKm = computed(() => {
  const current = order.value;
  const frame = mapFrame.value;
  if (!current || !frame) return 0;
  if (current.status === OrderStatus.Unloading || current.status === OrderStatus.Completed || current.status === OrderStatus.Settled) return 0;
  return distanceKm(frame.pos, current.to);
});
const reachedDestination = computed(() => routeRemainingKm.value <= DESTINATION_RADIUS_KM);
const routeProgressText = computed(() => `${Math.round(routeRatio.value * 100)}%`);
const flownDistanceText = computed(() => {
  const current = order.value;
  if (!current) return '—';
  const total = distanceKm(current.from, current.to);
  return `${(total * routeRatio.value).toFixed(1)} / ${total.toFixed(1)} km`;
});
const positionMetricLabel = computed(() => order.value?.status === OrderStatus.InFlight ? copy.value.livePosition : copy.value.taskPosition);
const currentPositionText = computed(() => {
  const current = order.value;
  if (!current) return '—';
  if (current.status === OrderStatus.Unloading || current.status === OrderStatus.Completed || current.status === OrderStatus.Settled) {
    return routePointLabel(current.to, copy.value.deliveryPoint);
  }
  if (current.status === OrderStatus.InFlight) {
    const pos = latest.value?.pos;
    const readable = routePointLabel(pos, '');
    return readable || copy.value.enRoutePosition;
  }
  return routePointLabel(current.from, copy.value.loadingPoint);
});
const primaryActionLabel = computed(() => {
  if (orderStore.loading) return copy.value.processing;
  if (primaryBlock.value) return primaryBlock.value.label;
  return action.value.primary;
});
const primaryBlock = computed<PrimaryBlock | null>(() => {
  const current = order.value;
  if (!current) return null;
  if (pilotGateReason.value) return { label: copy.value.qualificationBlockedAction, reason: pilotGateReason.value };
  const routeBlock = routePointBlock(current);
  if (routeBlock) return routeBlock;
  if (current.status !== OrderStatus.InFlight || reachedDestination.value) return null;
  if (batteryPct.value <= 0) {
    return { label: copy.value.unloadingNotArrived, reason: copy.value.criticalBatteryBlock };
  }
  return {
    label: copy.value.unloadingNotArrived,
    reason: `${copy.value.destinationFenceRequired}（距终点约 ${formatRemainingDistance(routeRemainingKm.value)}）`,
  };
});
const primaryBlockReason = computed(() => {
  return primaryBlock.value?.reason ?? '';
});
const primaryDisabled = computed(() => action.value.disabled || orderStore.loading || !!primaryBlockReason.value);
const batteryPct = computed(() => latest.value?.batteryPct ?? 0);
const telemetryCards = computed(() => {
  const frame = latest.value;
  const fallbackBattery = order.value?.droneId ? demoBatteryPct(order.value.droneId) : undefined;
  const low = !!frame && batteryPct.value <= 30;
  const speedKmh = frame ? Math.round(frame.speedMs * 3.6) : 0;
  const battery = frame ? batteryPct.value : fallbackBattery;
  const swing = Number((frame?.swingDeg ?? 0).toFixed(1));
  return [
    { label: copy.value.altitude, value: frame?.altM ?? 0, unit: 'm', pct: Math.min(100, ((frame?.altM ?? 0) / 150) * 100), tone: 'cyan', kind: 'bar' },
    { label: copy.value.speed, value: speedKmh, unit: 'km/h', pct: Math.min(100, (speedKmh / 145) * 100), tone: 'blue', kind: 'bar' },
    { label: copy.value.battery, value: battery ?? '—', unit: battery === undefined ? '' : '%', pct: battery ?? 0, tone: low || (battery !== undefined && battery > 0 && battery <= 30) ? 'amber' : 'green', kind: 'bar' },
    { label: copy.value.yawDev, value: `+${swing}`, unit: '°', pct: Math.min(100, (swing / 45) * 100), tone: swing > 30 ? 'red' : 'neutral', kind: 'yaw' },
  ];
});

if (order.value?.status === OrderStatus.InFlight && telemetryStore.orderId !== order.value.id) {
  telemetryStore.start(order.value.id, 'pilot');
} else if (order.value?.status === OrderStatus.Unloading || order.value?.status === OrderStatus.Completed || order.value?.status === OrderStatus.Settled) {
  telemetryStore.arrive(order.value.id, 'pilot');
} else if (order.value) {
  void telemetryStore.refreshShared(order.value.id);
}

function checklistLabel(key: string) {
  if (key === 'systems') return copy.value.systemsCalibration;
  if (key === 'payload') return copy.value.payloadSecure;
  return copy.value.airspaceClearance;
}

function checklistDone(key: ChecklistKey) {
  const current = order.value;
  if (!current) return false;
  if (CHECKLIST_DONE_STATUSES.includes(current.status)) return true;
  if (key === 'airspace') return current.status === OrderStatus.Preparing || airspace.value?.status === 'approved';
  if (current.status !== OrderStatus.Preparing) return false;
  return manualChecklist.value[key];
}

function checklistDisabled(key: ChecklistKey) {
  const current = order.value;
  return !current || current.status !== OrderStatus.Preparing || key === 'airspace';
}

const checklistRows = computed(() => CHECKLIST_KEYS.map((key) => ({
  key,
  done: checklistDone(key),
  disabled: checklistDisabled(key),
})));

function toggleChecklist(key: ChecklistKey) {
  if (checklistDisabled(key) || key === 'airspace') return;
  manualChecklist.value[key] = !manualChecklist.value[key];
  error.value = '';
}

function routePointLabel(point: GeoPoint | undefined, fallback: string) {
  const value = point?.address?.trim();
  if (value && !isGenericMapAddress(value) && !isCoordinateAddress(value)) return shortAddress(value);
  if (!fallback) return '';
  return localeStore.isZh ? `${fallback}${copy.value.pointPending}` : `${fallback} ${copy.value.pointPending}`;
}

function routePointBlock(current: Order): PrimaryBlock | null {
  if (!ROUTE_POINT_REQUIRED_STATUSES.includes(current.status)) return null;
  if (!isConfirmedRoutePoint(current.from)) {
    return { label: copy.value.loadingPointRequiredAction, reason: copy.value.loadingPointRequired };
  }
  if (!isConfirmedRoutePoint(current.to)) {
    return { label: copy.value.deliveryPointRequiredAction, reason: copy.value.deliveryPointRequired };
  }
  return null;
}

function isConfirmedRoutePoint(point: GeoPoint | undefined) {
  const value = point?.address?.trim();
  return !!value && !isGenericMapAddress(value) && !isCoordinateAddress(value);
}

function shortAddress(value: string) {
  return value.length > 18 ? `${value.slice(0, 18)}...` : value;
}

function fallbackRouteFrame(current: Order): Telemetry {
  const finished = current.status === OrderStatus.Unloading || current.status === OrderStatus.Completed || current.status === OrderStatus.Settled;
  const pos = lerp(current.from, current.to, finished ? 1 : 0);
  return {
    ts: new Date().toISOString(),
    pos,
    altM: current.status === OrderStatus.InFlight ? 20 : 0,
    speedMs: current.status === OrderStatus.InFlight ? 8 : 0,
    batteryPct: current.droneId ? (demoBatteryPct(current.droneId) ?? 80) : 80,
    heading: bearing(current.from, current.to),
    swingDeg: 0,
  };
}

async function advance() {
  const current = order.value;
  if (!current) return;
  if (action.value.disabled) {
    error.value = action.value.reason || copy.value.disabledAction;
    return;
  }
  if (primaryBlockReason.value) {
    error.value = primaryBlockReason.value;
    return;
  }
  if (current.status === OrderStatus.Settled) {
    feedback.value = copy.value.settledWalletNotice;
    uni.navigateTo({ url: '/pages-pilot/wallet/index' });
    return;
  }
  if (current.status === OrderStatus.Cancelled || current.status === OrderStatus.Exception) {
    feedback.value = copy.value.returnedToHall;
    uni.navigateTo({ url: '/pages-pilot/hall/index' });
    return;
  }
  try {
    error.value = '';
    feedback.value = '';
    const before = current.status;
    orderStore.loading = true;
    orderStore.activeOrderId = current.id;
    const next = await orderStore.advance();
    if (next.status === OrderStatus.InFlight) telemetryStore.start(next.id, 'pilot');
    if (before === OrderStatus.InFlight && next.status === OrderStatus.Unloading) telemetryStore.arrive(next.id, 'pilot');
    if (next.status === before) {
      error.value = action.value.reason || copy.value.unchanged;
    } else {
      feedback.value = stageAdvanceNotice(next.status, taskActionForStatus(next, allChecked.value, airspace.value).stage);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : copy.value.advanceFailed;
  } finally {
    orderStore.loading = false;
  }
}

function stageAdvanceNotice(status: OrderStatus, stage: string) {
  if (status === OrderStatus.Completed) return copy.value.taskCompletedNotice;
  if (status === OrderStatus.Settled) return copy.value.settlementGeneratedNotice;
  return `${copy.value.enteredStagePrefix}${stage}`;
}

function formatRemainingDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function lowBattery() {
  if (productionRuntime) {
    feedback.value = '生产环境禁止注入模拟遥测';
    return;
  }
  error.value = '';
  if (!telemetryStore.latest && order.value) {
    telemetryStore.start(order.value.id, 'pilot');
  }
  telemetryStore.injectLowBattery();
  feedback.value = telemetryStore.latest ? copy.value.lowBatteryInjected : copy.value.lowBatteryNoTelemetry;
}

function recordFlightCommand(type: 'return' | 'land') {
  if (productionRuntime) {
    feedback.value = '返航/降落指令服务尚未接入生产后端';
    return;
  }
  const current = order.value;
  if (!flightCommandAvailable.value) {
    feedback.value = emergencyReason.value || copy.value.unavailableFlightSub;
    return;
  }
  if (!current) return;
  const note = type === 'return'
    ? copy.value.returnRecorded
    : copy.value.landRecorded;
  repo.orders.update(current.id, {
    events: [
      ...current.events,
      { at: new Date().toISOString(), status: current.status, actor: Role.Pilot, note },
    ],
  });
  recordAudit(AuditAction.Order, current.pilotId ?? current.clientId, Role.Pilot, 'order', current.id, note);
  feedback.value = note;
}

function handleEmergencySelect(event: { item: { key: string; disabled?: boolean } }) {
  if (event.item.disabled) {
    feedback.value = disposalClosedReason.value || copy.value.disabledAction;
    return;
  }
  if (event.item.key === 'return') recordFlightCommand('return');
  if (event.item.key === 'land') recordFlightCommand('land');
  if (event.item.key === 'battery') lowBattery();
  if (event.item.key === 'emergency') exception();
}

function exception() {
  if (productionRuntime) {
    feedback.value = '异常上报服务尚未接入生产后端';
    return;
  }
  const current = order.value;
  if (!current) return;
  if (!emergencyAvailable.value) {
    feedback.value = emergencyReason.value || copy.value.emergencyForbidden;
    return;
  }
  try {
    transition(current.id, OrderStatus.Exception, { actor: Role.Pilot, note: copy.value.exceptionNote });
    feedback.value = copy.value.exceptionDone;
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    error.value = message.includes('非法流转') ? copy.value.illegalTransition : copy.value.emergencyFailed;
  }
}

function showEvents() {
  showEventsSheet.value = true;
}

function openWalletFromSheet() {
  showEmergencySheet.value = false;
  uni.navigateTo({ url: '/pages-pilot/wallet/index' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  uni.showToast({ title: copy.value.languageToast, icon: 'none' });
}
</script>

<style lang="scss" scoped>
.mission-page {
  min-height: 100vh;
  background: #080c14;
  color: $cockpit-ink;
  padding-bottom: calc(224rpx + env(safe-area-inset-bottom));
  font-family: Inter, "PingFang SC", system-ui, sans-serif;
}

.mission-header {
  height: calc(180rpx + env(safe-area-inset-top));
  padding: calc(env(safe-area-inset-top) + 54rpx) 30rpx 34rpx;
  background: #080c14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8rpx;
  flex: 0 0 158rpx;
}

.header-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c7d2d8;
}

.header-icon :deep(.wd-icon),
.header-icon :deep(.stitch-icon) {
  color: currentColor;
}

.mission-title {
  flex: 1;
  min-width: 0;
  color: #e5e7f2;
  font-size: 36rpx;
  font-weight: $fw-bold;
  letter-spacing: 2rpx;
  line-height: 1;
  text-align: center;
  @include ellipsis(1);
}

.more-button {
  flex-direction: column;
  gap: 7rpx;
}

.language-switch {
  min-width: 56rpx;
  height: 50rpx;
  padding: 0 12rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(79, 99, 113, .62);
  background: rgba(30, 36, 51, .82);
  color: $color-primary;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 18rpx;
  line-height: 46rpx;
  font-weight: $fw-bold;
  text-align: center;
  box-sizing: border-box;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .mission-title,
.zh-copy .language-switch,
.zh-copy .tracking-pill,
.zh-copy .coordinate-label,
.zh-copy .panel-heading,
.zh-copy .telemetry-label,
.zh-copy .bar-btn,
.zh-copy .sheet-title,
.zh-copy .sheet-name,
.zh-copy .sheet-sub {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .tracking-pill {
  min-width: 132rpx;
}

.zh-copy .panel-heading,
.zh-copy .telemetry-label {
  letter-spacing: 2rpx;
}

.route-map-shell {
  position: relative;
  background: #121722;
  border-top: 2rpx solid rgba(57, 69, 82, .45);
  border-bottom: 2rpx solid rgba(57, 69, 82, .72);
}

.pilot-route-map {
  height: 560rpx;
  border: 0;
  border-radius: 0;
}

.empty-route-map {
  height: 560rpx;
  color: #849495;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
}

.empty-route-map text {
  color: #dfe2f0;
  font-size: 26rpx;
  line-height: 36rpx;
  font-weight: 800;
  text-align: center;
}

.map-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: .34;
  filter: blur(1rpx) saturate(.7);
}

.map-grid {
  position: absolute;
  inset: 0;
  opacity: .78;
  background-image:
    linear-gradient(to right, rgba(65, 84, 94, .28) 1rpx, transparent 1rpx),
    linear-gradient(to bottom, rgba(65, 84, 94, .28) 1rpx, transparent 1rpx);
  background-size: 40rpx 40rpx;
}

.map-grid::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(7, 11, 18, .1) 0%, rgba(7, 11, 18, .45) 100%),
    radial-gradient(95% 70% at 48% 40%, rgba(0, 242, 255, .12) 0%, rgba(0, 242, 255, 0) 58%);
}

.scan-box {
  position: absolute;
  left: 190rpx;
  top: 75rpx;
  width: 368rpx;
  height: 458rpx;
  border: 2rpx solid rgba(0, 242, 255, .26);
  border-radius: 24rpx;
  overflow: hidden;
}

.scan-box::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 0;
  width: 2rpx;
  height: 100%;
  background: rgba(0, 242, 255, .32);
}

.sweep-image {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: .9;
}

.route-image {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: .92;
}

.radar-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16rpx;
  height: 16rpx;
  margin: -8rpx 0 0 -8rpx;
  border-radius: 50%;
  background: $color-primary;
  box-shadow: 0 0 22rpx rgba(0, 242, 255, .85), 0 0 54rpx rgba(0, 242, 255, .35);
}

.tracking-pill {
  position: absolute;
  right: 24rpx;
  top: 31rpx;
  min-width: 164rpx;
  height: 48rpx;
  padding: 0 22rpx;
  border-radius: $r-pill;
  border: 2rpx solid rgba(79, 99, 113, .62);
  background: rgba(30, 36, 51, .82);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  box-sizing: border-box;
  color: $success;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  font-weight: $fw-bold;
  letter-spacing: 5rpx;
}

.tracking-pill.alert {
  color: $danger;
}

.tracking-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: currentColor;
}

.coordinate-card {
  position: absolute;
  left: 30rpx;
  bottom: 32rpx;
  width: 435rpx;
  min-height: 82rpx;
  padding: 16rpx 18rpx 15rpx;
  border-radius: 10rpx;
  border: 2rpx solid rgba(79, 99, 113, .72);
  background: rgba(30, 36, 51, .88);
  box-shadow: 0 10rpx 36rpx rgba(0, 0, 0, .26);
  box-sizing: border-box;
}

.coordinate-label {
  display: block;
  color: #c7d2d8;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  font-weight: $fw-bold;
  letter-spacing: 6rpx;
  line-height: 1.15;
  white-space: nowrap;
}

.coordinate-value {
  display: block;
  margin-top: 6rpx;
  color: $color-primary;
  font-family: "JetBrains Mono", monospace;
  font-size: 26rpx;
  font-weight: $fw-bold;
  letter-spacing: 1rpx;
  line-height: 1.1;
  white-space: nowrap;
}

.notice-strip {
  margin: 24rpx 30rpx 0;
  padding: 18rpx 22rpx;
  border-radius: 8rpx;
  background: rgba(245, 158, 11, .14);
  border: 2rpx solid rgba(245, 158, 11, .34);
  color: $warning-ink;
  font-size: 23rpx;
  line-height: 1.45;
}

.mission-content {
  padding: 48rpx 30rpx 0;
}

.mission-status {
  width: 412rpx;
  height: 80rpx;
  margin: 0 auto;
  border-radius: 24rpx;
  border: 2rpx solid #3c4650;
  background: #252b35;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  color: $success;
  box-shadow: inset 0 2rpx 0 rgba(255, 255, 255, .05);
}

.mission-status.warn {
  color: $warning;
}

.mission-status text {
  font-size: 32rpx;
  font-weight: $fw-bold;
  line-height: 1;
}

.status-ring {
  width: 38rpx;
  height: 38rpx;
  border-radius: 50%;
  border: 4rpx solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-ring :deep(.wd-icon),
.status-ring :deep(.stitch-icon) {
  color: currentColor;
}

.route-progress-panel {
  margin-top: 28rpx;
  padding: 22rpx 24rpx;
  border-radius: 12rpx;
  border: 2rpx solid rgba(65, 78, 91, .8);
  background: #121722;
  box-sizing: border-box;
}

.route-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  color: #c7d2d8;
  font-size: 22rpx;
  font-weight: $fw-bold;
  line-height: 1.2;
}

.route-progress-head text:first-child {
  color: $color-primary;
}

.route-progress-track {
  position: relative;
  height: 8rpx;
  margin-top: 18rpx;
  overflow: hidden;
  border-radius: $r-pill;
  background: rgba(49, 53, 64, .92);
}

.route-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, $color-primary 0%, $info 100%);
  box-shadow: 0 0 18rpx rgba(0, 242, 255, .35);
}

.route-progress-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
  margin-top: 20rpx;
}

.route-progress-metrics > view {
  min-width: 0;
  padding: 16rpx 18rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(58, 73, 75, .72);
  background: rgba(20, 24, 34, .72);
  box-sizing: border-box;
}

.route-progress-metrics text {
  display: block;
  @include ellipsis(1);
}

.route-progress-metrics text:first-child {
  color: #9fb0ba;
  font-size: 20rpx;
  line-height: 1.25;
}

.route-progress-metrics text:last-child {
  margin-top: 8rpx;
  color: #e7ebf6;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 23rpx;
  font-weight: $fw-bold;
  line-height: 1.25;
}

.route-stage-copy {
  margin-top: 18rpx;
}

.route-stage-copy text {
  display: block;
  color: #e7ebf6;
  font-size: 24rpx;
  line-height: 1.45;
}

.route-stage-copy text + text {
  margin-top: 6rpx;
  color: #9fb0ba;
  font-size: 22rpx;
}

.check-panel {
  margin-top: 48rpx;
  padding: 28rpx 30rpx 26rpx;
  border-radius: 12rpx;
  border: 2rpx solid rgba(65, 78, 91, .8);
  background: #141922;
  box-sizing: border-box;
}

.panel-heading {
  display: flex;
  align-items: center;
  gap: 15rpx;
  height: 42rpx;
  color: #c7d2d8;
  font-family: "JetBrains Mono", monospace;
  font-size: 24rpx;
  font-weight: $fw-bold;
  letter-spacing: 8rpx;
}

.panel-heading :deep(.wd-icon),
.panel-heading :deep(.stitch-icon) {
  color: currentColor;
}

.check-list {
  margin-top: 22rpx;
}

.check-row {
  min-height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  border-bottom: 2rpx solid rgba(52, 63, 73, .58);
  color: #e7ebf6;
  font-size: 29rpx;
  line-height: 1.25;
}

.check-row:last-child {
  border-bottom: 0;
}

.check-row.disabled {
  color: #81909b;
}

.check-row :deep(.wd-icon),
.check-row :deep(.stitch-icon) {
  flex: 0 0 auto;
  color: $info;
}

.telemetry-grid {
  margin-top: 50rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 30rpx 24rpx;
}

.telemetry-card {
  min-height: 236rpx;
  padding: 34rpx 24rpx 25rpx;
  border-radius: 12rpx;
  border: 2rpx solid rgba(65, 78, 91, .8);
  background: #141922;
  box-sizing: border-box;
}

.telemetry-label {
  display: block;
  color: #c7d2d8;
  font-family: "JetBrains Mono", monospace;
  font-size: 22rpx;
  font-weight: $fw-bold;
  letter-spacing: 9rpx;
  line-height: 1.15;
}

.telemetry-value {
  height: 86rpx;
  margin-top: 33rpx;
  display: flex;
  align-items: flex-end;
  gap: 6rpx;
}

.value-main {
  color: #e7ebf6;
  font-size: 70rpx;
  font-weight: 800;
  line-height: .82;
  letter-spacing: 0;
  font-family: "Hanken Grotesk", Inter, system-ui, sans-serif;
}

.value-unit {
  color: #d8dee8;
  font-size: 25rpx;
  line-height: 1;
}

.telemetry-card.amber .value-main {
  color: $warning;
}

.telemetry-card.red .value-main {
  color: $danger;
}

.metric-track {
  height: 7rpx;
  margin-top: 23rpx;
  border-radius: $r-pill;
  background: #2b303b;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: $r-pill;
  background: $color-primary;
}

.telemetry-card.blue .metric-fill {
  background: $info;
}

.telemetry-card.green .metric-fill {
  background: $success;
}

.telemetry-card.amber .metric-fill {
  background: $warning;
}

.yaw-scale {
  height: 42rpx;
  margin-top: 10rpx;
  padding: 0 6rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.yaw-tick {
  width: 7rpx;
  height: 18rpx;
  background: rgba(112, 137, 138, .62);
}

.yaw-tick.active {
  width: 8rpx;
  height: 26rpx;
  background: $color-primary;
  box-shadow: 0 0 16rpx rgba(0, 242, 255, .35);
}

.cockpit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-bottombar;
  display: flex;
  gap: 30rpx;
  padding: 32rpx 30rpx calc(32rpx + env(safe-area-inset-bottom));
  background: #171c25;
  border-top: 2rpx solid rgba(65, 78, 91, .82);
  backdrop-filter: blur(18rpx);
  box-sizing: border-box;
}

.bar-btn {
  min-height: 132rpx;
  border-radius: 8rpx;
  font-size: 30rpx;
  font-weight: $fw-bold;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15rpx;
  text-align: center;
}

.bar-btn :deep(.wd-icon),
.bar-btn :deep(.stitch-icon) {
  flex: 0 0 auto;
}

.bar-btn.ghost {
  flex: 0 0 331rpx;
  color: $info;
  background: transparent;
  border: 2rpx solid $info;
}

.bar-btn.ghost :deep(.wd-icon),
.bar-btn.ghost :deep(.stitch-icon) {
  color: currentColor;
}

.bar-btn.primary {
  flex: 1;
  color: #041014;
  background: $color-primary;
  box-shadow: none;
}

.bar-btn.primary :deep(.wd-icon),
.bar-btn.primary :deep(.stitch-icon) {
  color: currentColor;
}

.bar-btn.primary text {
  max-width: 260rpx;
  line-height: 1.25;
}

.bar-btn.primary.disabled {
  opacity: .5;
}

.tap-press {
  opacity: .86;
  transform: translateY(2rpx);
}

.sheet-mask { position: fixed; inset: 0; z-index: $z-sheet; background: $overlay; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: $cockpit-850; border-top-left-radius: $r-lg; border-top-right-radius: $r-lg; border-top: 2rpx solid $cockpit-line; padding: $sp-4 $page-x calc($sp-4 + env(safe-area-inset-bottom)); }
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: $sp-3; }
.sheet-title { font-size: $fs-h3; font-weight: $fw-bold; color: $cockpit-ink; }
.sheet-close { width: 56rpx; height: 56rpx; border-radius: 50%; background: $tint-on-dark; display: flex; align-items: center; justify-content: center; }
.sheet-close :deep(.wd-icon),
.sheet-close :deep(.stitch-icon) { color: $cockpit-ink; }
.sheet-row { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: $sp-3; padding: $sp-3; border-radius: $r-md; background: $cockpit-800; border: 2rpx solid $cockpit-line; margin-bottom: $sp-2; text-align: left; }
.sheet-row.disabled { opacity: .45; }
.sheet-row :deep(.wd-icon),
.sheet-row :deep(.stitch-icon) { color: $cockpit-ink-dim; }
.sheet-copy { min-width: 0; }
.sheet-name { display: block; font-size: $fs-body; font-weight: $fw-semibold; color: $cockpit-ink; }
.sheet-sub { display: block; margin-top: 2rpx; font-size: $fs-cap; color: $cockpit-ink-faint; }
.events-sheet { max-height: 72vh; overflow: hidden; }
.event-list { display: grid; gap: $sp-2; max-height: 54vh; overflow-y: auto; }
.event-row { padding: $sp-3; border-radius: $r-md; border: 2rpx solid $cockpit-line; background: $cockpit-800; display: grid; grid-template-columns: 92rpx minmax(0, 1fr); gap: $sp-3; align-items: start; }
.event-time { color: $color-primary; font-family: "JetBrains Mono", monospace; font-size: $fs-cap; line-height: 1.35; font-weight: $fw-bold; }
.event-copy { min-width: 0; }
.event-status { display: block; color: $cockpit-ink; font-size: $fs-body; line-height: 1.35; font-weight: $fw-semibold; }
.event-note { display: block; margin-top: 4rpx; color: $cockpit-ink-faint; font-size: $fs-cap; line-height: 1.45; }

.sheet-closed {
  padding: $sp-4;
  border-radius: $r-lg;
  border: 2rpx solid $cockpit-line;
  background: $cockpit-800;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: $sp-2;
}

.closed-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: $r-pill;
  background: $warning-bg;
  color: $neon-amber;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closed-icon :deep(.wd-icon),
.closed-icon :deep(.stitch-icon) {
  color: currentColor;
}

.closed-title {
  color: $cockpit-ink;
  font-size: $fs-h3;
  font-weight: $fw-bold;
  line-height: 1.35;
}

.closed-desc {
  color: $cockpit-ink-dim;
  font-size: $fs-sm;
  line-height: 1.55;
}

.closed-actions {
  width: 100%;
  margin-top: $sp-3;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $sp-2;
}

.closed-actions .closed-btn:only-child {
  grid-column: 1 / -1;
}

.closed-btn {
  min-height: 88rpx;
}
</style>
