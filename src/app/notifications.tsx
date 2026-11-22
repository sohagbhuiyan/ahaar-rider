import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequireSession } from '@/components/session/RequireSession';
import { EmptyState, ErrorState, LoadingSpinner } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api/client';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsList,
  useUnreadNotificationCount,
} from '@/lib/api/hooks/useNotifications';
import type { AppNotification } from '@/lib/api/types';
import { routeForNotification } from '@/lib/notifications';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<string, { icon: string; tone: string }> = {
  'offer.new': { icon: '🛵', tone: 'bg-brand-50 border-brand-200' },
  'offer.assigned': { icon: '📌', tone: 'bg-info-soft border-info/20' },
  'offer.taken': { icon: '🏁', tone: 'bg-surface-muted border-border' },
  'job.updated': { icon: '🛍️', tone: 'bg-success-soft border-success/20' },
  'job.cancelled': { icon: '⛔', tone: 'bg-danger-soft border-danger/20' },
  'run.assigned': { icon: '🚗', tone: 'bg-brand-50 border-brand-200' },
};
const DEFAULT_ICON = { icon: '🔔', tone: 'bg-surface-muted border-border' };

/** "just now", "5 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.round((Date.now() - then) / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 7) return `${day} days ago`;
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(then));
}

export default function NotificationsScreen() {
  return (
    <RequireSession>
      <NotificationsContent />
    </RequireSession>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const list = useNotificationsList();
  const { data: unread = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.data) ?? [], [list.data]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    const href = routeForNotification(n);
    if (href) router.push(href as never);
  };

  let body: React.ReactNode;
  if (list.isLoading) {
    body = <LoadingSpinner label="Loading notifications…" className="flex-1" />;
  } else if (list.error && items.length === 0) {
    body = (
      <ErrorState message={extractErrorMessage(list.error)} onRetry={() => list.refetch()} className="flex-1" />
    );
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => open(item)} />}
        ItemSeparatorComponent={() => <View className="h-px bg-border ml-[72px]" />}
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching && !list.isFetchingNextPage}
            onRefresh={() => list.refetch()}
            tintColor={colors.brand[500]}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
        }}
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={colors.brand[500]} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="No notifications yet"
            description="New orders, assignments and updates from the kitchen will show up here."
            className="flex-1"
          />
        }
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pt-2 pb-3 bg-surface border-b border-border flex-row items-center gap-3">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted border border-border"
        >
          <Text className="text-base font-bold text-text-primary">←</Text>
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-black text-text-primary">Notifications</Text>
          <Text className="text-xs text-text-secondary">{unread > 0 ? `${unread} unread` : 'All caught up'}</Text>
        </View>
        <Pressable
          onPress={() => markAll.mutate()}
          disabled={unread === 0 || markAll.isPending}
          accessibilityRole="button"
          hitSlop={8}
          className={cn('px-2 py-1', (unread === 0 || markAll.isPending) && 'opacity-40')}
        >
          <Text className="text-sm font-bold text-brand-600">Mark all read</Text>
        </Pressable>
      </View>
      {body}
    </SafeAreaView>
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const unread = !item.read_at;
  const { icon, tone } = (item.type && TYPE_ICON[item.type]) || DEFAULT_ICON;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title ?? ''}. ${item.body ?? ''}`}
      className={cn('flex-row gap-3 px-5 py-4 active:bg-surface-muted', unread && 'bg-brand-50/40')}
    >
      <View className={cn('h-10 w-10 items-center justify-center rounded-full border', tone)}>
        <Text className="text-lg">{icon}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-start gap-2">
          <Text
            className={cn('flex-1 text-sm text-text-primary', unread ? 'font-black' : 'font-semibold')}
            numberOfLines={1}
          >
            {item.title ?? 'Notification'}
          </Text>
          <Text className="text-[11px] text-text-muted">{relativeTime(item.created_at)}</Text>
        </View>
        {item.body ? (
          <Text className="mt-0.5 text-xs text-text-secondary" numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
      </View>
      <View className="w-2.5 items-center pt-1.5">
        {unread ? <View className="h-2.5 w-2.5 rounded-full bg-brand-500" /> : null}
      </View>
    </Pressable>
  );
}
