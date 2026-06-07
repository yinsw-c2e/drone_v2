<template>
  <view class="page form-page">
    <StepFlow :steps="formSteps" />

    <view class="card section">
      <text class="section-title">货物信息</text>
      <view class="field">
        <text class="label">货物类型</text>
        <view class="segmented">
          <button v-for="item in cargoTypes" :key="item.value" :class="['seg', draft.cargoType === item.value ? 'active' : '']" @click="draft.cargoType = item.value">{{ item.label }}</button>
        </view>
      </view>
      <view class="field">
        <text class="label">重量 kg</text>
        <input v-model="draft.weightKg" class="input" type="number" />
      </view>
      <view class="field">
        <text class="label">货值 元</text>
        <input v-model="draft.valueYuan" class="input" type="number" />
      </view>
    </view>

    <view class="section route-section">
      <text class="section-title">地点与时间</text>
      <MapTrack title="航线预览" :subtitle="routeText" />
      <view class="field">
        <text class="label">起点</text>
        <view class="location-list">
          <button v-for="point in routePoints" :key="point.id" :class="['location-option', draft.fromId === point.id ? 'active' : '']" @click="draft.fromId = point.id">{{ point.address }}</button>
        </view>
      </view>
      <view class="field">
        <text class="label">终点</text>
        <view class="location-list">
          <button v-for="point in routePoints" :key="point.id" :class="['location-option', draft.toId === point.id ? 'active' : '']" @click="draft.toId = point.id">{{ point.address }}</button>
        </view>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">保障与预算</text>
      <label class="check">
        <checkbox :checked="draft.insured" :disabled="draft.cargoType === CargoType.Valuable" @click="draft.insured = true" />
        <text>投保货物险{{ draft.cargoType === CargoType.Valuable ? ' · 贵重强制' : '' }}</text>
      </label>
      <label class="check">
        <checkbox :checked="draft.shockProof" @click="draft.shockProof = !draft.shockProof" />
        <text>防震吊框</text>
      </label>
      <view class="field">
        <text class="label">预算 元</text>
        <input v-model="draft.budgetYuan" class="input" type="number" />
      </view>
      <text v-if="error" class="error">{{ error }}</text>
    </view>

    <BottomActionBar primary="提交发单" secondary="返回" @secondary="back" @primary="submit" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BottomActionBar from '@/components/BottomActionBar.vue';
import MapTrack from '@/components/MapTrack.vue';
import StepFlow from '@/components/StepFlow.vue';
import type { GeoPoint } from '@/models';
import { CargoType, Role } from '@/models';
import { useOrderStore } from '@/stores/order';
import { useUserStore } from '@/stores/user';

const orderStore = useOrderStore();
const userStore = useUserStore();
const error = ref('');
const draft = reactive({
  cargoType: CargoType.Valuable,
  weightKg: '8',
  valueYuan: '3000',
  budgetYuan: '2600',
  insured: true,
  shockProof: true,
  fromId: 'beijing-hub',
  toId: 'shunyi-airport',
});
const routePoints: Array<GeoPoint & { id: string; address: string }> = [
  { id: 'beijing-hub', lng: 116.397, lat: 39.908, address: '北京低空货运中心' },
  { id: 'shunyi-airport', lng: 116.45, lat: 39.95, address: '顺义临空交付点' },
  { id: 'daxing-park', lng: 116.401, lat: 39.72, address: '大兴航空物流园' },
];
const cargoTypes = [
  { label: '普货', value: CargoType.Normal },
  { label: '贵重', value: CargoType.Valuable },
  { label: '农资', value: CargoType.Agricultural },
  { label: '危险', value: CargoType.Dangerous },
];
const selectedFrom = computed(() => routePoints.find((p) => p.id === draft.fromId) ?? routePoints[0]);
const selectedTo = computed(() => routePoints.find((p) => p.id === draft.toId) ?? routePoints[1]);
const routeText = computed(() => `${selectedFrom.value.address} → ${selectedTo.value.address}`);
const formSteps = computed(() => [
  { title: '货物', state: 'done' as const },
  { title: '地点', state: 'done' as const, time: routeText.value },
  { title: '保险', state: 'current' as const },
  { title: '预算', state: 'todo' as const },
]);
watch(() => draft.cargoType, (type) => {
  if (type === CargoType.Valuable) draft.insured = true;
});

function submit() {
  try {
    error.value = '';
    const user = userStore.user.currentRole === Role.Client ? userStore.user : userStore.loginAs(Role.Client);
    orderStore.createOrderDraft({
      clientId: user.id,
      cargoType: draft.cargoType,
      weightKg: Number(draft.weightKg || 0),
      valueCent: Math.max(0, Number(draft.valueYuan || 0) * 100),
      budgetCent: Math.max(0, Number(draft.budgetYuan || 0) * 100),
      insured: draft.insured,
      shockProof: draft.shockProof,
      from: selectedFrom.value,
      to: selectedTo.value,
      remark: '精密设备吊运',
    });
    uni.navigateTo({ url: '/pages-client/match/index' });
  } catch (e) {
    error.value = e instanceof Error ? e.message : '发单失败';
  }
}

function back() {
  uni.navigateBack();
}
</script>

<style lang="scss" scoped>
.form-page {
  padding-bottom: calc($sp-10 + 160rpx);
}

.field {
  margin-top: $sp-3;
}

.label {
  display: block;
  color: $ink-500;
  font-size: $fs-sm;
  line-height: 1.45;
  margin-bottom: $sp-1;
}

.input {
  min-height: 88rpx;
  border-radius: $r-sm;
  background: $bg-sunken;
  padding: 0 $sp-3;
  color: $ink-900;
  font-size: $fs-body;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $sp-2;
}

.seg {
  min-height: 88rpx;
  border-radius: $r-sm;
  color: $ink-700;
  background: $bg-sunken;
  font-size: $fs-sm;
}

.seg.active {
  color: $on-primary;
  background: $color-primary;
}

.route-section {
  display: grid;
  gap: $sp-3;
}

.location-list {
  display: grid;
  gap: $sp-2;
}

.location-option {
  min-height: 88rpx;
  border-radius: $r-sm;
  background: $bg-sunken;
  color: $ink-700;
  font-size: $fs-body;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 $sp-3;
}

.location-option.active {
  background: $color-primary-weak;
  color: $color-primary;
  font-weight: $fw-semibold;
}

.check {
  min-height: 88rpx;
  display: flex;
  align-items: center;
  gap: $sp-2;
  font-size: $fs-body;
  color: $ink-700;
}

.error {
  display: block;
  margin-top: $sp-2;
  color: $danger-ink;
  font-size: $fs-cap;
}
</style>
