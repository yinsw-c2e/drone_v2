import type { Drone } from '@/models';
import { availableCapacityViews } from '@/utils/selectors';
import { repo } from '@/utils/repo';

export function estimateDroneForWeight(weightKg: number): Drone | undefined {
  const weight = Number(weightKg) || 8;
  const compliantOnlineDrones = availableCapacityViews().map((view) => view.drone);
  const pool = compliantOnlineDrones.length ? compliantOnlineDrones : repo.drones.all();
  const capable = pool.filter((drone) => drone.maxPayloadKg >= weight)
    .sort((a, b) => a.maxPayloadKg - b.maxPayloadKg);
  return capable[0] ?? pool.slice().sort((a, b) => b.maxPayloadKg - a.maxPayloadKg)[0];
}
