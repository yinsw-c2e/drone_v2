import { OrderStatus, Role, CapacityStatus } from './index';
import type { Order, GeoPoint, CapacityUnit } from './index';
import { genId } from '@/utils/id';
import { nowISO } from '@/utils/time';
export function createOrder(i: { clientId: string; cargo: Order['cargo']; from: GeoPoint; to: GeoPoint; budgetCent: number; timeMode?: Order['timeMode']; scheduledAt?: string; needs?: Order['needs'] }): Order {
  return {
    id: genId('o'), clientId: i.clientId, cargo: i.cargo, from: i.from, to: i.to, budgetCent: i.budgetCent,
    timeMode: i.timeMode ?? 'instant', scheduledAt: i.scheduledAt, needs: i.needs ?? {},
    status: OrderStatus.Created, events: [{ at: nowISO(), status: OrderStatus.Created, actor: Role.Client }], createdAt: nowISO(),
  };
}
export const createCapacity = (i: Omit<CapacityUnit, 'id' | 'status'> & { status?: CapacityStatus }): CapacityUnit =>
  ({ id: genId('cap'), status: i.status ?? CapacityStatus.Online, pilotId: i.pilotId, droneId: i.droneId, ownerId: i.ownerId, location: i.location, serviceWindow: i.serviceWindow, priceFactor: i.priceFactor });
