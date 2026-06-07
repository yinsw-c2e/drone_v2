import { OrderStatus } from '@/models';
import type { AirspaceRequest, Order } from '@/models';

export interface TaskPhase {
  status: OrderStatus;
  title: string;
  desc: string;
}

export interface TaskActionPlan {
  stage: string;
  next: string;
  primary: string;
  disabled: boolean;
  reason: string;
  terminal: boolean;
}

export const TASK_PHASES: TaskPhase[] = [
  { status: OrderStatus.Confirmed, title: '确认运力', desc: '任务已锁定飞手与设备，下一步提交空域申请' },
  { status: OrderStatus.AirspaceApplying, title: '空域审批', desc: '等待空域审批，危险品会进入异常处理' },
  { status: OrderStatus.Preparing, title: '飞行准备', desc: '起飞前确认安检、保险与航线围栏' },
  { status: OrderStatus.Loading, title: '装货中', desc: '确认吊框锁具与货物固定后起飞' },
  { status: OrderStatus.InFlight, title: '飞行中', desc: '关注遥测、低电量、偏航和摆度告警' },
  { status: OrderStatus.Unloading, title: '卸货中', desc: '到达终点后确认卸货完成' },
  { status: OrderStatus.Completed, title: '任务完成', desc: '作业完成，下一步生成结算分账' },
  { status: OrderStatus.Settled, title: '已结算', desc: '钱包与分账已更新，可查看结算明细' },
];

export function taskSteps(status: OrderStatus): Array<{ title: string; time?: string; state: 'done' | 'current' | 'todo' }> {
  const currentIndex = TASK_PHASES.findIndex((phase) => phase.status === status);
  const safeIndex = currentIndex < 0 ? TASK_PHASES.length - 1 : currentIndex;
  return TASK_PHASES.map((phase, index) => ({
    title: phase.title,
    time: phase.desc,
    state: index < safeIndex ? 'done' : index === safeIndex ? 'current' : 'todo',
  }));
}

export function taskActionForStatus(order: Order, allChecked: boolean, airspace?: AirspaceRequest): TaskActionPlan {
  if (order.status === OrderStatus.Cancelled) {
    return {
      stage: '已取消',
      next: '订单已取消，无需继续执行。返回任务列表查看其他任务。',
      primary: '返回任务列表',
      disabled: false,
      reason: '订单已取消',
      terminal: true,
    };
  }
  if (order.status === OrderStatus.Exception) {
    return {
      stage: '异常',
      next: '订单已进入异常处理，请等待后台处置或发起保险理赔。',
      primary: '查看任务列表',
      disabled: false,
      reason: '异常状态不能继续推进',
      terminal: true,
    };
  }
  if (order.status === OrderStatus.Settled) {
    return {
      stage: '已结算',
      next: '任务已结算，分账已写入钱包。下一步可查看钱包或等待业主评价。',
      primary: '查看结算',
      disabled: false,
      reason: '终态不再推进',
      terminal: true,
    };
  }
  if (order.status === OrderStatus.AirspaceApplying && airspace?.status !== 'approved') {
    return {
      stage: '待空域审批',
      next: '等待空域审批结果。点击刷新审批结果，通过后进入飞行准备。',
      primary: '刷新审批结果',
      disabled: false,
      reason: '',
      terminal: false,
    };
  }
  if (order.status === OrderStatus.Preparing && !allChecked) {
    return {
      stage: '准备中',
      next: '完成 4 项安检后可放行。',
      primary: '开始装货',
      disabled: true,
      reason: '完成 4 项安检后可放行',
      terminal: false,
    };
  }

  const map: Partial<Record<OrderStatus, TaskActionPlan>> = {
    [OrderStatus.Confirmed]: {
      stage: '待空域审批',
      next: '提交空域申请，审批通过后进入起飞前准备。',
      primary: '提交空域申请',
      disabled: false,
      reason: '',
      terminal: false,
    },
    [OrderStatus.AirspaceApplying]: {
      stage: '准备中',
      next: '空域已批准，进入起飞前合规检查。',
      primary: '进入飞行准备',
      disabled: false,
      reason: '',
      terminal: false,
    },
    [OrderStatus.Preparing]: {
      stage: '准备中',
      next: '安检完成，开始装货并确认吊挂。',
      primary: '开始装货',
      disabled: false,
      reason: '',
      terminal: false,
    },
    [OrderStatus.Loading]: {
      stage: '装货中',
      next: '货物固定完成后起飞执行。',
      primary: '起飞执行',
      disabled: false,
      reason: '',
      terminal: false,
    },
    [OrderStatus.InFlight]: {
      stage: '飞行中',
      next: '持续关注告警，到达终点后确认卸货。',
      primary: '确认卸货',
      disabled: false,
      reason: '',
      terminal: false,
    },
    [OrderStatus.Unloading]: {
      stage: '卸货中',
      next: '卸货完成后确认任务完成。',
      primary: '完成任务',
      disabled: false,
      reason: '',
      terminal: false,
    },
    [OrderStatus.Completed]: {
      stage: '已完成',
      next: '生成结算分账，业主随后可评价。',
      primary: '生成结算',
      disabled: false,
      reason: '',
      terminal: false,
    },
  };
  return map[order.status] ?? {
    stage: '待处理',
    next: '当前状态不适合飞手推进，请返回任务列表确认。',
    primary: '返回任务列表',
    disabled: false,
    reason: '当前状态不能由飞手推进',
    terminal: true,
  };
}
