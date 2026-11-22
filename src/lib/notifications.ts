import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { apiClient } from '@/lib/api/client';

/** Must match the backend's FCM channel (docs/delivery-api.md) and the plugin's `defaultChannel`. */
export const DELIVERY_CHANNEL_ID = 'ahaar-deliveries';

export type PushType =
  | 'offer.new'
  | 'offer.assigned'
  | 'offer.taken'
  | 'job.cancelled'
  | 'run.assigned';

/** The push `data` block: strings only. */
export interface PushData {
  type?: PushType | string;
  order_id?: string;
  run_id?: string;
  reason?: string;
}

/** Incoming orders get the in-app card instead of a system banner; `offer.taken` is silent. */
const IN_APP_TYPES = new Set(['offer.new', 'offer.assigned']);

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = pushData(notification).type;
    if (type === 'offer.taken') {
      return { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
    }
    return {
      shouldShowBanner: !IN_APP_TYPES.has(String(type)),
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
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

export async function ensureDeliveryChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DELIVERY_CHANNEL_ID, {
    name: 'Delivery alerts',
    description: 'New orders, assignments and cancellations',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF7A00',
    // No `sound`: Android uses the system default. 'default' is treated as a
    // bundled custom sound file name and fails.
  });
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
    await ensureDeliveryChannel();
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
