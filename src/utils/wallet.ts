import { repo } from './repo';
import { genId } from './id';
import { nowISO } from './time';
import { LedgerType, LedgerStatus } from '@/models';
import type { Wallet } from '@/models';
function ensure(userId: string): Wallet { return repo.wallets.find(userId) ?? repo.wallets.insert({ id: userId, userId, balanceCent: 0, pendingCent: 0 }); }
export function walletCredit(userId: string, orderId: string, amountCent: number, cycle: string, note: string) {
  const w = ensure(userId); const available = cycle === 'realtime';
  repo.ledger.insert({ id: genId('le'), userId, orderId, type: LedgerType.SettleIn, amountCent, cycle, status: available ? LedgerStatus.Available : LedgerStatus.Pending, note, createdAt: nowISO() });
  if (available) repo.wallets.update(userId, { balanceCent: w.balanceCent + amountCent });
  else repo.wallets.update(userId, { pendingCent: w.pendingCent + amountCent });
}
export function walletWithdraw(userId: string, amountCent: number) {
  const w = ensure(userId); if (w.balanceCent < amountCent) throw new Error('可用余额不足');
  repo.wallets.update(userId, { balanceCent: w.balanceCent - amountCent });
  repo.ledger.insert({ id: genId('le'), userId, type: LedgerType.Withdraw, amountCent: -amountCent, cycle: '-', status: LedgerStatus.Paid, note: '提现', createdAt: nowISO() });
}
export function releasePending(userId: string) {
  const w = ensure(userId);
  repo.wallets.update(userId, { balanceCent: w.balanceCent + w.pendingCent, pendingCent: 0 });
  repo.ledger.where((l) => l.userId === userId && l.status === LedgerStatus.Pending).forEach((l) => (l.status = LedgerStatus.Available));
}
