import { beforeEach, expect, it } from 'vitest';
import { AuditStatus } from '@/models';
import { estimateDroneForWeight } from '@/services/order-estimate';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';

beforeEach(() => {
  resetDB();
});

it('估价不使用飞手资质不合规的在线运力', () => {
  repo.pilots.update('u_p1', { noCrimeProof: AuditStatus.Rejected });

  const drone = estimateDroneForWeight(8);

  expect(drone?.id).toBe('d3');
  expect(drone?.id).not.toBe('d4');
});
