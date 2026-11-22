import { apiClient } from '../client';
import type { AppNotification, NotificationsPage } from '../types';

export const NOTIFICATIONS_PER_PAGE = 20;

export const notificationService = {
  list: async (page = 1, perPage = NOTIFICATIONS_PER_PAGE): Promise<NotificationsPage> => {
    const { data } = await apiClient.get<NotificationsPage>('/notifications', {
      params: { page, per_page: perPage },
    });
    return { data: data.data ?? [], meta: data.meta };
  },

  unreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<{ data: { unread_count: number } }>('/notifications/unread-count');
    return data.data?.unread_count ?? 0;
  },

  markRead: async (id: string): Promise<AppNotification> => {
    const { data } = await apiClient.post<{ data: AppNotification }>(`/notifications/${id}/read`);
    return data.data;
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.post('/notifications/read-all');
  },
};
