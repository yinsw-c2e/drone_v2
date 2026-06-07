import { it, expect, beforeEach } from 'vitest';
import { resetDB } from '@/utils/db';
import { repo } from '@/utils/repo';
import { walletCredit, walletWithdraw } from '@/utils/wallet';
beforeEach(() => resetDB());
it('实时入账进 balance，非实时进 pending', () => { walletCredit('u1', 'o1', 5000, 'realtime', 'x'); walletCredit('u1', 'o2', 3000, 'T+1', 'y'); const w = repo.wallets.find('u1')!; expect(w.balanceCent).toBe(5000); expect(w.pendingCent).toBe(3000); });
it('提现超额抛错、足额成功', () => { walletCredit('u2', 'o', 1000, 'realtime', 'x'); expect(() => walletWithdraw('u2', 2000)).toThrow(); walletWithdraw('u2', 600); expect(repo.wallets.find('u2')!.balanceCent).toBe(400); });
