import { repo } from './repo';
import { genId } from './id';
import { nowISO } from './time';
import { NotificationType } from '@/models';
export function notify(userId: string, type: NotificationType, title: string, body: string, ref?: string) {
  return repo.notifications.insert({ id: genId('nt'), userId, type, title, body, read: false, createdAt: nowISO(), ref });
}
