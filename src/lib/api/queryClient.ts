import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds default freshness
      gcTime: 1000 * 60 * 10, // 10 minutes cache garbage collection
      retry: (failureCount, error: any) => {
        // Auth, permission, conflict (already_taken...) and validation errors won't change on retry.
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404 || status === 409 || status === 422) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
