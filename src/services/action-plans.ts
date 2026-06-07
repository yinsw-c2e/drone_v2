import { CapacityStatus, OrderStatus } from '@/models';
import type { AirspaceRequest, Claim, Drone, Order } from '@/models';
import { canTransition } from '@/utils/order-machine';

export interface ButtonAction {
  label: string;
  disabled: boolean;
  reason: string;
}

export interface AdminOrderAction extends ButtonAction {
  description: string;
  terminal: boolean;
}

export interface ClaimAction extends ButtonAction {
  secondaryLabel: string;
  secondaryDisabled: boolean;
  description: string;
  terminal: boolean;
}

export interface ReviewSettlementAction {
  secondaryLabel: string;
  description: string;
  canFinish: boolean;
}

export interface OwnerResourceAction {
  primaryLabel: string;
  secondaryLabel: string;
  description: string;
}

export interface MatchConfirmAction {
  primaryLabel: string;
  secondaryLabel: string;
  canConfirm: boolean;
  description: string;
}

export function isOrderTerminal(status: OrderStatus): boolean {
  return status === OrderStatus.Settled || status === OrderStatus.Cancelled || status === OrderStatus.Exception;
}

export function canTriggerEmergency(status: OrderStatus): boolean {
  return canTransition(status, OrderStatus.Exception);
}

export function emergencyClosedReason(status: OrderStatus): string {
  if (status === OrderStatus.Confirmed) return '任务尚未进入飞行执行阶段，请先提交空域申请；如需取消请联系后台。';
  if (status === OrderStatus.Settled) return '任务已结算，应急处置已关闭；如有纠纷请走理赔或客服。';
  if (status === OrderStatus.Cancelled) return '订单已取消，应急处置已关闭。';
  if (status === OrderStatus.Exception) return '订单已处于异常处理中，请等待后台处置。';
  if (status === OrderStatus.Completed) return '任务已完成，飞行应急处置已关闭；如有货损请走理赔。';
  return canTriggerEmergency(status) ? '' : '当前阶段不能发起应急处置，请查看阶段说明或联系后台。';
}

export function adminOrderAction(order: Order, airspace?: AirspaceRequest): AdminOrderAction {
  if (order.status === OrderStatus.Settled) {
    return { label: '已完成', disabled: true, reason: '订单已结算，不能继续流转', description: '可在结算、审计日志或评价中查看明细。', terminal: true };
  }
  if (order.status === OrderStatus.Cancelled) {
    return { label: '已取消', disabled: true, reason: '订单已取消，不能继续流转', description: '如需继续作业，请由业主重新发单。', terminal: true };
  }
  if (order.status === OrderStatus.Exception) {
    return { label: '异常中', disabled: true, reason: '订单已进入异常处理，不能继续流转', description: '请处理风控、理赔或后台仲裁。', terminal: true };
  }
  if (order.status === OrderStatus.Confirmed) {
    return { label: '提交空域', disabled: false, reason: '', description: '提交 Mock 空域申请。', terminal: false };
  }
  if (order.status === OrderStatus.AirspaceApplying && airspace?.status !== 'approved') {
    return { label: '通过审批', disabled: false, reason: '', description: '刷新 Mock 空域审批，通过后进入准备。', terminal: false };
  }
  if (order.status === OrderStatus.AirspaceApplying) {
    return { label: '进入准备', disabled: false, reason: '', description: '空域已通过，推进到合规准备。', terminal: false };
  }
  if (order.status === OrderStatus.Preparing) {
    return { label: '开始装货', disabled: false, reason: '', description: '合规检查后进入装货。', terminal: false };
  }
  if (order.status === OrderStatus.Loading) {
    return { label: '起飞执行', disabled: false, reason: '', description: '装货完成后进入飞行。', terminal: false };
  }
  if (order.status === OrderStatus.InFlight) {
    return { label: '确认卸货', disabled: false, reason: '', description: '飞行到达后进入卸货。', terminal: false };
  }
  if (order.status === OrderStatus.Unloading) {
    return { label: '完成任务', disabled: false, reason: '', description: '卸货完成后标记任务完成。', terminal: false };
  }
  if (order.status === OrderStatus.Completed) {
    return { label: '生成结算', disabled: false, reason: '', description: '生成分账并同步钱包。', terminal: false };
  }
  return { label: '查看明细', disabled: true, reason: '当前状态不能由后台直接流转', description: '请查看订单事件或重新发起流程。', terminal: true };
}

export function reviewSettlementAction(order?: Order): ReviewSettlementAction {
  if (order?.settlement || order?.status === OrderStatus.Settled) {
    return { secondaryLabel: '', description: '结算已完成，可直接提交评价。', canFinish: false };
  }
  return { secondaryLabel: '完成结算', description: '订单尚未结算，可先生成结算分账。', canFinish: true };
}

export function matchConfirmAction(candidateCount: number, hasSelected: boolean): MatchConfirmAction {
  if (candidateCount === 0) {
    return {
      primaryLabel: '等待运力',
      secondaryLabel: '修改订单',
      canConfirm: false,
      description: '当前没有在线合规运力，请等待机主投放或返回调整预算/时间。',
    };
  }
  if (!hasSelected) {
    return {
      primaryLabel: '请选择方案',
      secondaryLabel: '修改订单',
      canConfirm: false,
      description: '请选择一个匹配方案后再确认下单。',
    };
  }
  return {
    primaryLabel: '确认下单',
    secondaryLabel: '发单',
    canConfirm: true,
    description: '已选中推荐方案，可确认下单并进入追踪。',
  };
}

export function claimAction(claim: Claim): ClaimAction {
  if (claim.status === 'paid') {
    return { label: '赔付完成', disabled: true, reason: '理赔已赔付完成', secondaryLabel: '', secondaryDisabled: true, description: '理赔已赔付完成，不能重复推进。', terminal: true };
  }
  if (claim.status === 'arbitration') {
    return { label: '仲裁中', disabled: true, reason: '理赔已进入仲裁', secondaryLabel: '', secondaryDisabled: true, description: '理赔已进入仲裁，请等待后台处理。', terminal: true };
  }
  if (claim.status === 'assessed') {
    return { label: '赔付完成', disabled: false, reason: '', secondaryLabel: '仲裁', secondaryDisabled: false, description: '责任已认定，可赔付或转入仲裁。', terminal: false };
  }
  return { label: '继续理赔', disabled: false, reason: '', secondaryLabel: '仲裁', secondaryDisabled: false, description: claim.status === 'reported' ? '报案已提交，下一步进入调查。' : '调查中，下一步进入责任认定。', terminal: false };
}

export function ownerDroneAction(drone: Drone, isOnline: boolean): OwnerResourceAction {
  if (drone.status === 'busy') {
    return { primaryLabel: '', secondaryLabel: '', description: '当前设备正在执行订单，完成后自动恢复可调度。' };
  }
  if (isOnline) {
    return { primaryLabel: '', secondaryLabel: '撤回', description: '当前设备已上线，可进入匹配候选池。' };
  }
  if (drone.status === 'maintenance') {
    return { primaryLabel: '', secondaryLabel: '', description: '当前设备维护中，完成维护后再投放。' };
  }
  return { primaryLabel: '投放', secondaryLabel: '', description: '当前设备已撤回，投放后会生成在线运力。' };
}

export function ownerCapacityAction(status: CapacityStatus): OwnerResourceAction {
  if (status === CapacityStatus.Busy) {
    return { primaryLabel: '', secondaryLabel: '', description: '运力忙碌中，订单完成后可再次调度。' };
  }
  if (status === CapacityStatus.Online) {
    return { primaryLabel: '', secondaryLabel: '撤回', description: '当前运力已上线，可被业主匹配。' };
  }
  return { primaryLabel: '投放', secondaryLabel: '', description: '当前运力已撤回，投放后进入候选池。' };
}
