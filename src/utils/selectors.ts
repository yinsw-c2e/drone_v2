import { repo } from './repo';
import type { CapacityUnit, Drone, OwnerProfile, PilotProfile } from '@/models';
import { CapacityStatus, Role } from '@/models';
import { ownerCanOperate, pilotCanOperate } from '@/services/compliance';
export const getPilot = (uid: string) => repo.pilots.find(uid);
export const getDrone = (id: string) => repo.drones.find(id);
export const getOwner = (uid: string) => repo.owners.find(uid);
export const getCredit = (uid: string): number => repo.credits.where((c) => c.userId === uid)[0]?.total ?? 600;
export function getRating(pilotUid: string): number {
  const rs = repo.reviews.where((r) => r.targetUserId === pilotUid && r.byRole === Role.Client);
  return rs.length ? +(rs.reduce((s, r) => s + r.star, 0) / rs.length).toFixed(2) : 5;
}
export interface CapacityView { unit: CapacityUnit; drone: Drone; pilot: PilotProfile; owner?: OwnerProfile; credit: number; rating: number }
export function availableCapacityViews(): CapacityView[] {
  return repo.capacity.where((u) => u.status === CapacityStatus.Online).map((u) => {
    const drone = getDrone(u.droneId), pilot = getPilot(u.pilotId), owner = getOwner(u.ownerId), ownerUser = repo.users.find(u.ownerId);
    return drone && pilot && owner && pilotCanOperate(pilot) && ownerCanOperate(owner, ownerUser)
      ? { unit: u, drone, pilot, owner, credit: getCredit(u.pilotId), rating: getRating(u.pilotId) }
      : null;
  }).filter(Boolean) as CapacityView[];
}
