export const queryKeys = {
  rider: {
    all: ['rider'] as const,
    me: () => [...queryKeys.rider.all, 'me'] as const,
    documents: () => [...queryKeys.rider.all, 'documents'] as const,
    stats: () => [...queryKeys.rider.all, 'stats'] as const,
  },
  /** GET /rider/jobs/active: whatever the rider holds right now. */
  activeJob: ['jobs', 'active'] as const,
  deliveries: {
    all: ['deliveries'] as const,
    runsToday: () => [...queryKeys.deliveries.all, 'runs', 'today'] as const,
    detail: (id: number | string) => [...queryKeys.deliveries.all, 'detail', String(id)] as const,
  },
  offers: {
    all: ['offers'] as const,
    list: () => [...queryKeys.offers.all, 'list'] as const,
  },
  orders: {
    all: ['orders'] as const,
    /** GET /rider/orders/{id}: an Offer or a Job. */
    detail: (id: number | string) => [...queryKeys.orders.all, 'detail', String(id)] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
  branches: {
    all: ['branches'] as const,
    list: () => [...queryKeys.branches.all, 'list'] as const,
  },
} as const;
