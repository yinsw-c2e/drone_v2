<template>
  <view class="claims-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="brand-wrap" hover-class="tap-press" @click="goProfile">
        <view class="avatar-button">
          <StitchIcon name="person" size="34rpx" />
        </view>
        <text class="brand">{{ copy.brand }}</text>
      </view>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="signal-button" hover-class="tap-press" @click="showToast(copy.signalReady)">
          <StitchIcon name="signal_cellular_alt" size="44rpx" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="hero-card">
        <image class="hero-image" src="/static/stitch/insurance-claims-hero-source.png" mode="aspectFill" />
        <view class="hero-fade" />
        <view class="scanline" />
        <view class="online-chip">
          <view class="online-dot" />
          <text>{{ copy.systemOnline }}</text>
        </view>
        <view class="hero-copy">
          <text class="hero-title">{{ copy.heroTitle }}</text>
          <text class="hero-subtitle">{{ copy.heroSubtitle }}</text>
        </view>
      </view>

      <view class="kpi-grid">
        <view class="kpi-card coverage" hover-class="tap-press" @click="showToast(copy.coverageSynced)">
          <view class="kpi-head">
            <StitchIcon name="shield" size="29rpx" />
            <text>{{ copy.coverageLabel }}</text>
          </view>
          <view class="coverage-value">
            <text>{{ coverageValue }}</text>
            <text class="unit">{{ coverageUnit }}</text>
          </view>
          <view class="meter">
            <view class="meter-fill cyan" :style="{ width: `${coveragePct}%` }" />
          </view>
        </view>

        <view class="kpi-card premium" hover-class="tap-press" @click="showToast(copy.premiumSynced)">
          <view class="kpi-head amber">
            <StitchIcon name="account_balance_wallet" size="29rpx" />
            <text>{{ copy.premiumLabel }}</text>
          </view>
          <text class="premium-value">{{ premiumValue }}</text>
          <view class="trend-row">
            <StitchIcon name="trending_up" size="23rpx" />
            <text>{{ policyCountText }}</text>
          </view>
        </view>

        <view class="kpi-card active-claim" hover-class="tap-press" @click="focusClaimSearch">
          <view class="active-head">
            <view class="kpi-head warning">
              <StitchIcon name="assignment_late" size="29rpx" />
              <text>{{ copy.activeClaimLabel }}</text>
            </view>
            <view class="active-badge">{{ activeClaimBadge }}</view>
          </view>
          <text class="claim-count">{{ activeClaimCount }}</text>
          <view class="segmented-meter">
            <view v-for="seg in 3" :key="seg" :class="['segment', activeClaimCount >= seg ? 'hot' : '']" />
          </view>
        </view>
      </view>

      <view class="section-title">
        <StitchIcon name="category" size="34rpx" />
        <text>{{ copy.planSection }}</text>
      </view>

      <view class="plan-list">
        <view v-for="plan in planCards" :key="plan.key" class="plan-card" hover-class="tap-press" @click="openPlan(plan)">
          <view class="plan-top">
            <view :class="['plan-icon', plan.tone]">
              <StitchIcon :name="plan.icon" size="43rpx" />
            </view>
            <view class="plan-copy">
              <text class="plan-name">{{ plan.name }}</text>
              <text class="plan-en">{{ plan.en }}</text>
            </view>
            <StitchIcon class="arrow" name="arrow_forward" size="39rpx" />
          </view>
          <text class="plan-desc">{{ plan.desc }}</text>
          <view v-if="plan.tags.length" class="tag-row">
            <text v-for="tag in plan.tags" :key="tag" class="tag">{{ tag }}</text>
          </view>
        </view>
      </view>

      <view class="panel policies-panel">
        <view class="panel-head">
          <text>{{ copy.currentPolicies }}</text>
          <view class="view-all" hover-class="tap-press" @click="showToast(copy.policyListSynced)">{{ copy.viewAll }}</view>
        </view>
        <view class="policy-list">
          <view v-if="!policyRows.length" class="policy-row">
            <view class="policy-left">
              <view class="policy-dot amber" />
              <view class="policy-copy">
                <text class="policy-id">{{ copy.noPolicyTitle }}</text>
                <text class="policy-route">{{ copy.noPolicyDesc }}</text>
              </view>
            </view>
          </view>
          <view v-for="row in policyRows" :key="row.id" class="policy-row" hover-class="tap-press" @click="openPolicy(row)">
            <view class="policy-left">
              <view :class="['policy-dot', row.tone]" />
              <view class="policy-copy">
                <text class="policy-id">{{ row.id }}</text>
                <text class="policy-route">{{ row.route }}</text>
              </view>
            </view>
            <view class="policy-right">
              <text class="policy-premium">{{ row.premium }}</text>
              <text :class="['policy-state', row.tone]">{{ row.state }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="panel timeline-panel">
        <view class="panel-head timeline-head">
          <text>{{ copy.claimProgress }}</text>
          <view class="search-box" hover-class="tap-press" @click="focusClaimSearch">
            <input v-model="claimKeyword" :placeholder="copy.searchPlaceholder" />
            <StitchIcon name="search" size="29rpx" />
          </view>
        </view>
        <view class="timeline">
          <view class="timeline-line" />
          <view v-for="step in timelineSteps" :key="step.key" :class="['timeline-step', step.state]">
            <view class="timeline-dot">
              <view v-if="step.state !== 'pending'" />
            </view>
            <view class="timeline-copy">
              <text class="step-title">{{ step.title }}</text>
              <text class="step-meta">{{ step.meta }}</text>
              <view v-if="step.action" class="supplement-btn" hover-class="tap-press" @click="handleTimelineAction(step)">
                <StitchIcon name="upload_file" size="25rpx" />
                <text>{{ step.action }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="showSupplementPanel" class="supplement-panel">
        <view class="supplement-panel-head">
          <view>
            <text class="supplement-title">{{ copy.materialPanelTitle }}</text>
            <text class="supplement-desc">{{ copy.materialPanelDesc }}</text>
          </view>
          <view class="supplement-close" hover-class="tap-press" @click="closeSupplementPanel">
            <StitchIcon name="close" size="30rpx" />
          </view>
        </view>
        <view class="material-list">
          <view
            v-for="material in materialOptions"
            :key="material.key"
            :class="['material-item', selectedMaterialKeys.includes(material.key) ? 'selected' : '', isMaterialSubmitted(material) ? 'submitted' : '']"
            hover-class="tap-press"
            @click="toggleMaterial(material.key)"
          >
            <view class="material-icon">
              <StitchIcon :name="material.icon" size="30rpx" />
            </view>
            <view class="material-copy">
              <text class="material-name">{{ material.name }}</text>
              <text class="material-desc">{{ material.desc }}</text>
            </view>
            <view class="material-state">
              <StitchIcon :name="isMaterialSubmitted(material) ? 'check_circle' : selectedMaterialKeys.includes(material.key) ? 'done' : 'add'" size="27rpx" />
            </view>
          </view>
        </view>
        <view class="supplement-actions">
          <view class="supplement-secondary" hover-class="tap-press" @click="closeSupplementPanel">{{ copy.cancel }}</view>
          <view class="supplement-primary" hover-class="tap-press" @click="submitSupplementMaterials">{{ copy.submitMaterials }}</view>
        </view>
      </view>

      <view v-if="message" class="feedback">
        <StitchIcon name="check_circle" size="29rpx" />
        <text>{{ message }}</text>
      </view>
    </view>

    <view class="bottom-nav">
      <view class="nav-item" hover-class="tap-press" @click="goHome">
        <StitchIcon name="grid_view" size="38rpx" />
        <text>{{ copy.home }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goTasks">
        <StitchIcon name="assignment" size="38rpx" />
        <text>{{ copy.tasks }}</text>
      </view>
      <view class="nav-item active" hover-class="tap-press" @click="showToast(copy.currentAssets)">
        <StitchIcon name="shield" size="40rpx" fill />
        <text>{{ copy.assets }}</text>
      </view>
      <view class="nav-item" hover-class="tap-press" @click="goProfile">
        <StitchIcon name="person" size="37rpx" />
        <text>{{ copy.profile }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { Role } from '@/models';
import { ensureRole } from '@/services/auth-guard';
import { claimAction } from '@/services/action-plans';
import { arbitrationClaim, createClaim, supplementClaimEvidence } from '@/services/app-flow';
import { cargoTypeLabel, claimLiabilityLabel, claimStatusLabel, policyStatusLabel } from '@/services/display-labels';
import { useLocaleStore } from '@/stores/locale';
import { useOrderStore } from '@/stores/order';
import { repo } from '@/utils/repo';

interface PlanCard {
  key: string;
  name: string;
  en: string;
  icon: string;
  tone: 'cyan' | 'amber' | 'warning' | 'green';
  desc: string;
  tags: string[];
}

interface PolicyRow {
  id: string;
  route: string;
  premium: string;
  state: string;
  tone: 'green' | 'amber';
}

interface TimelineStep {
  key: string;
  title: string;
  meta: string;
  state: 'done' | 'active' | 'pending';
  action?: string;
}

interface MaterialOption {
  key: string;
  name: string;
  desc: string;
  icon: string;
  evidence: string;
}

const orderStore = useOrderStore();
const localeStore = useLocaleStore();
ensureRole(Role.Client);

const claimKeyword = ref('');
const message = ref('');
const showSupplementPanel = ref(false);
const selectedMaterialKeys = ref<string[]>([]);
const CLAIMS_COPY = {
  en: {
    brand: 'SkyLink Logistics',
    signalReady: 'Signal ready',
    systemOnline: 'SYSTEM ONLINE',
    heroTitle: 'Claims Center',
    heroSubtitle: 'Asset Protection & Claims',
    coverageLabel: 'Coverage (CNY)',
    premiumLabel: 'Annual Premium (CNY)',
    coverageSynced: 'Coverage total synced',
    premiumSynced: 'Annual premium synced',
    policyCountSuffix: 'policies',
    noPolicyTitle: 'No policies yet',
    noPolicyDesc: 'Enable protection when launching a lift to generate one.',
    noPolicyClaimBlocked: 'No active policy is available. Enable insurance when launching a lift before filing a claim.',
    notFound: 'No matching case found.',
    noClaimMeta: 'No claims yet. Start a report from the current policy.',
    startClaim: 'Start Claim',
    activeClaimLabel: 'Active Claims',
    active: 'ACTIVE',
    planSection: 'Insurance Plans',
    currentPolicies: 'Current Policies',
    viewAll: 'VIEW ALL',
    policyListSynced: 'Policy list synced',
    claimProgress: 'Claim Progress',
    searchPlaceholder: 'Case ID',
    home: 'Home',
    tasks: 'Tasks',
    assets: 'Assets',
    profile: 'Profile',
    currentAssets: 'Current: Assets',
    generalName: 'General Cargo',
    generalEn: 'General Cargo',
    generalDesc: 'Covers loss and damage risk for standard land and air logistics.',
    generalTags: ['Base rate 0.05%', 'Fast claim'],
    valuableName: 'High-Value Coverage',
    valuableEn: 'High Value',
    valuableDesc: 'Full coverage for precision instruments and high-value electronics with escort monitoring.',
    valuableTags: ['Custom rate', 'Dedicated support'],
    hazmatName: 'Hazmat Coverage',
    hazmatEn: 'Hazmat',
    hazmatDesc: 'Special cargo insurance for compliant chemicals and flammables, including cleanup liability.',
    perishablesName: 'Fresh Goods Coverage',
    perishablesEn: 'Perishables',
    perishablesDesc: 'Cold-chain interruption and spoilage coverage linked to temperature telemetry.',
    policyActive: 'Active',
    policyPending: 'Pending Payment',
    routeFallbackA: 'Shanghai - Frankfurt (General)',
    routeFallbackB: 'Guangzhou - Dubai (Valuable)',
    reported: 'Claim Reported',
    investigating: 'Assessment In Progress',
    review: 'Claim Review',
    waitingReview: 'Waiting for previous step',
    addMaterials: 'Add Materials',
    expectedAssess: 'Field assessment expected within 2 business days',
    waitingInspect: 'Waiting for Assessment',
    reportedClaimMeta: 'Claim submitted. Waiting for insurer assessment.',
    investigatingClaimMeta: 'Assessment is in progress. Supplemental materials can still be synced.',
    payoutPrefix: 'Expected payout ',
    claimSubmitted: 'Claim submitted; investigation is now pending.',
    materialSynced: 'Supplemental materials synced; claim stage is unchanged.',
    materialChooseHint: 'Select at least one material to sync.',
    materialPanelTitle: 'Supplement Materials',
    materialPanelDesc: 'Choose the files already prepared for this claim.',
    materialEvidencePrefix: 'Submitted materials: ',
    materialEvidenceSuffix: ' items',
    materialPhotoName: 'Damage Photos',
    materialPhotoDesc: 'Cargo, package, pickup and unload site photos.',
    materialInvoiceName: 'Value Proof',
    materialInvoiceDesc: 'Cargo value proof, invoice or delivery note.',
    materialTrackName: 'Flight / Handover',
    materialTrackDesc: 'Flight path, loading receipt or handover record.',
    materialAlreadySynced: 'All selected materials were already synced.',
    cancel: 'Cancel',
    submitMaterials: 'Sync Materials',
    locatePrefix: 'Case ',
    locateSuffix: ' located.',
    searchHint: 'Enter a case ID. Add Materials only syncs files and does not advance the claim stage.',
    planSelectedSuffix: ' selected. It can be enabled when launching a lift.',
    arbitration: 'Claim moved to arbitration. Wait for admin handling.',
    languageToast: 'Switched to English',
  },
  zh: {
    brand: '天链物流',
    signalReady: '信号正常',
    systemOnline: '系统在线',
    heroTitle: '保险理赔中心',
    heroSubtitle: '资产保障与理赔',
    coverageLabel: '累计保额 (CNY)',
    premiumLabel: '本年度保费 (CNY)',
    coverageSynced: '累计保额已同步',
    premiumSynced: '年度保费已同步',
    policyCountSuffix: '张保单',
    noPolicyTitle: '暂无保单',
    noPolicyDesc: '发起吊运时开启保障后会在这里生成保单。',
    noPolicyClaimBlocked: '当前没有可报案保单。请先在发起吊运时开启保障，保单生成后才能报案。',
    notFound: '未找到对应案件。',
    noClaimMeta: '暂无理赔案件，可基于当前保单发起报案。',
    startClaim: '发起报案',
    activeClaimLabel: '处理中理赔',
    active: '处理中',
    planSection: '投保方案',
    currentPolicies: '当前保单',
    viewAll: '查看全部',
    policyListSynced: '保单列表已同步',
    claimProgress: '理赔进度查询',
    searchPlaceholder: '输入案件号',
    home: '首页',
    tasks: '任务',
    assets: '资产',
    profile: '我的',
    currentAssets: '当前：资产',
    generalName: '普货保险',
    generalEn: '普货保障',
    generalDesc: '覆盖常规陆运、空运物流中的丢失、损坏风险。',
    generalTags: ['基础费率 0.05%', '极速理赔'],
    valuableName: '贵重物品险',
    valuableEn: '高价值保障',
    valuableDesc: '针对精密仪器、高价值电子产品提供全额保障，含押运监控。',
    valuableTags: ['定制费率', '专属客服'],
    hazmatName: '危险品承保',
    hazmatEn: '特货保障',
    hazmatDesc: '合规化学品、易燃易爆品特种运输保险，含环境污染清理责任。',
    perishablesName: '农资生鲜险',
    perishablesEn: '生鲜保障',
    perishablesDesc: '冷链断链、变质腐烂专属保障，联动温控遥测数据自动理赔。',
    policyActive: '已生效',
    policyPending: '待支付',
    routeFallbackA: '上海 - 法兰克福 (普货)',
    routeFallbackB: '广州 - 迪拜 (贵重)',
    reported: '报案受理',
    investigating: '勘察定损中',
    review: '理赔审核',
    waitingReview: '等待前置节点完成',
    addMaterials: '补充材料',
    expectedAssess: '预计2个工作日内完成现场勘测',
    waitingInspect: '等待勘察',
    reportedClaimMeta: '报案已提交，等待保险处理。',
    investigatingClaimMeta: '正在勘察定损，可继续补充资料。',
    payoutPrefix: '预计赔付 ',
    claimSubmitted: '报案已提交，理赔流程进入待调查。',
    materialSynced: '补充材料已同步，理赔阶段保持不变。',
    materialChooseHint: '请先选择至少一项要补充的材料。',
    materialPanelTitle: '补充理赔材料',
    materialPanelDesc: '选择本次要同步到案件里的资料。',
    materialEvidencePrefix: '已提交材料 ',
    materialEvidenceSuffix: ' 项',
    materialPhotoName: '事故现场照片',
    materialPhotoDesc: '货损、包装、装卸现场照片。',
    materialInvoiceName: '货值/签收凭证',
    materialInvoiceDesc: '发票、货值证明、签收或交接单。',
    materialTrackName: '飞行轨迹记录',
    materialTrackDesc: '飞行轨迹、装卸节点、异常记录。',
    materialAlreadySynced: '所选材料此前已同步。',
    cancel: '取消',
    submitMaterials: '同步材料',
    locatePrefix: '案件 ',
    locateSuffix: ' 已定位。',
    searchHint: '请输入案件号；补充材料只同步资料，不推进理赔阶段。',
    planSelectedSuffix: ' 方案已选中，可在发起吊运时启用。',
    arbitration: '理赔已进入仲裁，请等待后台处理。',
    languageToast: '已切换为中文',
  },
} as const;
const copy = computed(() => CLAIMS_COPY[localeStore.locale]);

const order = computed(() => {
  const active = orderStore.activeOrder;
  if (active?.policyId) return active;
  const latestPolicy = repo.policies.all().reverse()[0];
  return latestPolicy ? (repo.orders.find(latestPolicy.orderId) ?? active) : active;
});
const rawClaims = computed(() => order.value ? repo.claims.where((c) => c.orderId === order.value!.id).reverse() : []);
const claims = computed(() => {
  const seen = new Set<string>();
  return rawClaims.value.filter((claim) => {
    const key = `${claim.policyId}:${claim.orderId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
});
const locatedClaimId = ref('');
const allClaims = computed(() => repo.claims.all().slice().reverse());
const primaryClaim = computed(() => {
  const located = locatedClaimId.value ? repo.claims.find(locatedClaimId.value) : undefined;
  return located ?? claims.value[0];
});
const activeClaimCount = computed(() => allClaims.value.filter((claim) => claim.status !== 'paid').length);
const activeClaimBadge = computed(() => `${activeClaimCount.value} ${copy.value.active}`);
const claimEvidenceSummary = computed(() => {
  const claim = primaryClaim.value;
  return claim ? `${copy.value.materialEvidencePrefix}${claim.evidence.length}${copy.value.materialEvidenceSuffix}` : '';
});

const allPolicies = computed(() => repo.policies.all().slice().reverse());
const totalCoverageCent = computed(() => allPolicies.value.reduce((sum, item) => sum + item.insuredAmountCent, 0));
const totalPremiumCent = computed(() => allPolicies.value.reduce((sum, item) => sum + item.premiumCent, 0));
// 保额超过百万按 M 显示，否则直接显示元
const coverageValue = computed(() => {
  const yuan = totalCoverageCent.value / 100;
  if (yuan >= 1_000_000) return (yuan / 1_000_000).toFixed(1);
  return Math.round(yuan).toLocaleString('en-US');
});
const coverageUnit = computed(() => (totalCoverageCent.value / 100 >= 1_000_000 ? 'M' : 'CNY'));
const coveragePct = computed(() => Math.min(100, Math.max(6, Math.round((totalCoverageCent.value / 100 / 12_500_000) * 100))));
const premiumValue = computed(() => Math.round(totalPremiumCent.value / 100).toLocaleString('en-US'));
const policyCountText = computed(() => `${allPolicies.value.length} ${copy.value.policyCountSuffix}`);

const planCards = computed<PlanCard[]>(() => [
  {
    key: 'general',
    name: copy.value.generalName,
    en: copy.value.generalEn,
    icon: 'local_shipping',
    tone: 'cyan',
    desc: copy.value.generalDesc,
    tags: [...copy.value.generalTags],
  },
  {
    key: 'valuable',
    name: copy.value.valuableName,
    en: copy.value.valuableEn,
    icon: 'diamond',
    tone: 'amber',
    desc: copy.value.valuableDesc,
    tags: [...copy.value.valuableTags],
  },
  {
    key: 'hazmat',
    name: copy.value.hazmatName,
    en: copy.value.hazmatEn,
    icon: 'warning',
    tone: 'warning',
    desc: copy.value.hazmatDesc,
    tags: [],
  },
  {
    key: 'perishables',
    name: copy.value.perishablesName,
    en: copy.value.perishablesEn,
    icon: 'agriculture',
    tone: 'green',
    desc: copy.value.perishablesDesc,
    tags: [],
  },
]);

const materialOptions = computed<MaterialOption[]>(() => [
  {
    key: 'photos',
    name: copy.value.materialPhotoName,
    desc: copy.value.materialPhotoDesc,
    icon: 'photo_camera',
    evidence: copy.value.materialPhotoName,
  },
  {
    key: 'invoice',
    name: copy.value.materialInvoiceName,
    desc: copy.value.materialInvoiceDesc,
    icon: 'receipt_long',
    evidence: copy.value.materialInvoiceName,
  },
  {
    key: 'track',
    name: copy.value.materialTrackName,
    desc: copy.value.materialTrackDesc,
    icon: 'route',
    evidence: copy.value.materialTrackName,
  },
]);

const policyRows = computed<PolicyRow[]>(() => allPolicies.value.slice(0, 4).map((item) => {
  const linkedOrder = repo.orders.find(item.orderId);
  const route = linkedOrder
    ? `${linkedOrder.from.address ?? '起点'} - ${linkedOrder.to.address ?? '终点'} (${cargoTypeLabel(item.cargoType)})`
    : `${item.orderId.toUpperCase()} (${cargoTypeLabel(item.cargoType)})`;
  return {
    id: item.id.toUpperCase(),
    route,
    premium: formatCurrency(item.premiumCent),
    state: item.status === 'active' ? copy.value.policyActive : policyStatusLabel(item.status),
    tone: item.status === 'active' ? 'green' : 'amber',
  };
}));

const timelineSteps = computed<TimelineStep[]>(() => {
  const claim = primaryClaim.value;
  if (!claim) {
    return [
      { key: 'reported', title: copy.value.reported, meta: copy.value.noClaimMeta, state: 'pending', action: copy.value.startClaim },
      { key: 'investigating', title: copy.value.investigating, meta: copy.value.waitingReview, state: 'pending' },
      { key: 'review', title: copy.value.review, meta: copy.value.waitingReview, state: 'pending' },
    ];
  }

  const status = claim.status;
  const currentAction = claimAction(claim);
  return [
    { key: 'reported', title: '报案受理', meta: `${claim.id.toUpperCase()} · ${formatDateTime(claim.reportedAt)}`, state: 'done' },
    {
      key: 'investigating',
      title: status === 'reported' ? copy.value.waitingInspect : claimStatusLabel(status),
      meta: claim.liability
        ? claimLiabilityLabel(claim.liability)
        : `${status === 'reported' ? copy.value.reportedClaimMeta : copy.value.investigatingClaimMeta} · ${claimEvidenceSummary.value}`,
      state: status === 'reported' || status === 'investigating' ? 'active' : 'done',
      action: currentAction.terminal ? undefined : copy.value.addMaterials,
    },
    {
      key: 'review',
      title: status === 'paid' || status === 'arbitration' ? claimStatusLabel(status) : copy.value.review,
      meta: claim.payoutCent ? `${copy.value.payoutPrefix}${formatCurrency(claim.payoutCent)}` : copy.value.waitingReview,
      state: status === 'assessed' || status === 'paid' || status === 'arbitration' ? 'active' : 'pending',
    },
  ];
});

function formatCurrency(fen: number) {
  return `¥${(fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startClaim() {
  const current = order.value;
  if (!current?.policyId) {
    message.value = copy.value.noPolicyClaimBlocked;
    return;
  }

  if (!claims.value.length) {
    const claim = createClaim(current.id, ['现场照片入口', '飞行数据入口']);
    locatedClaimId.value = claim.id;
    message.value = copy.value.claimSubmitted;
    return;
  }

  openSupplementPanel();
}

function openSupplementPanel() {
  const claim = primaryClaim.value ?? claims.value[0];
  if (!claim) {
    message.value = copy.value.noClaimMeta;
    return;
  }

  selectedMaterialKeys.value = [];
  showSupplementPanel.value = true;
  message.value = '';
}

function isMaterialSubmitted(material: MaterialOption) {
  const claim = primaryClaim.value ?? claims.value[0];
  return Boolean(claim?.evidence.includes(material.evidence));
}

function toggleMaterial(key: string) {
  const selected = new Set(selectedMaterialKeys.value);
  if (selected.has(key)) selected.delete(key);
  else selected.add(key);
  selectedMaterialKeys.value = [...selected];
}

function closeSupplementPanel() {
  showSupplementPanel.value = false;
  selectedMaterialKeys.value = [];
}

function submitSupplementMaterials() {
  const claim = primaryClaim.value ?? claims.value[0];
  if (!claim) {
    message.value = copy.value.noClaimMeta;
    return;
  }

  const selected = materialOptions.value.filter((item) => selectedMaterialKeys.value.includes(item.key));
  if (!selected.length) {
    message.value = copy.value.materialChooseHint;
    return;
  }

  let updated = claim;
  let changed = false;
  selected.forEach((item) => {
    const before = updated.evidence.length;
    updated = supplementClaimEvidence(updated.id, item.evidence);
    if (updated.evidence.length > before) changed = true;
  });

  locatedClaimId.value = updated.id;
  showSupplementPanel.value = false;
  selectedMaterialKeys.value = [];
  message.value = changed ? `${copy.value.materialSynced} ${claimEvidenceSummary.value}` : copy.value.materialAlreadySynced;
}

function handleTimelineAction(step: TimelineStep) {
  if (!primaryClaim.value && step.key === 'reported') {
    startClaim();
    return;
  }

  openSupplementPanel();
}

function focusClaimSearch() {
  const keyword = claimKeyword.value.trim().toLowerCase();
  if (!keyword) {
    locatedClaimId.value = '';
    message.value = copy.value.searchHint;
    return;
  }
  const hit = repo.claims.all().find((claim) => claim.id.toLowerCase().includes(keyword) || claim.orderId.toLowerCase().includes(keyword));
  if (hit) {
    locatedClaimId.value = hit.id;
    message.value = `${copy.value.locatePrefix}${hit.id.toUpperCase()}${copy.value.locateSuffix}`;
    return;
  }
  locatedClaimId.value = '';
  message.value = copy.value.notFound;
}

function openPlan(plan: PlanCard) {
  message.value = `${plan.name}${copy.value.planSelectedSuffix}`;
}

function openPolicy(row: PolicyRow) {
  message.value = `${row.id}：${row.state}`;
}

function showToast(title: string) {
  uni.showToast({ title, icon: 'none' });
}

function goHome() {
  uni.reLaunch({ url: '/pages-client/home/index' });
}

function goTasks() {
  uni.navigateTo({ url: '/pages-client/order/index' });
}

function goProfile() {
  uni.navigateTo({ url: '/pages/profile/index' });
}

function arbitrateCurrentClaim() {
  const claim = claims.value[0];
  if (!claim) return;
  arbitrationClaim(claim.id);
  message.value = copy.value.arbitration;
}

function toggleLocale() {
  localeStore.toggleLocale();
  uni.showToast({ title: copy.value.languageToast, icon: 'none' });
}

defineExpose({ arbitrateCurrentClaim });
</script>

<style lang="scss" scoped>
.claims-page {
  min-height: 100vh;
  padding-bottom: 157rpx;
  box-sizing: border-box;
  overflow-x: hidden;
  color: #dfe2f0;
  background-color: #f3f7fa;
  background-image:
    linear-gradient(0deg, rgba(58, 73, 75, .13) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(58, 73, 75, .13) 1rpx, transparent 1rpx);
  background-size: 47rpx 47rpx;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 60;
  height: 122rpx;
  padding: 0 32rpx;
  border-bottom: 2rpx solid #3a494b;
  background: #0b0e14;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 22rpx;
  min-width: 0;
  flex: 1;
}

.avatar-button {
  width: 54rpx;
  height: 54rpx;
  border-radius: 27rpx;
  border: 2rpx solid #3a494b;
  background: #171b26;
  color: #b9cacb;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.brand {
  color: #00f2ff;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 38rpx;
  line-height: 44rpx;
  font-weight: 900;
  white-space: nowrap;
}

.top-actions {
  display: flex;
  align-items: center;
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

.signal-button {
  width: 48rpx;
  height: 48rpx;
  color: #e1fdff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .brand,
.zh-copy .language-switch,
.zh-copy .online-chip,
.zh-copy .kpi-head,
.zh-copy .trend-row,
.zh-copy .active-badge,
.zh-copy .plan-en,
.zh-copy .tag,
.zh-copy .view-all,
.zh-copy .policy-id,
.zh-copy .policy-route,
.zh-copy .step-meta,
.zh-copy .material-name,
.zh-copy .material-desc,
.zh-copy .nav-item {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.content {
  padding: 156rpx 32rpx 0;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
}

.hero-card {
  position: relative;
  height: 364rpx;
  border-radius: 10rpx;
  border: 2rpx solid #3a494b;
  overflow: hidden;
  background: #1e2433;
  box-sizing: border-box;
}

.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: .66;
  filter: grayscale(1) contrast(1.1) brightness(.82);
}

.hero-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 19, 29, .12) 0%, rgba(15, 19, 29, .5) 46%, #0b0e14 100%);
}

.scanline {
  position: absolute;
  left: 0;
  right: 0;
  top: 64rpx;
  height: 4rpx;
  opacity: .7;
  background: linear-gradient(90deg, transparent, rgba(0, 242, 255, .55), transparent);
}

.online-chip {
  position: absolute;
  right: 28rpx;
  top: 29rpx;
  height: 41rpx;
  padding: 0 15rpx;
  background: rgba(30, 36, 51, .88);
  border: 2rpx solid rgba(58, 73, 75, .75);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 23rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
}

.online-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #10b981;
}

.hero-copy {
  position: absolute;
  left: 30rpx;
  bottom: 29rpx;
  display: flex;
  flex-direction: column;
}

.hero-title {
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: 42rpx;
  line-height: 51rpx;
  font-weight: 900;
}

.hero-subtitle {
  color: #dfe2f0;
  font-size: 24rpx;
  line-height: 33rpx;
}

.kpi-grid {
  margin-top: 50rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 31rpx;
}

.kpi-card {
  border-radius: 5rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  box-sizing: border-box;
  box-shadow: 0 4rpx 0 rgba(0, 0, 0, .08);
}

.kpi-card.coverage,
.kpi-card.premium {
  min-height: 248rpx;
  padding: 31rpx 27rpx 25rpx;
}

.kpi-head {
  color: #b9cacb;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 25rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
}

.kpi-head :deep(.stitch-icon) {
  color: #00f2ff;
  flex: 0 0 auto;
}

.kpi-head.amber :deep(.stitch-icon) {
  color: #fed83a;
}

.kpi-head.warning :deep(.stitch-icon) {
  color: #f59e0b;
}

.coverage-value {
  margin-top: 31rpx;
  color: #dfe2f0;
  font-family: "Hanken Grotesk", "JetBrains Mono", sans-serif;
  font-size: 71rpx;
  line-height: 72rpx;
  font-weight: 900;
  display: flex;
  align-items: baseline;
}

.coverage-value .unit {
  font-size: 42rpx;
  line-height: 40rpx;
}

.meter {
  margin-top: 26rpx;
  height: 7rpx;
  border-radius: 999rpx;
  background: #313540;
  overflow: hidden;
}

.meter-fill {
  width: 76%;
  height: 100%;
  background: #00f2ff;
}

.premium-value {
  display: block;
  margin-top: 30rpx;
  color: #dfe2f0;
  font-size: 44rpx;
  line-height: 53rpx;
  font-weight: 800;
}

.trend-row {
  margin-top: 17rpx;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 5rpx;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 25rpx;
  letter-spacing: 3rpx;
  font-weight: 900;
}

.active-claim {
  grid-column: 1 / -1;
  min-height: 207rpx;
  padding: 31rpx 28rpx 26rpx;
}

.active-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.active-badge {
  height: 38rpx;
  padding: 0 15rpx;
  background: #313540;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 22rpx;
  letter-spacing: 3rpx;
  font-weight: 900;
}

.claim-count {
  display: block;
  margin-top: 19rpx;
  color: #dfe2f0;
  font-size: 44rpx;
  line-height: 51rpx;
  font-weight: 800;
}

.segmented-meter {
  margin-top: 27rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5rpx;
}

.segment {
  height: 7rpx;
  border-radius: 999rpx;
  background: #313540;
}

.segment.hot {
  background: #f59e0b;
}

.section-title {
  margin-top: 45rpx;
  margin-bottom: 29rpx;
  color: #b9cacb;
  display: flex;
  align-items: center;
  gap: 11rpx;
  font-size: 32rpx;
  line-height: 39rpx;
  font-weight: 800;
}

.plan-list {
  display: grid;
  gap: 30rpx;
}

.plan-card {
  min-height: 305rpx;
  padding: 31rpx 27rpx 27rpx;
  border-radius: 8rpx;
  border: 2rpx solid #3a494b;
  background: #1e2433;
  color: #dfe2f0;
  box-sizing: border-box;
}

.plan-top {
  display: flex;
  align-items: flex-start;
  gap: 22rpx;
}

.plan-icon {
  width: 75rpx;
  height: 75rpx;
  border: 2rpx solid rgba(58, 73, 75, .75);
  background: #1b1f2a;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 75rpx;
}

.plan-icon.cyan {
  color: #dfe2f0;
}

.plan-icon.amber,
.plan-icon.warning {
  color: #fed83a;
  border-color: rgba(245, 158, 11, .45);
}

.plan-icon.green {
  color: #10b981;
  border-color: rgba(16, 185, 129, .45);
}

.plan-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.plan-name {
  color: #dfe2f0;
  font-size: 30rpx;
  line-height: 38rpx;
  font-weight: 800;
}

.plan-en {
  margin-top: 5rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 26rpx;
  letter-spacing: 6rpx;
  font-weight: 700;
}

.arrow {
  color: #dfe2f0;
  flex: 0 0 auto;
}

.plan-desc {
  display: block;
  margin-top: 31rpx;
  color: #dfe2f0;
  font-size: 24rpx;
  line-height: 36rpx;
}

.tag-row {
  margin-top: 24rpx;
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.tag {
  height: 40rpx;
  padding: 0 13rpx;
  background: #171b26;
  border: 2rpx solid #3a494b;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  font-family: "JetBrains Mono", monospace;
  font-size: 19rpx;
  line-height: 24rpx;
  letter-spacing: 2rpx;
  font-weight: 800;
}

.panel {
  margin-top: 45rpx;
  padding: 31rpx 28rpx;
  border-radius: 9rpx;
  border: 2rpx solid #3a494b;
  background: #141822;
  color: #dfe2f0;
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
}

.panel-head {
  min-height: 46rpx;
  padding-bottom: 21rpx;
  border-bottom: 2rpx solid #3a494b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  font-size: 28rpx;
  line-height: 36rpx;
  font-weight: 800;
}

.view-all {
  color: #00f2ff;
  font-family: "JetBrains Mono", monospace;
  font-size: 18rpx;
  line-height: 25rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
}

.policy-list {
  margin-top: 30rpx;
  display: grid;
  gap: 0;
  min-width: 0;
  max-width: 100%;
}

.policy-row {
  width: 100%;
  max-width: 100%;
  min-height: 95rpx;
  padding: 18rpx 25rpx;
  border: 2rpx solid rgba(58, 73, 75, .58);
  background: #171b26;
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: 18rpx;
  box-sizing: border-box;
}

.policy-row + .policy-row {
  border-top-width: 0;
}

.policy-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.policy-copy {
  min-width: 0;
  flex: 1;
}

.policy-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex: 0 0 12rpx;
}

.policy-dot.green {
  background: #10b981;
}

.policy-dot.amber {
  background: #f59e0b;
}

.policy-id,
.policy-premium,
.policy-state {
  display: block;
  white-space: nowrap;
}

.policy-id {
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 23rpx;
  line-height: 29rpx;
  font-weight: 800;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.policy-route {
  display: block;
  margin-top: 4rpx;
  color: #dfe2f0;
  font-family: "JetBrains Mono", monospace;
  font-size: 17rpx;
  line-height: 23rpx;
  letter-spacing: 2rpx;
  font-weight: 700;
  max-width: 100%;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.policy-right {
  text-align: right;
  min-width: 108rpx;
  justify-self: end;
}

.policy-premium {
  color: #dfe2f0;
  font-size: 24rpx;
  line-height: 31rpx;
  font-weight: 700;
}

.policy-state {
  margin-top: 4rpx;
  color: #dfe2f0;
  font-size: 18rpx;
  line-height: 23rpx;
  font-weight: 800;
}

.policy-state.amber {
  color: #f59e0b;
}

.timeline-panel {
  margin-top: 47rpx;
  margin-bottom: 45rpx;
}

.timeline-head {
  align-items: center;
}

.search-box {
  width: 245rpx;
  height: 58rpx;
  padding: 0 11rpx 0 16rpx;
  border: 2rpx solid #3a494b;
  background: #262a34;
  display: flex;
  align-items: center;
  gap: 7rpx;
  box-sizing: border-box;
  flex: 0 0 245rpx;
}

.search-box input {
  min-width: 0;
  flex: 1;
  height: 54rpx;
  color: #dfe2f0;
  font-size: 22rpx;
  line-height: 30rpx;
}

.search-box :deep(.uni-input-placeholder) {
  color: rgba(185, 202, 203, .5);
}

.search-box :deep(.stitch-icon) {
  color: #b9cacb;
}

.timeline {
  position: relative;
  margin-top: 31rpx;
  padding: 0 0 0 50rpx;
}

.timeline-line {
  position: absolute;
  left: 23rpx;
  top: 18rpx;
  bottom: 20rpx;
  width: 4rpx;
  background: #3a494b;
}

.timeline-step {
  position: relative;
  min-height: 86rpx;
  margin-bottom: 34rpx;
}

.timeline-step:last-child {
  margin-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -50rpx;
  top: 1rpx;
  width: 46rpx;
  height: 46rpx;
  border-radius: 50%;
  border: 4rpx solid #3a494b;
  background: #313540;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  z-index: 2;
}

.timeline-step.done .timeline-dot,
.timeline-step.active .timeline-dot {
  border-color: #00f2ff;
  background: #141822;
}

.timeline-step.active .timeline-dot {
  box-shadow: 0 0 16rpx rgba(0, 242, 255, .65);
}

.timeline-dot view {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #00f2ff;
}

.step-title,
.step-meta {
  display: block;
}

.step-title {
  color: #dfe2f0;
  font-size: 27rpx;
  line-height: 35rpx;
  font-weight: 800;
}

.timeline-step.active .step-title {
  color: #00f2ff;
}

.timeline-step.pending .step-title {
  color: #b9cacb;
}

.step-meta {
  margin-top: 7rpx;
  color: #b9cacb;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: 19rpx;
  line-height: 25rpx;
  letter-spacing: 2rpx;
  font-weight: 800;
}

.timeline-step.pending .step-meta {
  opacity: .55;
}

.supplement-btn {
  margin-top: 15rpx;
  width: 151rpx;
  height: 43rpx;
  border: 2rpx solid #849495;
  color: #dfe2f0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 19rpx;
  line-height: 24rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.supplement-panel {
  margin: -18rpx 0 45rpx;
  padding: 25rpx;
  border: 2rpx solid rgba(0, 242, 255, .52);
  background: #101721;
  color: #dfe2f0;
  box-sizing: border-box;
}

.supplement-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.supplement-title,
.supplement-desc {
  display: block;
}

.supplement-title {
  color: #00f2ff;
  font-size: 27rpx;
  line-height: 35rpx;
  font-weight: 900;
}

.supplement-desc {
  margin-top: 6rpx;
  color: #b9cacb;
  font-size: 20rpx;
  line-height: 29rpx;
}

.supplement-close {
  width: 50rpx;
  height: 50rpx;
  border: 2rpx solid rgba(132, 148, 149, .58);
  color: #b9cacb;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 50rpx;
}

.material-list {
  margin-top: 22rpx;
  display: grid;
  gap: 14rpx;
}

.material-item {
  min-height: 96rpx;
  padding: 17rpx;
  border: 2rpx solid rgba(58, 73, 75, .78);
  background: #171b26;
  display: grid;
  grid-template-columns: 48rpx minmax(0, 1fr) 34rpx;
  align-items: center;
  gap: 16rpx;
  box-sizing: border-box;
}

.material-item.selected {
  border-color: #00f2ff;
  background: rgba(0, 242, 255, .09);
}

.material-item.submitted {
  border-color: rgba(16, 185, 129, .52);
}

.material-icon,
.material-state {
  color: #00f2ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.material-copy {
  min-width: 0;
}

.material-name,
.material-desc {
  display: block;
}

.material-name {
  color: #dfe2f0;
  font-size: 23rpx;
  line-height: 31rpx;
  font-weight: 800;
}

.material-desc {
  margin-top: 3rpx;
  color: #b9cacb;
  font-size: 19rpx;
  line-height: 27rpx;
}

.material-item.submitted .material-state {
  color: #10b981;
}

.supplement-actions {
  margin-top: 22rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.supplement-secondary,
.supplement-primary {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  line-height: 32rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.supplement-secondary {
  border: 2rpx solid #3a494b;
  color: #dfe2f0;
  background: #171b26;
}

.supplement-primary {
  border: 2rpx solid #00f2ff;
  color: #061018;
  background: #00f2ff;
}

.feedback {
  margin: -24rpx 0 45rpx;
  min-height: 56rpx;
  padding: 11rpx 18rpx;
  border: 2rpx solid rgba(16, 185, 129, .42);
  background: rgba(16, 185, 129, .12);
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 23rpx;
  line-height: 31rpx;
  box-sizing: border-box;
}

.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  height: 148rpx;
  padding: 14rpx 16rpx calc(17rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid #3a494b;
  border-radius: 12rpx 12rpx 0 0;
  background: #0f131d;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  gap: 3rpx;
  box-sizing: border-box;
}

.nav-item {
  min-width: 0;
  height: 82rpx;
  border-radius: 23rpx;
  color: #dfe2f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  font-family: "JetBrains Mono", monospace;
}

.nav-item.active {
  color: #00f2ff;
  background: rgba(5, 102, 217, .38);
}

.nav-item text {
  font-size: 19rpx;
  line-height: 22rpx;
  letter-spacing: 4rpx;
  font-weight: 900;
}

.tap-press {
  opacity: .72;
  transform: scale(.985);
}

@media (min-width: 900px) {
  .content {
    max-width: 686rpx;
    margin: 0 auto;
  }
}
</style>
