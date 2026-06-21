import { AuditStatus, OrderStatus } from '@/models';
import type { Order, OwnerProfile, PilotProfile, User } from '@/models';

export function pilotQualificationIssue(pilot: PilotProfile | undefined) {
  if (!pilot) return '飞手资质档案不存在，请先完成认证';
  if (pilot.noCrimeProof === AuditStatus.Rejected || pilot.healthProof === AuditStatus.Rejected) {
    return '飞手资质审核未通过，请补充认证材料后重新提交审核';
  }
  if (pilot.noCrimeProof !== AuditStatus.Approved || pilot.healthProof !== AuditStatus.Approved) {
    return '飞手资质仍在审核中，审核通过后才能接单或起飞';
  }
  if (pilot.trainingCerts.length === 0) return '飞手训练证书未上传，请补充认证材料后重新提交审核';
  return '';
}

export function pilotCanOperate(pilot: PilotProfile | undefined) {
  return !pilotQualificationIssue(pilot);
}

export function ownerQualificationIssue(owner: OwnerProfile | undefined, user?: User) {
  if (!owner) return '机主资质档案不存在，请先完成认证';
  if (user?.blacklisted) return '机主处于风控黑名单，不能投放运力';
  if (!owner.uomVerified) return '机主资质未通过，请补充认证材料后重新提交审核';
  return '';
}

export function ownerCanOperate(owner: OwnerProfile | undefined, user?: User) {
  return !ownerQualificationIssue(owner, user);
}

export function orderRequiresPilotQualification(order: Order) {
  return [
    OrderStatus.Confirmed,
    OrderStatus.AirspaceApplying,
    OrderStatus.Preparing,
    OrderStatus.Loading,
  ].includes(order.status);
}
