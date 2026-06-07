<template>
  <view class="page">
    <view class="top">
      <view>
        <text class="title">认证中心</text>
        <text class="desc">材料写入 repo，后台可通过或驳回，端侧实时读取最新状态。</text>
      </view>
      <RoleBadge :role="role" />
    </view>

    <view class="card section">
      <view class="between">
        <text class="section-title">{{ roleTitle }}认证</text>
        <text :class="['state', statusTone]">{{ statusText }}</text>
      </view>
      <StepFlow :steps="steps" />
    </view>

    <view v-if="role === Role.Pilot" class="card section">
      <text class="section-title">飞手材料</text>
      <view class="field"><text class="label">CAAC 等级</text><input v-model="form.caacLevel" class="input" /></view>
      <view class="field"><text class="label">无犯罪证明</text><input v-model="form.noCrimeProof" class="input" /></view>
      <view class="field"><text class="label">健康体检</text><input v-model="form.healthProof" class="input" /></view>
      <view class="field"><text class="label">培训证书</text><input v-model="form.trainingCerts" class="input" /></view>
    </view>

    <view v-else-if="role === Role.Owner" class="card section">
      <text class="section-title">机主与设备</text>
      <view class="field"><text class="label">设备型号</text><input v-model="form.droneModel" class="input" /></view>
      <view class="field"><text class="label">序列号</text><input v-model="form.droneSn" class="input" /></view>
      <view class="field"><text class="label">适航/UOM</text><input v-model="form.uomNo" class="input" /></view>
      <view class="field"><text class="label">保险保额</text><input v-model="form.insuranceAmount" class="input" type="number" /></view>
      <view class="field"><text class="label">维护记录</text><input v-model="form.maintenance" class="input" /></view>
    </view>

    <view v-else class="card section">
      <text class="section-title">业主材料</text>
      <view class="field"><text class="label">实名主体</text><input v-model="form.realName" class="input" /></view>
      <view class="field"><text class="label">信用授权</text><input v-model="form.creditConsent" class="input" /></view>
      <view class="field"><text class="label">常见货物类型</text><input v-model="form.cargoDeclaration" class="input" /></view>
    </view>

    <BottomActionBar primary="提交认证" secondary="返回" @secondary="back" @primary="submit" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import RoleBadge from '@/components/RoleBadge.vue';
import StepFlow from '@/components/StepFlow.vue';
import { AuditStatus, Role } from '@/models';
import { latestCertification, submitCertification } from '@/services/app-flow';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const role = computed(() => userStore.user.currentRole === Role.Admin ? Role.Client : userStore.user.currentRole);
const roleTitle = computed(() => role.value === Role.Pilot ? '飞手' : role.value === Role.Owner ? '机主' : '业主');
const form = reactive({
  caacLevel: 'BVLOS',
  noCrimeProof: '三年内无犯罪记录证明',
  healthProof: '矫正视力达标，无色盲色弱',
  trainingCerts: '应急处置,特殊场景作业',
  droneModel: 'DJI FlyCart 30',
  droneSn: 'SN-NEW',
  uomNo: 'UOM-MOCK-2026',
  insuranceAmount: '8000000',
  maintenance: '月度例检正常',
  realName: userStore.user.nickname,
  creditConsent: '已授权 Mock 征信评估',
  cargoDeclaration: '普通货物,贵重货物,危险品',
});
const latest = computed(() => latestCertification(role.value, userStore.user.id));
const statusText = computed(() => latest.value?.status ?? '未提交');
const statusTone = computed(() => latest.value?.status ?? 'draft');
const steps = computed(() => [
  { title: '填写材料', state: latest.value ? 'done' as const : 'current' as const },
  { title: 'Mock 审核', state: latest.value?.status === AuditStatus.Pending ? 'current' as const : latest.value ? 'done' as const : 'todo' as const },
  { title: '结果同步', state: latest.value?.status === AuditStatus.Approved || latest.value?.status === AuditStatus.Rejected ? 'done' as const : 'todo' as const },
]);

function submit() {
  submitCertification(role.value, userStore.user.id, {
    ...form,
    trainingCerts: form.trainingCerts.split(',').map((item) => item.trim()).filter(Boolean),
    insuranceAmount: Number(form.insuranceAmount),
  });
}

function back() {
  uni.navigateBack();
}
</script>

<style lang="scss" scoped>
.top {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: $sp-3;
}

.title {
  display: block;
  font-size: $fs-h1;
  line-height: 1.25;
  color: $ink-900;
  font-weight: $fw-bold;
}

.desc {
  display: block;
  margin-top: $sp-1;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
}

.state {
  padding: $sp-1 $sp-2;
  border-radius: $r-pill;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-cap;
}

.state.approved {
  background: $success-bg;
  color: $success-ink;
}

.state.rejected {
  background: $danger-bg;
  color: $danger-ink;
}

.state.pending {
  background: $warning-bg;
  color: $warning-ink;
}

.field {
  margin-top: $sp-3;
}

.label {
  display: block;
  color: $ink-500;
  font-size: $fs-sm;
  margin-bottom: $sp-1;
}

.input {
  min-height: 88rpx;
  border-radius: $r-sm;
  background: $bg-sunken;
  color: $ink-900;
  font-size: $fs-body;
  padding: 0 $sp-3;
}
</style>
