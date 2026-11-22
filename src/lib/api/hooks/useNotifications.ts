import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { useAuthStore } from '../../auth/authStore';
import { queryKeys } from '../queryKeys';
import { notificationService } from '../services/notificationService';
import type { AppNotification, NotificationsPage } from '../types';

const UNREAD_POLL_MS = 60_000;

type QC = ReturnType<typeof useQueryClient>;
type Pages = InfiniteData<NotificationsPage, number>;

function useSignedIn(): boolean {
  const token = useAuthStore((s) => s.token);
  const approved = useAuthStore((s) => s.profile?.approval_status === 'approved');
  return Boolean(token) && approved;
}

/**
 * Unread inbox count for the bell and the app icon badge. `poll` refetches
 * every 60 s (pass the screen's focus state); pushes invalidate it too.
 */
export function useUnreadNotificationCount(options: { poll?: boolean } = {}) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: notificationService.unreadCount,
    enabled: signedIn,
    staleTime: 1000 * 15,
    refetchInterval: options.poll ? UNREAD_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** The inbox, newest first, 20 per page. */
export function useNotificationsList() {
  const signedIn = useSignedIn();
  const qc = useQueryClient();
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: async ({ pageParam }) => {
      const page = await notificationService.list(pageParam);
      // The list carries the count too; keep the bell in step.
      if (page.meta && pageParam === 1) {
        qc.setQueryData(queryKeys.notifications.unreadCount(), page.meta.unread_count);
      }
      return page;
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta && last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined,
    enabled: signedIn,
    staleTime: 1000 * 15,
  });
}

/** Rewrite cached inbox rows in place. */
function patchRows(qc: QC, patch: (n: AppNotification) => AppNotification) {
  qc.setQueryData<Pages>(queryKeys.notifications.list(), (pages) =>
    pages
      ? { ...pages, pages: pages.pages.map((p) => ({ ...p, data: p.data.map(patch) })) }
      : pages,
  );
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: (id) => {
      const now = new Date().toISOString();
      patchRows(qc, (n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n));
      qc.setQueryData<number>(queryKeys.notifications.unreadCount(), (c) => Math.max(0, (c ?? 1) - 1));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllRead,
    onMutate: () => {
      const now = new Date().toISOString();
      patchRows(qc, (n) => (n.read_at ? n : { ...n, read_at: now }));
      qc.setQueryData(queryKeys.notifications.unreadCount(), 0);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });
}
