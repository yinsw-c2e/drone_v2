<template>
  <view class="hall-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand-wrap">
        <view class="avatar-button">
          <StitchIcon name="person" size="38rpx" />
        </view>
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showToast(copy.signalHealthy)">
          <StitchIcon name="signal_cellular_alt" size="49rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="heading">
        <text class="title">{{ copy.title }}</text>
        <text class="subtitle">{{ copy.subtitle }}</text>
      </view>

      <view class="sort-button" hover-class="tap-press" @click="cycleSort">
        <StitchIcon name="sort" size="32rpx" />
        <text>{{ sortLabel }}</text>
      </view>

      <view v-if="feedback" :class="['feedback', feedbackTone]">
        <text>{{ feedback }}</text>
      </view>

      <view v-if="qualificationIssue" class="qualification-card">
        <StitchIcon name="gpp_bad" size="42rpx" />
        <view class="qualification-copy">
          <text class="qualification-title">{{ copy.qualificationBlockedTitle }}</text>
          <text class="qualification-desc">{{ qualificationIssue }}</text>
        </view>
      </view>

      <view v-if="missions.length" class="mission-list">
        <view v-for="mission in missions" :key="mission.id" :class="['mission-card', mission.urgent ? 'urgent' : '']" hover-class="tap-press" @click="acceptMission(mission)">
          <view v-if="mission.urgent" class="corner-alert">
            <StitchIcon name="priority_high" size="38rpx" />
          </view>

          <view class="mission-head">
            <view class="mission-title-block">
              <view :class="['mission-type', mission.urgent ? 'warning' : 'blue']">
                <view class="type-dot" />
                <text>{{ mission.type }}</text>
              </view>
              <text class="mission-title">{{ mission.title }}</text>
            </view>
            <view class="bounty">
              <text>{{ copy.bounty }}</text>
              <text :class="mission.urgent ? 'amber' : 'cyan'">¥{{ mission.bounty }}</text>
            </view>
          </view>

          <view class="facts">
            <view class="fact">
              <view class="fact-label">
                <StitchIcon name="route" size="25rpx" />
                <text>{{ copy.route }}</text>
              </view>
              <text class="fact-value route">{{ mission.route }}</text>
            </view>
            <view class="fact">
              <view class="fact-label">
                <StitchIcon name="straighten" size="25rpx" />
                <text>{{ copy.distance }}</text>
              </view>
              <text :class="['fact-value', mission.urgent ? 'cyan' : '']">{{ mission.distance }}</text>
            </view>
            <view class="fact">
              <view class="fact-label">
                <StitchIcon name="schedule" size="25rpx" />
                <text>{{ mission.assigned ? copy.stage : copy.etaReq }}</text>
              </view>
              <text :class="['fact-value', mission.urgent ? 'amber' : '']">{{ mission.eta }}</text>
            </view>
            <view class="fact">
              <view class="fact-label">
                <StitchIcon :name="mission.temp ? 'ac_unit' : 'weight'" size="25rpx" />
                <text>{{ mission.temp ? copy.tempReq : copy.payload }}</text>
              </view>
              <text :class="['fact-value', mission.temp ? 'blue-text' : '']">{{ mission.payload }}</text>
            </view>
          </view>

          <view class="tags">
            <text v-for="tag in mission.tags" :key="tag" :class="['tag', tag === copy.classA || tag === 'CLASS A LIC' ? 'license' : '']">{{ tag }}</text>
          </view>
        </view>
      </view>

      <view v-else-if="!qualificationIssue" class="qualification-card">
        <StitchIcon name="inbox" size="42rpx" />
        <view class="qualification-copy">
          <text class="qualification-title">{{ copy.noMissionTitle }}</text>
          <text class="qualification-desc">{{ copy.noMissionDesc }}</text>
        </view>
      </view>
    </view>

    <view class="dispatch-bar">
      <view class="status-copy">
        <text class="status-label">{{ copy.activeStatus }}</text>
        <view class="ready-line">
          <view :class="['ready-dot', canDispatch ? '' : 'off']" />
          <text>{{ qualificationIssue ? copy.qualificationBlockedStatus : pilotOnline ? copy.readyForDispatch : copy.offlineStatus }}</text>
        </view>
      </view>
      <view class="auto-button" :class="{ disabled: qualificationIssue }" hover-class="tap-press" @click="createMatching">
        <StitchIcon name="play_arrow" size="34rpx" />
        <text>{{ copy.autoMatch }}</text>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" hover-class="tap-press" @click="goHome">
        <StitchIcon name="grid_view" size="37rpx" />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item active">
        <StitchIcon name="assignment" size="40rpx" fill />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goAssets">
        <StitchIcon name="account_balance_wallet" size="40rpx" />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goWallet">
        <StitchIcon name="account_balance" size="40rpx" />
        <text>{{ copy.wallet }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="38rpx" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { OrderStatus, Role } from '@/models';
import type { GeoPoint, MatchCandidate, Order } from '@/models';
import { pilotQualificationIssue } from '@/services/compliance';
import { matchingOrdersForPilot } from '@/services/app-flow';
import { orderStatusLabel } from '@/services/display-labels';
import { isCoordinateAddress, isGenericMapAddress } from '@/services/geocoding';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';
import { distanceKm } from '@/utils/geo';
import { repo } from '@/utils/repo';

interface MissionCard {
  id: string;
  orderId?: string;
  assigned?: boolean;
  urgent: boolean;
  type: string;
  title: string;
  bounty: string;
  route: string;
  distance: string;
  eta: string;
  payload: string;
  temp?: boolean;
  tags: string[];
}

const userStore = useUserStore();
const orderStore = useOrderStore();
const localeStore = useLocaleStore();
const feedback = ref('');
const feedbackTone = ref<'info' | 'warning' | 'success'>('info');

if (userStore.user.currentRole !== Role.Pilot) {
  userStore.loginAs(Role.Pilot);
}

const user = computed(() => userStore.user);
const orders = computed(() => matchingOrdersForPilot(user.value.id));
const HALL_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    signalHealthy: 'Network signal healthy',
    title: 'Mission Hall',
    subtitle: 'Available contracts matching your fleet capabilities.',
    sortUrgency: 'Sort: Urgency',
    sortBounty: 'Sort: Bounty',
    sortEta: 'Sort: ETA',
    sortedPrefix: 'Sorted by ',
    offlineStatus: 'Offline',
    urgentDispatch: 'URGENT DISPATCH',
    standardFreight: 'STANDARD FREIGHT',
    assignedMission: 'ASSIGNED MISSION',
    bounty: 'BOUNTY',
    route: 'ROUTE',
    distance: 'DISTANCE',
    etaReq: 'ETA REQ',
    stage: 'STAGE',
    tempReq: 'TEMP REQ',
    payload: 'PAYLOAD',
    heavyLift: 'REQ: HEAVY LIFT',
    fixedWing: 'REQ: FIXED WING',
    coldChain: 'REQ: COLD CHAIN',
    credit95: 'CREDIT > 95',
    credit80: 'CREDIT > 80',
    credit90: 'CREDIT > 90',
    classA: 'CLASS A LIC',
    activeStatus: 'ACTIVE STATUS',
    readyForDispatch: 'Ready for Dispatch',
    continueTask: 'CONTINUE',
    autoMatch: 'Auto-Match',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    wallet: 'Wallet',
    profile: 'Profile',
    urgentSorted: 'Sorted by urgency priority',
    generated: 'Generated mission orders. Select one below.',
    generatedToast: 'Mission generated',
    noCapacity: 'Order generated, but no acceptable capacity is currently available.',
    noCapacityToast: 'No acceptable capacity',
    qualificationBlockedTitle: 'Qualification blocked',
    qualificationBlockedStatus: 'Qualification blocked',
    noMissionTitle: 'No available missions',
    noMissionDesc: 'No compliant mission is available for this pilot right now.',
    generateFailed: 'Mission generation failed',
    pilotIdentity: 'Current identity: Pilot',
    medicalTitle: 'Medical Optics Lift',
    industrialTitle: 'Industrial Component Transfer',
    sampleTitle: 'Biological Samples',
    routeUrgent: 'TechPark A -> Hospital C',
    routeStandard: 'Zone 4 -> Depot Beta',
    routeSample: 'Clinic N -> Lab Central',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    signalHealthy: '网络信号正常',
    title: '接单大厅',
    subtitle: '匹配你机队能力的可接任务。',
    sortUrgency: '按紧急度排序',
    sortBounty: '按报酬排序',
    sortEta: '按时效排序',
    sortedPrefix: '已切换：',
    offlineStatus: '离线',
    urgentDispatch: '紧急派单',
    standardFreight: '标准货运',
    assignedMission: '当前任务',
    bounty: '报酬',
    route: '航线',
    distance: '距离',
    etaReq: '时效',
    stage: '阶段',
    tempReq: '温控',
    payload: '载荷',
    heavyLift: '要求：重载',
    fixedWing: '要求：固定翼',
    coldChain: '要求：冷链',
    credit95: '信用 > 95',
    credit80: '信用 > 80',
    credit90: '信用 > 90',
    classA: 'A类执照',
    activeStatus: '在线状态',
    readyForDispatch: '可接单',
    continueTask: '继续执行',
    autoMatch: '自动匹配',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    wallet: '钱包',
    profile: '我的',
    urgentSorted: '已按紧急度优先排序',
    generated: '已生成待接单订单，可在下方选择接单。',
    generatedToast: '已生成待接单',
    noCapacity: '已生成订单，但当前飞手暂无可承接运力。',
    noCapacityToast: '暂无可承接运力',
    qualificationBlockedTitle: '资质待补',
    qualificationBlockedStatus: '资质不可接单',
    noMissionTitle: '暂无可接任务',
    noMissionDesc: '当前没有适合该飞手的合规任务。',
    generateFailed: '生成待接单失败',
    pilotIdentity: '当前为飞手身份',
    medicalTitle: '医疗光学设备吊运',
    industrialTitle: '工业部件转运',
    sampleTitle: '生物样本',
    routeUrgent: '科技园A -> 医院C',
    routeStandard: '4区 -> Beta仓',
    routeSample: '北区诊所 -> 中央实验室',
    languageToast: '已切换为中文',
  },
} as const;
const copy = computed(() => HALL_COPY[localeStore.locale]);
const sortMode = ref<'default' | 'bounty' | 'eta'>('default');
const pilotOnline = computed(() => repo.pilots.find(user.value.id)?.online ?? false);
const qualificationIssue = computed(() => pilotQualificationIssue(repo.pilots.find(user.value.id)));
const canDispatch = computed(() => pilotOnline.value && !qualificationIssue.value);
const sortLabel = computed(() => sortMode.value === 'bounty' ? copy.value.sortBounty : sortMode.value === 'eta' ? copy.value.sortEta : copy.value.sortUrgency);
const terminalStatuses: OrderStatus[] = [OrderStatus.Settled, OrderStatus.Cancelled, OrderStatus.Exception];
const assignedOrders = computed(() => repo.orders
  .where((order) => order.pilotId === user.value.id && !terminalStatuses.includes(order.status))
  .slice()
  .reverse());

const missions = computed<MissionCard[]>(() => {
  const assigned = assignedOrders.value.map(toAssignedMission);
  if (qualificationIssue.value) return assigned;
  let rows = orders.value.slice();
  if (sortMode.value === 'bounty') rows = rows.sort((a, b) => b.candidate.quoteCent - a.candidate.quoteCent);
  if (sortMode.value === 'eta') rows = rows.sort((a, b) => a.candidate.etaMin - b.candidate.etaMin);
  const live = assigned.concat(rows.slice(0, Math.max(0, 5 - assigned.length)).map((item, index) => toMission(item.order, item.candidate, index)));
  if (live.length) return live;
  return fallbackMissions.value;
});

const fallbackMissions = computed<MissionCard[]>(() => [
  {
    id: 'fallback-urgent',
    urgent: true,
    type: copy.value.urgentDispatch,
    title: copy.value.medicalTitle,
    bounty: '4,500',
    route: copy.value.routeUrgent,
    distance: '12.4 KM',
    eta: '< 45 MIN',
    payload: '25 KG',
    tags: [copy.value.heavyLift, copy.value.credit95, copy.value.classA],
  },
  {
    id: 'fallback-standard-1',
    urgent: false,
    type: copy.value.standardFreight,
    title: copy.value.industrialTitle,
    bounty: '1,200',
    route: copy.value.routeStandard,
    distance: '45.0 KM',
    eta: '120 MIN',
    payload: '8 KG',
    tags: [copy.value.fixedWing, copy.value.credit80],
  },
  {
    id: 'fallback-standard-2',
    urgent: false,
    type: copy.value.standardFreight,
    title: copy.value.sampleTitle,
    bounty: '2,800',
    route: copy.value.routeSample,
    distance: '8.2 KM',
    eta: '30 MIN',
    payload: '-4°C',
    temp: true,
    tags: [copy.value.coldChain, copy.value.credit90],
  },
]);

function toMission(order: Order, candidate: MatchCandidate, index: number): MissionCard {
  const urgent = index === 0;
  return {
    id: order.id,
    orderId: order.id,
    urgent,
    type: urgent ? copy.value.urgentDispatch : copy.value.standardFreight,
    title: order.cargo.remark || (urgent ? copy.value.medicalTitle : copy.value.industrialTitle),
    bounty: formatYuan(candidate.quoteCent),
    route: `${routeAddress(order.from, localeStore.isZh ? '装货点' : 'Loading point')} -> ${routeAddress(order.to, localeStore.isZh ? '卸货点' : 'Delivery point')}`,
    distance: `${candidate.distanceKm.toFixed(1)} KM`,
    eta: urgent ? `< ${Math.max(candidate.etaMin, 45)} MIN` : `${candidate.etaMin} MIN`,
    payload: `${order.cargo.weightKg} KG`,
    tags: candidate.reasons.slice(0, 2).map((item) => item.toUpperCase()).concat(urgent ? [copy.value.classA] : []),
  };
}

function toAssignedMission(order: Order): MissionCard {
  const quoteCent = order.priceBreakdown?.totalCent ?? order.settlement?.totalCent ?? order.budgetCent;
  const tags = [copy.value.continueTask, order.capacityId ?? order.droneId ?? ''].filter((item): item is string => Boolean(item));
  return {
    id: `assigned-${order.id}`,
    orderId: order.id,
    assigned: true,
    urgent: false,
    type: copy.value.assignedMission,
    title: order.cargo.remark || copy.value.industrialTitle,
    bounty: formatYuan(quoteCent),
    route: `${routeAddress(order.from, localeStore.isZh ? '装货点' : 'Loading point')} -> ${routeAddress(order.to, localeStore.isZh ? '卸货点' : 'Delivery point')}`,
    distance: `${distanceKm(order.from, order.to).toFixed(1)} KM`,
    eta: orderStatusLabel(order.status, localeStore.locale),
    payload: `${order.cargo.weightKg} KG`,
    tags,
  };
}

function routeAddress(point: GeoPoint, fallback: string) {
  const value = point.address?.trim();
  if (value && !isGenericMapAddress(value) && !isCoordinateAddress(value)) return shortAddress(value, fallback);
  return localeStore.isZh ? `${fallback}待确认` : `${fallback} pending`;
}

function shortAddress(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (value.includes('低空')) return localeStore.isZh ? '科技园A' : 'TechPark A';
  if (value.includes('交付')) return localeStore.isZh ? '医院C' : 'Hosp C';
  return value.slice(0, 12);
}

function formatYuan(amountCent: number) {
  return Math.round(amountCent / 100).toLocaleString('en-US');
}

function cycleSort() {
  const order: Array<typeof sortMode.value> = ['default', 'bounty', 'eta'];
  sortMode.value = order[(order.indexOf(sortMode.value) + 1) % order.length];
  feedbackTone.value = 'info';
  feedback.value = `${copy.value.sortedPrefix}${sortLabel.value}`;
}

function createMatching() {
  if (qualificationIssue.value) {
    feedbackTone.value = 'warning';
    feedback.value = qualificationIssue.value;
    uni.showToast({ title: copy.value.qualificationBlockedStatus, icon: 'none' });
    return;
  }
  try {
    feedback.value = '';
    orderStore.createDemoOrder();
    const available = matchingOrdersForPilot(user.value.id).length;
    if (available) {
      feedbackTone.value = 'success';
      feedback.value = copy.value.generated;
      uni.showToast({ title: copy.value.generatedToast, icon: 'none' });
    } else {
      feedbackTone.value = 'warning';
      feedback.value = copy.value.noCapacity;
      uni.showToast({ title: copy.value.noCapacityToast, icon: 'none' });
    }
  } catch (e) {
    feedbackTone.value = 'warning';
    feedback.value = e instanceof Error ? e.message : copy.value.generateFailed;
  }
}

function acceptMission(mission: MissionCard) {
  if (mission.assigned && mission.orderId) {
    orderStore.activeOrderId = mission.orderId;
    uni.navigateTo({ url: '/pages-pilot/task/index' });
    return;
  }
  if (qualificationIssue.value) {
    feedbackTone.value = 'warning';
    feedback.value = qualificationIssue.value;
    uni.showToast({ title: copy.value.qualificationBlockedStatus, icon: 'none' });
    return;
  }
  if (mission.orderId) {
    accept(mission.orderId);
    return;
  }
  createMatching();
  const first = matchingOrdersForPilot(user.value.id)[0];
  if (first) accept(first.order.id);
}

function accept(orderId: string) {
  orderStore.acceptForPilot(orderId, user.value.id);
  uni.navigateTo({ url: '/pages-pilot/task/index' });
}

function goHome() {
  uni.reLaunch({ url: '/pages-pilot/home/index' });
}

function goAssets() {
  uni.navigateTo({ url: '/pages/credit/index' });
}

function goWallet() {
  uni.navigateTo({ url: '/pages-pilot/wallet/index' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/auth/index' });
}

function showToast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  showToast(copy.value.languageToast);
}
</script>

<style lang="scss" scoped>
.hall-page {
  min-height: 100vh;
  color: #dfe2f0;
  background: #0b0e14;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
  padding-bottom: 294rpx;
  box-sizing: border-box;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 60;
  height: 122rpx;
  padding: 0 22rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap,
.avatar-button,
.signal-button,
.top-actions,
.sort-button,
.mission-type,
.fact-label,
.dispatch-bar,
.ready-line,
.auto-button,
.bottom-nav,
.nav-item {
  display: flex;
  align-items: center;
}

.brand-wrap {
  gap: 20rpx;
  min-width: 0;
  flex: 1;
}

.avatar-button {
  width: 62rpx;
  height: 62rpx;
  border-radius: 20rpx;
  border: 2rpx solid #3a494b;
  background: #313540;
  color: #dfe2f0;
  justify-content: center;
  flex: 0 0 45rpx;
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 43rpx;
  line-height: 58rpx;
  font-weight: 800;
  @include ellipsis(1);
}

.signal-button {
  width: 64rpx;
  height: 64rpx;
  color: #e1fdff;
  justify-content: center;
}

.top-actions {
  gap: 12rpx;
  flex: 0 0 auto;
}

.language-switch {
  min-width: 56rpx;
  height: 44rpx;
  padding: 0 14rpx;
  border: 2rpx solid #3a494b;
  border-radius: 8rpx;
  background: rgba(49, 53, 64, .72);
  color: #00f2ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 18rpx;
  line-height: 40rpx;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .title,
.zh-copy .mission-title,
.zh-copy .language-switch {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
}

.zh-copy .sort-button,
.zh-copy .mission-type,
.zh-copy .bounty,
.zh-copy .fact-label,
.zh-copy .fact-value,
.zh-copy .tag,
.zh-copy .status-label,
.zh-copy .ready-line,
.zh-copy .auto-button,
.zh-copy .nav-item {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.content {
  padding: 162rpx 22rpx 0;
}

.heading {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.title {
  color: #f0f3ff;
  font-size: 39rpx;
  line-height: 50rpx;
  font-weight: 800;
}

.subtitle {
  color: #dfe2f0;
  font-size: 23rpx;
  line-height: 32rpx;
  font-weight: 500;
  white-space: nowrap;
}

.sort-button {
  width: fit-content;
  height: 67rpx;
  margin-top: 28rpx;
  padding: 0 24rpx;
  border-radius: 4rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  color: #dfe2f0;
  gap: 14rpx;
  font-size: 31rpx;
  line-height: 40rpx;
  box-sizing: border-box;
}

.feedback {
  margin-top: 20rpx;
  padding: 14rpx 18rpx;
  border-radius: 6rpx;
  border: 2rpx solid rgba(58, 73, 75, .6);
  background: #141822;
  color: #b9cacb;
  font-size: 22rpx;
  line-height: 31rpx;
}

.feedback.success {
  color: #10b981;
  border-color: rgba(16, 185, 129, .35);
}

.feedback.warning {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, .35);
}

.mission-list {
  margin-top: 62rpx;
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.qualification-card {
  margin-top: 62rpx;
  min-height: 210rpx;
  padding: 28rpx 30rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(245, 158, 11, .45);
  background: rgba(245, 158, 11, .1);
  color: #f59e0b;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  box-sizing: border-box;
}

.qualification-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.qualification-title {
  color: #f0f3ff;
  font-size: 31rpx;
  line-height: 40rpx;
  font-weight: 800;
}

.qualification-desc {
  color: #dfe2f0;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 500;
}

.mission-card {
  position: relative;
  overflow: hidden;
  min-height: 376rpx;
  padding: 31rpx 29rpx 34rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
}

.mission-card.urgent {
  border-color: #f59e0b;
}

.corner-alert {
  position: absolute;
  top: 0;
  right: 0;
  width: 122rpx;
  height: 118rpx;
  padding: 19rpx 26rpx 0 0;
  background: rgba(245, 158, 11, .13);
  color: #f59e0b;
  text-align: right;
  font-family: "JetBrains Mono", monospace;
  font-size: 38rpx;
  line-height: 45rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.mission-head {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18rpx;
  align-items: start;
}

.mission-type {
  gap: 8rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 28rpx;
  font-weight: 900;
  letter-spacing: .28em;
}

.mission-type.warning {
  color: #f59e0b;
}

.mission-type.blue {
  color: #3b82f6;
}

.type-dot {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 9rpx;
}

.mission-title {
  display: block;
  margin-top: 10rpx;
  color: #f0f3ff;
  font-size: 29rpx;
  line-height: 39rpx;
  font-weight: 900;
  @include ellipsis(1);
}

.bounty {
  min-width: 56rpx;
  padding-right: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 20rpx;
  line-height: 28rpx;
  font-weight: 900;
  letter-spacing: .22em;
}

.bounty .amber,
.amber {
  color: #f59e0b;
}

.bounty .cyan,
.cyan {
  color: #00f2ff;
}

.bounty text:last-child {
  font-family: "Hanken Grotesk", "JetBrains Mono", sans-serif;
  font-size: 29rpx;
  line-height: 37rpx;
  letter-spacing: 0;
}

.facts {
  margin-top: 28rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 26rpx 34rpx;
}

.fact {
  min-width: 0;
}

.fact-label {
  gap: 7rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 28rpx;
  font-weight: 900;
  letter-spacing: .27em;
}

.fact-value {
  display: block;
  margin-top: 12rpx;
  color: #f0f3ff;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 24rpx;
  line-height: 34rpx;
  font-weight: 700;
}

.fact-value.route {
  font-family: Inter, "PingFang SC", sans-serif;
  letter-spacing: 0;
}

.blue-text {
  color: #3b82f6;
}

.tags {
  margin-top: 38rpx;
  padding-top: 24rpx;
  border-top: 2rpx solid #3a494b;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.tag {
  min-height: 43rpx;
  padding: 5rpx 17rpx;
  border-radius: 2rpx;
  border: 2rpx solid #3a494b;
  background: #1b1f2a;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 28rpx;
  font-weight: 900;
  letter-spacing: .26em;
  box-sizing: border-box;
}

.tag.license {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, .45);
}

.dispatch-bar {
  position: fixed;
  left: 22rpx;
  right: 22rpx;
  bottom: 148rpx;
  z-index: 55;
  min-height: 108rpx;
  padding: 12rpx;
  border-radius: 8rpx;
  border: 2rpx solid rgba(58, 73, 75, .62);
  background: rgba(30, 36, 51, .86);
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, .35);
  justify-content: space-between;
  box-sizing: border-box;
}

.status-copy {
  padding-left: 12rpx;
}

.status-label {
  display: block;
  color: #b9cacb;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 27rpx;
  font-weight: 900;
  letter-spacing: .24em;
}

.ready-line {
  margin-top: 4rpx;
  gap: 7rpx;
  color: #00f2ff;
  font-size: 29rpx;
  line-height: 38rpx;
  font-weight: 600;
}

.ready-dot {
  width: 11rpx;
  height: 11rpx;
  border-radius: 50%;
  background: #00f2ff;
  box-shadow: 0 0 12rpx rgba(0, 242, 255, .45);
}

.ready-dot.off {
  background: #849495;
  box-shadow: none;
}

.auto-button {
  height: 82rpx;
  min-width: 330rpx;
  padding: 0 23rpx;
  border-radius: 6rpx;
  background: #00f2ff;
  color: #002022;
  justify-content: center;
  gap: 11rpx;
  font-size: 35rpx;
  line-height: 45rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.auto-button.disabled {
  opacity: .55;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  height: 142rpx;
  padding: 12rpx 22rpx 0;
  border-top: 2rpx solid #3a494b;
  background: #0f131d;
  justify-content: space-around;
  box-sizing: border-box;
}

.nav-item {
  min-width: 94rpx;
  height: 108rpx;
  color: #b9cacb;
  flex-direction: column;
  justify-content: center;
  gap: 3rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 27rpx;
  font-weight: 900;
  letter-spacing: .1em;
}

.nav-item.active {
  min-width: 126rpx;
  border-radius: 31rpx;
  background: rgba(5, 102, 217, .32);
  color: #00f2ff;
}
</style>
