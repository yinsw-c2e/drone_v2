import { CargoType } from './index';
import type { Order } from './index';
export function validateOrder(o: Order): string[] {
  const e: string[] = [];
  if (o.cargo.weightKg <= 0) e.push('货物重量必须 > 0');
  if (o.budgetCent <= 0) e.push('预算必须 > 0');
  if (!o.from?.lat || !o.to?.lat) e.push('起点/终点必填');
  if (o.cargo.type === CargoType.Valuable && !o.needs.insurance) e.push('贵重货物必须投保');
  return e;
}
