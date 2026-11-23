import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiClient } from '@/lib/api/client';

/**
 * Android channels (docs/delivery-api.md, "Push sound and channels (v2)").
 * Android fixes a channel's sound, importance and vibration when it is first
 * created, so changing any of them means a new channel id.
 */
export const NEW_ORDERS_CHANNEL_ID = 'ahaar-new-orders';
/** Also the plugin's `defaultChannel` in app.json. */
export const UPDATES_CHANNEL_ID = 'ahaar-updates';
/** v1 channel (system default sound). Removed so riders don't see two entries in settings. */
const LEGACY_CHANNEL_ID = 'ahaar-deliveries';

/** Bundled by the expo-notifications plugin `sounds` option; the FCM `sound` is the same name. */
const NEW_ORDER_SOUND = 'new_order.wav';
const ORDER_UPDATE_SOUND = 'order_update.wav';

export type PushType =
  | 'offer.new'
  | 'offer.assigned'
  | 'offer.taken'
  | 'job.cancelled'
  | 'job.updated'
  | 'run.assigned'
  | 'run.ready'
  | 'run.updated';

/** The push `data` block: strings only. */
export interface PushData {
  type?: PushType | string;
  order_id?: string;
  run_id?: string;
  delivery_id?: string;
  reason?: string;
}

/** Pushes that only sync state: never shown, never in the inbox. */
const SILENT_TYPES = new Set(['offer.taken']);

export function isSilentPush(type: string | undefined | null): boolean {
  return SILENT_TYPES.has(String(type));
}

// Every non-silent push shows the heads-up banner, plays the channel sound and
// sets the badge, including while the app is open. For `offer.*` the
// incoming-order card is raised on top by SessionEffects.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const show = !isSilentPush(pushData(notification).type);
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: show,
    };
  },
});

/** `content.data` normally; FCM data-only messages on Android carry it on the trigger. */
export function pushData(notification: Notifications.Notification): PushData {
  const content = notification.request.content.data as Record<string, unknown> | null;
  if (content && Object.keys(content).length > 0) return content as PushData;
  const trigger = notification.request.trigger as { remoteMessage?: { data?: Record<string, string> } } | null;
  return (trigger?.remoteMessage?.data ?? {}) as PushData;
}

/** What a push or an inbox row points at. Ids are strings in a push, numbers in the inbox. */
export interface NotificationTarget {
  type?: string | null;
  order_id?: string | number | null;
  run_id?: string | number | null;
  delivery_id?: string | number | null;
}

/** Where tapping a push, or the same message in the inbox, should land. */
export function routeForNotification(target: NotificationTarget): string | null {
  const orderId = Number(target.order_id) || null;
  const deliveryId = Number(target.delivery_id) || null;
  switch (target.type) {
    case 'offer.new':
    case 'offer.assigned':
    case 'job.updated':
      return orderId ? `/order/${orderId}` : '/(tabs)/orders';
    // Gone from this rider (taken, cancelled, reassigned, timed out): opening
    // the order would show an error, or an accept card for an order dispatch
    // just took back. The orders tab shows what is actually theirs now.
    case 'offer.taken':
    case 'job.cancelled':
      return '/(tabs)/orders';
    case 'run.assigned':
    case 'run.ready':
    case 'run.updated':
      // The route tab: loading screen when ready, stops otherwise.
      return '/(tabs)/orders';
    default:
      if (orderId) return `/order/${orderId}`;
      if (deliveryId) return `/delivery/${deliveryId}`;
      if (target.run_id) return '/(tabs)/orders';
      return null;
  }
}

let channelsReady: Promise<void> | null = null;

/**
 * Create both channels and drop the v1 one. Runs on app start, before the
 * Android 13+ permission prompt, and must have run before the first push
 * arrives (a killed app's push is drawn by the system from the channel).
 * Safe to call often.
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!channelsReady) {
    channelsReady = (async () => {
      await Notifications.setNotificationChannelAsync(NEW_ORDERS_CHANNEL_ID, {
        name: 'New orders',
        description: 'New and assigned orders. Rings so you never miss one.',
        importance: Notifications.AndroidImportance.MAX,
        sound: NEW_ORDER_SOUND,
        enableVibrate: true,
        vibrationPattern: [0, 400, 250, 400, 250, 600],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        enableLights: true,
        lightColor: '#FF7A00',
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync(UPDATES_CHANNEL_ID, {
        name: 'Order updates',
        description: 'Kitchen handover, cancellations and other changes to your deliveries',
        importance: Notifications.AndroidImportance.HIGH,
        sound: ORDER_UPDATE_SOUND,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
      });
      const legacy = await Notifications.getNotificationChannelAsync(LEGACY_CHANNEL_ID).catch(() => null);
      if (legacy) await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID);
    })().catch(() => {
      // Try again next time (e.g. a build without the native module).
      channelsReady = null;
    });
  }
  return channelsReady;
}

/** App icon badge = unread inbox count. Best effort (iOS needs `allowBadge`). */
export function setAppBadge(count: number): void {
  Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => {});
}

let registeredToken: string | null = null;

async function postToken(token: string): Promise<void> {
  if (token === registeredToken) return;
  await apiClient.post('/device-tokens', { token, platform: 'android', app: 'rider' });
  registeredToken = token;
}

/**
 * Ask for permission and register this phone's FCM token with the backend.
 * Call after sign-in and on start while signed in. Best effort: never throws.
 */
export async function registerDevicePush(): Promise<string | null> {
  // iOS gives an APNs token here, not an FCM one, and the backend sends
  // through FCM only, so there is nothing useful to register on iOS yet.
  if (Platform.OS !== 'android' || !Device.isDevice) return null;
  try {
    // Android 13+ only shows the permission prompt once a channel exists.
    await ensureNotificationChannels();
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;

    const { data } = await Notifications.getDevicePushTokenAsync();
    const token = typeof data === 'string' ? data : null;
    if (token) await postToken(token);
    return token;
  } catch {
    // Expo Go (no remote push on Android since SDK 53), or offline.
    return null;
  }
}

/** FCM rolls tokens; re-register whenever it does. Returns the unsubscribe. */
export function listenForPushTokenChanges(): () => void {
  if (Platform.OS !== 'android') return () => {};
  const sub = Notifications.addPushTokenListener(({ data }) => {
    if (typeof data === 'string') postToken(data).catch(() => {});
  });
  return () => sub.remove();
}

/** Best effort, before the session goes away. Never triggers the 401 sign-out. */
export async function unregisterDevicePush(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await apiClient.delete('/device-tokens', { data: { token }, skipAuthRedirect: true, timeout: 5000 });
  } catch {
    // The backend also drops the token when the session is revoked.
  }
}
