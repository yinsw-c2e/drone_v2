import { it, expect, beforeEach } from 'vitest';
import { yuan2fen, fen2yuan, fmtMoney } from '@/utils/money';
import { validateOrder } from '@/models/validate';
import { createCapacity } from '@/models/factory';
import { insideNoFlyZone } from '@/utils/geo';
import { ownerCredit, clientCredit } from '@/utils/credit';
import { notify } from '@/utils/notify';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';
import { NotificationType, CargoType, CapacityStatus } from '@/models';
import { NO_FLY_ZONES } from '@/stores/config-data';

beforeEach(() => resetDB());

it('金额换算', () => { expect(yuan2fen(12.34)).toBe(1234); expect(fen2yuan(1234)).toBe(12.34); expect(fmtMoney(1234)).toBe('¥12.34'); });

it('校验：缺字段/贵重未投保报错，合法订单通过', () => {
  const bad: any = { cargo: { type: CargoType.Valuable, weightKg: 0, valueCent: 0 }, from: {}, to: {}, budgetCent: 0, needs: {} };
  expect(validateOrder(bad).length).toBeGreaterThan(0);
  const ok: any = { cargo: { type: CargoType.Normal, weightKg: 5, valueCent: 0 }, from: { lat: 39.9, lng: 116.4 }, to: { lat: 39.95, lng: 116.45 }, budgetCent: 10000, needs: {} };
  expect(validateOrder(ok)).toEqual([]);
});

it('运力工厂默认在线', () => { const c = createCapacity({ pilotId: 'p', droneId: 'd', ownerId: 'o', location: { lng: 116.4, lat: 39.9 } }); expect(c.status).toBe(CapacityStatus.Online); expect(c.id.startsWith('cap_')).toBe(true); });

it('禁飞区判定', () => { expect(insideNoFlyZone({ lng: 113.145, lat: 23.035 }, NO_FLY_ZONES)).toBe(true); expect(insideNoFlyZone({ lng: 113.12, lat: 23.02 }, NO_FLY_ZONES)).toBe(false); });

it('机主/业主信用维度上限与总分自洽', () => {
  const o = ownerCredit('o', repo.owners.all()[0].stats);
  expect(o.dimensions.map((d) => d.max)).toEqual([250, 300, 250, 200]);
  expect(o.total).toBe(o.dimensions.reduce((s, d) => s + d.score, 0));
  const c = clientCredit('c', repo.clients.all()[0].stats);
  expect(c.dimensions.map((d) => d.max)).toEqual([200, 300, 300, 200]);
  expect(c.total).toBeLessThanOrEqual(1000);
});

it('消息写入仓储', () => { notify('u1', NotificationType.System, '标题', '正文'); expect(repo.notifications.where((n) => n.userId === 'u1').length).toBe(1); });
