import { it, expect } from 'vitest';
import { canTransition, NEXT } from '@/utils/order-machine';
import { OrderStatus as S } from '@/models';
it('合法性与流转表自洽', () => { for (const f of Object.values(S)) for (const t of Object.values(S)) expect(canTransition(f, t)).toBe(NEXT[f].includes(t)); });
it('Created 不能直达 Completed', () => { expect(canTransition(S.Created, S.Completed)).toBe(false); });
it('终态不可再流转', () => { expect(NEXT[S.Settled]).toEqual([]); expect(NEXT[S.Cancelled]).toEqual([]); });
