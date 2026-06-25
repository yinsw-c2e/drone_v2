<template>
  <view class="auth-page" :class="{ 'zh-copy': localeStore.isZh }">
    <view class="topbar">
      <view class="icon-btn" hover-class="tap-press" @click="back">
        <StitchIcon name="arrow_back" size="22px" />
      </view>
      <text class="page-title">{{ copy.pageTitle }}</text>
      <view class="top-actions">
        <view class="language-switch" hover-class="tap-press" @click="toggleLocale">
          <text>{{ localeStore.toggleLabel }}</text>
        </view>
        <view class="icon-btn help" hover-class="tap-press" @click="showHelp">
          <StitchIcon name="help_outline" size="22px" />
        </view>
      </view>
    </view>

    <scroll-view class="content" scroll-y>
      <view class="progress-card">
        <view class="progress-heading">
          <StitchIcon name="linear_scale" size="16px" />
          <text>{{ copy.progressHeading }}</text>
        </view>

        <view class="stepper">
          <view class="step-line" />
          <view class="step-line active" />
          <view class="step completed">
            <view class="step-dot complete-dot">
              <StitchIcon name="check" size="18px" />
            </view>
            <text>{{ copy.stepBasic }}</text>
          </view>
          <view :class="['step', docsApproved ? 'completed' : 'current']">
            <view v-if="docsApproved" class="step-dot complete-dot">
              <StitchIcon name="check" size="18px" />
            </view>
            <view v-else class="step-dot current-dot"><text>2</text></view>
            <text>{{ copy.stepDocs }}</text>
          </view>
          <view class="step pending">
            <view class="step-dot pending-dot"><text>3</text></view>
            <text>{{ copy.stepFace }}</text>
          </view>
        </view>

        <view v-if="latest" :class="['audit-status', latestTone]">
          <StitchIcon :name="latestIcon" size="16px" />
          <view class="audit-status-copy">
            <text>{{ copy.latestStatusPrefix }}{{ latestStatusLabel }} · {{ latest.id.toUpperCase() }}</text>
            <text v-if="latest.status === AuditStatus.Rejected" class="audit-hint">{{ copy.rejectedHint }}</text>
          </view>
        </view>
      </view>

      <view class="form-card">
        <view class="form-head">
          <StitchIcon name="verified" size="22px" />
          <text>{{ copy.formTitle }}</text>
        </view>

        <view class="form-body">
          <view class="section-block">
            <text class="section-label">{{ copy.identitySection }}</text>
            <view class="field">
              <text class="field-label">{{ copy.realName }} <text class="required">*</text></text>
              <input v-model="form.realName" class="field-input" :placeholder="copy.realNamePlaceholder" />
            </view>
            <view class="field">
              <text class="field-label">{{ copy.idNo }} <text class="required">*</text></text>
              <input v-model="form.idNo" class="field-input mono" :placeholder="copy.idNoPlaceholder" />
            </view>

            <view class="upload-grid">
              <view :class="['upload-box', uploads.portrait ? 'uploaded' : '']" hover-class="tap-press" @click="chooseUpload('portrait')">
                <StitchIcon :name="uploads.portrait ? 'check_circle' : 'add_photo_alternate'" size="26px" />
                <text>{{ uploads.portrait ? copy.uploadedLabel : copy.idPortrait }}</text>
              </view>
              <view :class="['upload-box', uploads.emblem ? 'uploaded' : '']" hover-class="tap-press" @click="chooseUpload('emblem')">
                <StitchIcon :name="uploads.emblem ? 'check_circle' : 'add_photo_alternate'" size="26px" />
                <text>{{ uploads.emblem ? copy.uploadedLabel : copy.idEmblem }}</text>
              </view>
            </view>
          </view>

          <view class="section-block cargo-section">
            <text class="section-label">{{ copy.cargoSection }}</text>
            <text class="section-desc">{{ copy.cargoDesc }}</text>
            <view class="chip-wrap">
              <view
                v-for="item in cargoOptions"
                :key="item.key"
                :class="['cargo-chip', selectedCargo.includes(item.key) ? 'selected' : '']"
                hover-class="tap-press"
                @click="toggleCargo(item.key)"
              >
                <StitchIcon :name="item.icon" size="24px" />
                <text>{{ item.label }}</text>
              </view>
            </view>
          </view>

          <view class="consent-box" hover-class="tap-press" @click="creditConsent = !creditConsent">
            <view :class="['checkbox', creditConsent ? 'checked' : '']">
              <StitchIcon v-if="creditConsent" name="check" size="18px" />
            </view>
            <view class="consent-copy">
              <text class="consent-title">{{ copy.consentTitle }}</text>
              <text class="consent-text">{{ copy.consentText }}</text>
              <text class="consent-link" @click.stop="showAgreement">{{ copy.consentLink }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view v-if="feedback" :class="['feedback-bar', feedbackTone]">
      <text>{{ feedback }}</text>
    </view>

    <view class="bottom-action">
      <view class="identity-switch-btn" hover-class="tap-press" @click="switchIdentity">
        <StitchIcon name="switch_account" size="22px" />
        <text>{{ copy.switchIdentity }}</text>
      </view>
      <view :class="['submit-btn', submitting ? 'disabled' : '']" hover-class="tap-press" @click="submitCertificationForm">
        <text>{{ primaryText }}</text>
        <StitchIcon name="send" size="22px" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import StitchIcon from '@/components/StitchIcon.vue';
import { AuditStatus, Role } from '@/models';
import { latestCertification, submitCertification } from '@/services/app-flow';
import { auditStatusLabel } from '@/services/display-labels';
import { useLocaleStore } from '@/stores/locale';
import { useUserStore } from '@/stores/user';

interface CargoOption {
  key: string;
  label: string;
  icon: string;
}

const userStore = useUserStore();
const localeStore = useLocaleStore();
const role = computed(() => userStore.user.currentRole === Role.Admin ? Role.Client : userStore.user.currentRole);

const AUTH_COPY = {
  en: {
    pageTitle: 'Certification',
    progressHeading: 'CERTIFICATION PROGRESS',
    stepBasic: 'Basic Info',
    stepDocs: 'Credentials',
    stepFace: 'Face Check',
    formTitle: 'Submit Credentials',
    identitySection: 'ENTITY IDENTITY',
    realName: 'Legal Name',
    realNamePlaceholder: 'Enter legal name',
    idNo: 'Identity Number',
    idNoPlaceholder: 'Enter identity number',
    idPortrait: 'Upload ID Portrait Side',
    idEmblem: 'Upload ID Emblem Side',
    cargoSection: 'CARGO CATEGORIES',
    cargoDesc: 'Select the primary types of goods you are certified to transport.',
    cargoNormal: 'General',
    cargoCold: 'Cold Chain',
    cargoChemical: 'Chemicals',
    cargoMachine: 'Machinery',
    cargoOther: 'Other',
    consentTitle: 'Credit Inquiry Consent',
    consentText: 'I authorize SkyLink Logistics to query my personal credit report, traffic violation records, and qualification validity for certification review under applicable laws.',
    consentLink: 'Personal Information Inquiry Authorization',
    update: 'Update Certification',
    submit: 'Submit Certification',
    uploadedLabel: 'Uploaded',
    uploadDone: 'Image attached',
    uploadCancelled: 'Upload cancelled',
    latestStatusPrefix: 'Latest application: ',
    rejectedHint: 'Please update the rejected materials and resubmit for review.',
    uploadReady: 'Entry ready: ',
    agreementToast: 'Authorization document opens in production',
    helpToast: 'Complete the required certification materials',
    rolePilot: 'pilot',
    roleOwner: 'owner',
    roleClient: 'client',
    creditApproved: 'Credit assessment authorized',
    creditPending: 'Credit assessment pending',
    successToast: 'Certification submitted',
    successSuffix: ' certification materials submitted, pending operations review.',
    submitFailedToast: 'Submit failed',
    submitError: 'Certification failed. Please review the materials and retry.',
    switchIdentity: 'Switch Role',
    languageToast: 'Switched to English',
  },
  zh: {
    pageTitle: '认证中心',
    progressHeading: '认证进度',
    stepBasic: '基础信息',
    stepDocs: '资质材料',
    stepFace: '人脸识别',
    formTitle: '提交资质材料',
    identitySection: '主体身份',
    realName: '真实姓名',
    realNamePlaceholder: '输入姓名',
    idNo: '身份证号',
    idNoPlaceholder: '输入身份证号',
    idPortrait: '上传身份证人像面',
    idEmblem: '上传身份证国徽面',
    cargoSection: '承运品类',
    cargoDesc: '选择你已具备承运资质的主要货物类型。',
    cargoNormal: '普货',
    cargoCold: '冷链生鲜',
    cargoChemical: '化工品',
    cargoMachine: '机械设备',
    cargoOther: '其他',
    consentTitle: '信用查询授权',
    consentText: '本人同意并授权天链物流根据相关法律法规，查询本人的个人信用报告、交通违章记录及从业资格有效性，用于认证审核。',
    consentLink: '《个人信息查询授权书》',
    update: '更新认证',
    submit: '提交认证',
    uploadedLabel: '已上传',
    uploadDone: '证件照已附加',
    uploadCancelled: '已取消上传',
    latestStatusPrefix: '最近申请：',
    rejectedHint: '请补充认证材料后重新提交审核',
    uploadReady: '上传入口已准备：',
    agreementToast: '授权书将在生产环境打开',
    helpToast: '请按提示补齐认证材料',
    rolePilot: '飞手',
    roleOwner: '机主',
    roleClient: '业主',
    creditApproved: '已授权信用评估',
    creditPending: '待授权信用评估',
    successToast: '认证已提交',
    successSuffix: '认证材料已提交，等待运营审核。',
    submitFailedToast: '提交失败',
    submitError: '认证提交失败，请检查材料后重试。',
    switchIdentity: '切换身份',
    languageToast: '已切换为中文',
  },
} as const;

const copy = computed(() => AUTH_COPY[localeStore.locale]);
const roleTitle = computed(() => role.value === Role.Pilot ? copy.value.rolePilot : role.value === Role.Owner ? copy.value.roleOwner : copy.value.roleClient);
const form = reactive({
  realName: '张建国',
  idNo: '110105********1234',
  caacLevel: 'BVLOS',
  noCrimeProof: '三年内无犯罪记录证明',
  healthProof: '矫正视力达标，无色盲色弱',
  trainingCerts: '应急处置,特殊场景作业',
  droneModel: '合规吊运机 A30',
  droneSn: 'SN-NEW',
  uomNo: 'UOM-2026-演示',
  insuranceAmount: '8000000',
  maintenance: '月度例检正常',
});

const cargoOptions = computed<CargoOption[]>(() => [
  { key: 'normal', label: copy.value.cargoNormal, icon: 'inventory_2' },
  { key: 'cold', label: copy.value.cargoCold, icon: 'ac_unit' },
  { key: 'chemical', label: copy.value.cargoChemical, icon: 'science' },
  { key: 'machine', label: copy.value.cargoMachine, icon: 'home_repair_service' },
  { key: 'other', label: copy.value.cargoOther, icon: 'category' },
]);

const selectedCargo = ref(['normal', 'machine']);
const creditConsent = ref(false);
const uploads = reactive({ portrait: '', emblem: '' });
const refreshTick = ref(0);
const latest = computed(() => {
  void refreshTick.value;
  return latestCertification(role.value, userStore.user.id);
});
const docsApproved = computed(() => latest.value?.status === AuditStatus.Approved);
const latestStatusLabel = computed(() => latest.value ? auditStatusLabel(latest.value.status) : '');
const latestTone = computed(() => {
  if (!latest.value) return '';
  if (latest.value.status === AuditStatus.Approved) return 'success';
  if (latest.value.status === AuditStatus.Rejected) return 'danger';
  return 'pending';
});
const latestIcon = computed(() => {
  if (latest.value?.status === AuditStatus.Approved) return 'check_circle';
  if (latest.value?.status === AuditStatus.Rejected) return 'error';
  return 'schedule';
});
const submitting = ref(false);
const feedback = ref('');
const feedbackTone = ref<'success' | 'danger' | 'warning'>('success');
const primaryText = computed(() => latest.value?.status === AuditStatus.Pending ? copy.value.update : copy.value.submit);
let lastSubmitAt = 0;

function toggleCargo(key: string) {
  selectedCargo.value = selectedCargo.value.includes(key)
    ? selectedCargo.value.filter((item) => item !== key)
    : [...selectedCargo.value, key];
}

function chooseUpload(key: 'portrait' | 'emblem') {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const path = Array.isArray(res.tempFilePaths) ? res.tempFilePaths[0] : '';
      uploads[key] = path || `${key}-${Date.now()}`;
      uni.showToast({ title: copy.value.uploadDone, icon: 'none' });
    },
    fail: () => {
      uni.showToast({ title: copy.value.uploadCancelled, icon: 'none' });
    },
  });
}

function showAgreement() {
  uni.showToast({ title: copy.value.agreementToast, icon: 'none' });
}

function showHelp() {
  uni.showToast({ title: copy.value.helpToast, icon: 'none' });
}

function toggleLocale() {
  localeStore.toggleLocale();
  uni.showToast({ title: copy.value.languageToast, icon: 'none' });
}

async function submitCertificationForm() {
  if (submitting.value) return;
  const now = Date.now();
  if (now - lastSubmitAt < 500) return;
  lastSubmitAt = now;
  submitting.value = true;
  feedback.value = '';
  try {
    submitCertification(role.value, userStore.user.id, {
      ...form,
      idNo: form.idNo,
      realName: form.realName,
      creditConsent: creditConsent.value ? copy.value.creditApproved : copy.value.creditPending,
      cargoDeclaration: selectedCargo.value,
      trainingCerts: form.trainingCerts.split(',').map((item) => item.trim()).filter(Boolean),
      insuranceAmount: Number(form.insuranceAmount),
      idPhotos: [uploads.portrait, uploads.emblem].filter(Boolean),
    });
    refreshTick.value += 1;
    feedbackTone.value = 'success';
    feedback.value = `${roleTitle.value}${copy.value.successSuffix}`;
    uni.showToast({ title: copy.value.successToast, icon: 'none' });
  } catch (e) {
    feedbackTone.value = 'danger';
    feedback.value = e instanceof Error ? e.message : copy.value.submitError;
    uni.showToast({ title: copy.value.submitFailedToast, icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function back() {
  uni.navigateBack();
}

function switchIdentity() {
  userStore.logout();
  uni.reLaunch({ url: '/pages/login/index' });
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  color: $ink-900;
  background: $bg-page;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.topbar {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 70;
  height: 66px;
  padding: 0 18px;
  border-bottom: 2px solid $line-strong;
  background: $bg-page;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  box-sizing: border-box;
}

.icon-btn {
  width: 44px;
  height: 44px;
  color: $blue-50;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn.help {
  justify-self: end;
}

.top-actions {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
}

.language-switch {
  min-width: 58px;
  height: 38px;
  padding: 0 10px;
  border: 2px solid $line-strong;
  border-radius: 6px;
  background: rgba(49, 53, 64, .72);
  color: $color-primary;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: $fs-sm;
  line-height: 34px;
  font-weight: 700;
  text-align: center;
  box-sizing: border-box;
}

.page-title {
  min-width: 0;
  color: $ink-900;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: $fs-h1;
  line-height: 28px;
  font-weight: 800;
  padding-left: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zh-copy {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, "Microsoft YaHei", sans-serif;
}

.zh-copy .page-title,
.zh-copy .form-head,
.zh-copy .identity-switch-btn,
.zh-copy .submit-btn {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  font-weight: 800;
}

.zh-copy .progress-heading,
.zh-copy .section-label,
.zh-copy .step,
.zh-copy .language-switch {
  font-family: "PingFang SC", "Source Han Sans CN", "Noto Sans CJK SC", Inter, sans-serif;
  letter-spacing: 0;
}

.zh-copy .progress-heading,
.zh-copy .section-label {
  font-size: $fs-h3;
  line-height: 23px;
}

.content {
  position: fixed;
  inset: 66px 0 92px;
  padding: 16px 16px 24px;
  box-sizing: border-box;
}

.progress-card {
  height: 150px;
  padding: 20px 20px 18px;
  border-radius: 8px;
  border: 2px solid $line-strong;
  background: linear-gradient(112deg, rgba(20, 24, 34, .98), rgba(16, 36, 45, .84));
  box-sizing: border-box;
}

.progress-heading {
  color: $ink-900;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "JetBrains Mono", monospace;
  font-size: $fs-sm;
  line-height: 21px;
  letter-spacing: 4px;
  font-weight: 700;
  white-space: nowrap;
}

.stepper {
  position: relative;
  height: 74px;
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
}

.step-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 25px;
  height: 2px;
  background: $line-strong;
}

.step-line.active {
  right: 65%;
  background: $color-primary;
  box-shadow: 0 0 8px rgba(0, 242, 255, .8);
}

.step {
  position: relative;
  z-index: 2;
  width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-family: "JetBrains Mono", "PingFang SC", monospace;
  font-size: $fs-sm;
  line-height: 18px;
  font-weight: 700;
}

.step.completed {
  color: $color-primary;
}

.step.current {
  color: $blue-50;
}

.step.pending {
  color: $ink-500;
  opacity: .55;
}

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  font-family: "JetBrains Mono", monospace;
}

.complete-dot {
  color: $blue-900;
  background: $color-primary;
  box-shadow: 0 0 19px rgba(0, 242, 255, .45);
}

.current-dot {
  color: $color-primary;
  border: 2px solid $color-primary;
  background: $bg-card;
  box-shadow: 0 0 18px rgba(0, 242, 255, .25);
}

.pending-dot {
  color: $ink-500;
  background: $surface-raised;
  border: 2px solid $line-strong;
}

.form-card {
  margin-top: 24px;
  border-radius: 8px;
  border: 2px solid $line-strong;
  background: $bg-card;
  overflow: hidden;
}

.form-head {
  height: 56px;
  padding: 0 16px;
  border-bottom: 2px solid $line-strong;
  background: $surface-raised;
  color: $blue-50;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: $fs-h1;
  line-height: 28px;
  font-weight: 800;
}

.form-head .stitch-icon {
  color: $color-primary;
}

.form-body {
  padding: 22px 20px 24px;
}

.section-block + .section-block {
  margin-top: 28px;
}

.section-label {
  display: block;
  padding-bottom: 10px;
  border-bottom: 2px solid $line-strong;
  color: $ink-900;
  font-family: "JetBrains Mono", monospace;
  font-size: $fs-sm;
  line-height: 20px;
  letter-spacing: 5px;
  font-weight: 700;
}

.field {
  margin-top: 16px;
}

.field-label {
  display: block;
  color: $ink-900;
  font-size: $fs-h3;
  line-height: 24px;
  font-weight: 600;
}

.required {
  color: $danger;
}

.field-input {
  width: 100%;
  height: 48px;
  margin-top: 8px;
  padding: 0 12px;
  border: 2px solid $line-strong;
  border-radius: 0;
  background: $bg-page;
  color: $blue-50;
  font-size: $fs-h3;
  line-height: 24px;
  font-weight: 600;
  box-sizing: border-box;
}

.field-input.mono {
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 1px;
}

.upload-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.upload-box {
  height: 124px;
  border: 3px dashed $line-strong;
  border-radius: 5px;
  background: $bg-page;
  color: $ink-700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-sizing: border-box;
  font-size: $fs-h3;
  line-height: 22px;
  font-weight: 500;
}

.upload-box .stitch-icon {
  color: $ink-500;
}

.upload-box.uploaded {
  border-style: solid;
  border-color: rgba(16, 185, 129, .55);
  color: $success-ink;
}

.upload-box.uploaded .stitch-icon {
  color: $success-ink;
}

.audit-status {
  margin-top: 14px;
  padding: 8px 12px;
  border-radius: 5px;
  border: 1px solid $line-strong;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: $fs-h3;
}

.audit-status.pending {
  border-color: rgba(245, 158, 11, .45);
  color: $warning-ink;
}

.audit-status.success {
  border-color: rgba(16, 185, 129, .45);
  color: $success-ink;
}

.audit-status.danger {
  border-color: rgba(239, 68, 68, .45);
  color: $danger-ink;
}

.audit-status-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.audit-status-copy text {
  white-space: normal;
}

.audit-hint {
  font-size: $fs-sm;
  line-height: 18px;
  color: $ink-700;
}

.cargo-section {
  margin-top: 28px;
}

.section-desc {
  display: block;
  margin-top: 14px;
  color: $ink-500;
  font-size: $fs-h3;
  line-height: 23px;
}

.chip-wrap {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 10px;
}

.cargo-chip {
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: 2px solid $line-strong;
  background: $bg-page;
  color: $ink-700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: $fs-h3;
  line-height: 22px;
  font-weight: 600;
  box-sizing: border-box;
}

.cargo-chip.selected {
  color: $color-primary;
  border-color: $color-primary;
  background: rgba(0, 242, 255, .1);
}

.consent-box {
  margin-top: 32px;
  padding: 16px 15px;
  border-radius: 5px;
  border: 2px solid $line-strong;
  background: $bg-page;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.checkbox {
  width: 22px;
  height: 22px;
  margin-top: 7px;
  border-radius: 2px;
  border: 2px solid $line-strong;
  color: $blue-900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 auto;
}

.checkbox.checked {
  border-color: $color-primary;
  background: $color-primary;
}

.consent-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.consent-title {
  color: $blue-50;
  font-size: $fs-h3;
  line-height: 24px;
  font-weight: 600;
}

.consent-text {
  margin-top: 6px;
  color: $ink-500;
  font-size: $fs-h3;
  line-height: 24px;
}

.consent-link {
  margin-top: 12px;
  color: $color-primary;
  font-size: $fs-h3;
  line-height: 24px;
  font-weight: 600;
}

.feedback-bar {
  position: fixed;
  left: 20px;
  right: 20px;
  bottom: 94px;
  z-index: 72;
  padding: 11px 15px;
  border-radius: 5px;
  font-size: $fs-body;
  line-height: 22px;
}

.feedback-bar.success {
  color: $success;
  border: 2px solid rgba(16, 185, 129, .45);
  background: rgba(16, 185, 129, .14);
}

.feedback-bar.danger {
  color: $danger-ink;
  border: 2px solid rgba(239, 68, 68, .45);
  background: rgba(239, 68, 68, .14);
}

.bottom-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 70;
  height: 92px;
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  border-top: 2px solid $line-strong;
  background: $surface-raised;
  display: grid;
  grid-template-columns: minmax(0, .95fr) minmax(0, 1.2fr);
  gap: 12px;
  box-sizing: border-box;
}

.identity-switch-btn,
.submit-btn {
  height: 56px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: "Hanken Grotesk", "PingFang SC", sans-serif;
  font-size: $fs-h3;
  line-height: 24px;
  font-weight: 800;
  min-width: 0;
}

.identity-switch-btn {
  border: 2px solid $line-strong;
  background: $bg-page;
  color: $blue-50;
}

.identity-switch-btn .stitch-icon {
  color: $color-primary;
  flex: 0 0 auto;
}

.identity-switch-btn text,
.submit-btn text {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.submit-btn {
  background: $color-primary;
  color: $blue-900;
  box-shadow: 0 0 15px rgba(0, 242, 255, .38);
}

.submit-btn.disabled {
  opacity: .62;
}

.tap-press {
  opacity: .72;
  transform: scale(.985);
}
</style>
