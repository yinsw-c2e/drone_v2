import { it, expect } from 'vitest';
import { computeSettlement } from '@/utils/settlement';
it('任意金额分账加总恒等总额', () => { for (let k = 0; k < 300; k++) { const t = Math.floor(Math.random() * 1e7) + 1; expect(computeSettlement(t).reduce((s, i) => s + i.amountCent, 0)).toBe(t); } });
it('五方齐全且非平台项比例正确', () => { const items = computeSettlement(1_000_000); const parties = items.map((i) => i.party).sort(); expect(parties).toEqual(['insurance', 'owner', 'pilot', 'platform', 'tax']); for (const i of items) if (i.party !== 'platform') expect(i.amountCent).toBe(Math.round(1_000_000 * i.ratio)); });
