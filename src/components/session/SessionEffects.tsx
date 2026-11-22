import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner-native';

import { IncomingOrderCard } from '@/components/delivery/IncomingOrderCard';
import { removeOfferFromCache, useActiveJob } from '@/lib/api/hooks/useRiderDeliveries';
import { queryKeys } from '@/lib/api/queryKeys';
import { riderShiftService } from '@/lib/api/services/riderShiftService';
import type { ActiveJob } from '@/lib/api/types';
import { useAuthStore } from '@/lib/auth/authStore';
import { needsTracking } from '@/lib/delivery';
import {
  hasBackgroundPermission,
  queueAndFlush,
  startBackgroundLocation,
  stopBackgroundLocation,
  toPoint,
} from '@/lib/location/backgroundLocation';
import {
  listenForPushTokenChanges,
  pushData,
  registerDevicePush,
  type PushData,
} from '@/lib/notifications';
import { useDeliveryStore } from '@/lib/store';

const IDLE_PING_MS = 30_000;

/** Where a notification tap should land. */
function routeForPush(data: PushData): string | null {
  const orderId = Number(data.order_id);
  switch (data.type) {
    case 'offer.new':
    case 'offer.assigned':
    case 'offer.taken':
    case 'job.cancelled':
      return orderId ? `/order/${orderId}` : '/(tabs)/orders';
    case 'run.assigned':
      return '/(tabs)/orders';
    default:
      return null;
  }
}

/**
 * Everything that lives as long as a signed-in session, independent of the
 * screen: push registration, push handling and taps, location tracking, and
 * the incoming-order card. Mounted once in the root layout.
 */
export function SessionEffects() {
  const token = useAuthStore((s) => s.token);
  const approved = useAuthStore((s) => s.profile?.approval_status === 'approved');
  const signedIn = Boolean(token);

  usePushRegistration(signedIn);
  usePushHandling(signedIn && approved);
  useDeliveryTracking(signedIn && approved);

  return signedIn && approved ? <IncomingOrderCard /> : null;
}

function usePushRegistration(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;
    registerDevicePush();
    return listenForPushTokenChanges();
  }, [signedIn]);
}

function usePushHandling(enabled: boolean) {
  const qc = useQueryClient();
  const router = useRouter();
  const showIncomingOffer = useDeliveryStore((s) => s.showIncomingOffer);

  // Push arrived while the app is open.
  useEffect(() => {
    if (!enabled) return;
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = pushData(notification);
      const orderId = Number(data.order_id) || null;

      switch (data.type) {
        case 'offer.new':
        case 'offer.assigned': {
          qc.invalidateQueries({ queryKey: queryKeys.offers.all });
          const job = qc.getQueryData<ActiveJob>(queryKeys.activeJob);
          // Busy with a job: the list shows it; don't interrupt the delivery.
          if (orderId && !needsTracking(job)) {
            showIncomingOffer({ orderId, assigned: data.type === 'offer.assigned' });
          }
          break;
        }
        case 'offer.taken':
          if (orderId) {
            removeOfferFromCache(qc, orderId);
            qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
          }
          qc.invalidateQueries({ queryKey: queryKeys.offers.all });
          break;
        case 'job.cancelled':
          qc.invalidateQueries({ queryKey: queryKeys.activeJob });
          qc.invalidateQueries({ queryKey: queryKeys.offers.all });
          if (orderId) qc.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
          toast.warning(
            data.reason === 'unassigned'
              ? `Order #${orderId ?? ''} was reassigned by dispatch.`
              : `Order #${orderId ?? ''} was cancelled.`,
          );
          break;
        case 'run.assigned':
          qc.invalidateQueries({ queryKey: queryKeys.deliveries.runsToday() });
          qc.invalidateQueries({ queryKey: queryKeys.activeJob });
          break;
      }
    });
    return () => sub.remove();
  }, [enabled, qc, showIncomingOffer]);

  // Taps, including the one that launched the app from a killed state.
  useEffect(() => {
    if (!enabled) return;
    const open = (response: Notifications.NotificationResponse) => {
      const href = routeForPush(pushData(response.notification));
      if (href) router.push(href as never);
    };

    let cancelled = false;
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!cancelled && response) {
          open(response);
          Notifications.clearLastNotificationResponseAsync().catch(() => {});
        }
      })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      open(response);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled, router]);
}

type TrackingMode = 'off' | 'background' | 'foreground';

/**
 * - Job in hand: background task (or, without background permission, a
 *   foreground watcher while the app is open) streaming batches.
 * - Online, no job: one ping every ~30 s while the app is open.
 * - Offline / signed out: nothing.
 */
function useDeliveryTracking(enabled: boolean) {
  const router = useRouter();
  const isOnline = useAuthStore((s) => Boolean(s.profile?.is_active));
  const { data: job } = useActiveJob({ poll: enabled && isOnline });
  const tracking = enabled && isOnline && needsTracking(job);

  const backgroundChoice = useDeliveryStore((s) => s.backgroundLocation);
  const promptShown = useDeliveryStore((s) => s.backgroundPromptShown);
  const markPromptShown = useDeliveryStore((s) => s.markBackgroundPromptShown);
  const setBackgroundChoice = useDeliveryStore((s) => s.setBackgroundLocation);
  const [mode, setMode] = useState<TrackingMode>('off');

  // Choose (and start) the tracking mode.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tracking) {
        await stopBackgroundLocation();
        if (!cancelled) setMode('off');
        return;
      }
      if (await hasBackgroundPermission()) {
        if (backgroundChoice !== 'granted') setBackgroundChoice('granted');
        const started = await startBackgroundLocation();
        if (!cancelled) setMode(started ? 'background' : 'foreground');
        return;
      }
      if (!promptShown && backgroundChoice === 'unknown') {
        // Explain first; the screen asks and records the choice, which re-runs this.
        markPromptShown();
        router.push('/location-permission');
        return;
      }
      if (!cancelled) setMode('foreground');
    })();
    return () => {
      cancelled = true;
    };
  }, [tracking, backgroundChoice, promptShown, markPromptShown, setBackgroundChoice, router]);

  // Foreground-only fallback while the app is open.
  useEffect(() => {
    if (mode !== 'foreground') return;
    let sub: Location.LocationSubscription | null = null;
    let stopped = false;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
      if (!perm?.granted || stopped) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 50 },
        (loc) => {
          queueAndFlush([toPoint(loc)]);
        },
      ).catch(() => null);
      if (stopped) sub?.remove();
    })();
    return () => {
      stopped = true;
      sub?.remove();
    };
  }, [mode]);

  // Idle ping: online without a job.
  const pinging = useRef(false);
  useEffect(() => {
    if (!enabled || !isOnline || tracking) return;
    let mounted = true;
    const ping = async () => {
      if (pinging.current) return;
      pinging.current = true;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !mounted) return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (mounted) await riderShiftService.sendLocation([toPoint(loc)]);
      } catch {
        // quiet beacon fail
      } finally {
        pinging.current = false;
      }
    };
    ping();
    const interval = setInterval(ping, IDLE_PING_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [enabled, isOnline, tracking]);
}
