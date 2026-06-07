import { providers } from '@/api/providers';
import { repo } from '@/utils/repo';

export const mockServer = {
  providers,
  snapshot() {
    return {
      orders: repo.orders.all(),
      capacity: repo.capacity.all(),
      notifications: repo.notifications.all(),
    };
  },
};
