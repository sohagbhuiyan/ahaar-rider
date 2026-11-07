export const queryKeys = {
  rider: {
    all: ['rider'] as const,
    me: () => [...queryKeys.rider.all, 'me'] as const,
    documents: () => [...queryKeys.rider.all, 'documents'] as const,
  },
  deliveries: {
    all: ['deliveries'] as const,
    runsToday: () => [...queryKeys.deliveries.all, 'runs', 'today'] as const,
    detail: (id: number | string) => [...queryKeys.deliveries.all, 'detail', String(id)] as const,
  },
  orders: {
    all: ['orders'] as const,
    available: () => [...queryKeys.orders.all, 'available'] as const,
    detail: (id: number | string) => [...queryKeys.orders.all, 'detail', String(id)] as const,
  },
  branches: {
    all: ['branches'] as const,
    list: () => [...queryKeys.branches.all, 'list'] as const,
  },
} as const;
