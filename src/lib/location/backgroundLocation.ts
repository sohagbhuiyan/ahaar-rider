import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { API_BASE_URL, TOKEN_KEY } from '@/lib/api/client';
import type { LocationPoint } from '@/lib/api/types';
import { colors } from '@/lib/theme';

/**
 * Live rider position while a job is in hand.
 *
 * The task runs with the app in the background (Android foreground service,
 * iOS background location) and posts batches to POST /rider/location. It
 * can't use the axios client or React state: it may run headless after the
 * app is killed, so it reads the token from SecureStore itself and keeps
 * failed points in a module-level buffer (lost if the OS kills the JS
 * context; the next fix replaces them anyway).
 */
export const LOCATION_TASK = 'ahaar-rider-location';

const MAX_POINTS = 60; // server batch limit
let buffer: LocationPoint[] = [];
let flushing = false;

export function toPoint(loc: Location.LocationObject): LocationPoint {
  const { latitude, longitude, heading, speed, accuracy } = loc.coords;
  return {
    lat: latitude,
    lng: longitude,
    heading: heading != null && heading >= 0 && heading <= 360 ? heading : null,
    speed: speed != null && speed >= 0 ? Math.min(speed, 100) : null,
    accuracy: accuracy != null && accuracy >= 0 ? accuracy : null,
    recorded_at: new Date(loc.timestamp).toISOString(),
  };
}

type FlushResult = 'sent' | 'failed' | 'unauthorized' | 'not_tracking' | 'empty';

/**
 * Queue points and send everything buffered, oldest first. Used by the task
 * and by the foreground fallback (app open, no background permission).
 */
export async function queueAndFlush(points: LocationPoint[]): Promise<FlushResult> {
  buffer = [...buffer, ...points].slice(-MAX_POINTS);
  if (flushing || buffer.length === 0) return 'empty';
  flushing = true;
  const batch = buffer;
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      buffer = [];
      return 'unauthorized';
    }
    const res = await fetch(`${API_BASE_URL}/rider/location`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ points: batch }),
    });
    if (res.status === 401) {
      buffer = [];
      return 'unauthorized';
    }
    if (!res.ok) {
      // 429/5xx: keep the points for the next run. 422 means a bad point: drop the batch.
      if (res.status === 422) buffer = buffer.slice(batch.length);
      return 'failed';
    }
    buffer = buffer.slice(batch.length);
    const json = (await res.json().catch(() => null)) as { data?: { tracking?: boolean } } | null;
    return json?.data?.tracking === false ? 'not_tracking' : 'sent';
  } catch {
    return 'failed'; // offline: keep buffering (capped)
  } finally {
    flushing = false;
  }
}

// Must be defined at module scope, before React renders (imported by the root layout).
if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const result = await queueAndFlush(data.locations.map(toPoint));
    // Signed out, or the server says no job is in hand: stop the service.
    if (result === 'unauthorized' || result === 'not_tracking') {
      await stopBackgroundLocation();
    }
  });
}

export async function isBackgroundLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    return false;
  }
}

/** Needs foreground + background permission already granted. Idempotent. */
export async function startBackgroundLocation(): Promise<boolean> {
  try {
    if (await isBackgroundLocationRunning()) return true;
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15_000,
      distanceInterval: 50,
      deferredUpdatesInterval: 15_000,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Delivering order…',
        notificationBody: 'AHAAR is sharing your location with the kitchen and the customer.',
        notificationColor: colors.brand[500],
        killServiceOnDestroy: false,
      },
    });
    return true;
  } catch {
    // Expo Go (no background services on Android), or permission revoked.
    return false;
  }
}

export async function stopBackgroundLocation(): Promise<void> {
  try {
    if (await isBackgroundLocationRunning()) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {
    // not running
  }
  buffer = [];
}

export async function hasBackgroundPermission(): Promise<boolean> {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (!fg.granted) return false;
    if (Platform.OS === 'web') return false;
    const bg = await Location.getBackgroundPermissionsAsync();
    return bg.granted;
  } catch {
    return false;
  }
}
