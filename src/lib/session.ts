import { router } from 'expo-router';

import { removeAuthToken, setUnauthorizedHandler } from '@/lib/api/client';
import { queryClient } from '@/lib/api/queryClient';
import { riderAuthService } from '@/lib/api/services/riderAuthService';
import { useAuthStore } from '@/lib/auth/authStore';
import { stopBackgroundLocation } from '@/lib/location/backgroundLocation';
import { unregisterDevicePush } from '@/lib/notifications';
import { useDeliveryStore } from '@/lib/store';

let signingOut: Promise<void> | null = null;

/**
 * The one way a session ends on this phone, whether the rider signed out or
 * the server answered 401. Concurrent callers (several requests failing at
 * once) share the same run, so the token is deleted exactly once.
 */
export function signOutLocally(): Promise<void> {
  if (!signingOut) {
    signingOut = (async () => {
      await stopBackgroundLocation().catch(() => {});
      await unregisterDevicePush().catch(() => {});
      queryClient.clear();
      useDeliveryStore.getState().reset();
      useAuthStore.getState().reset();
      await removeAuthToken();
      router.replace('/');
    })().finally(() => {
      signingOut = null;
    });
  }
  return signingOut;
}

/** Manual sign-out: tell the server, then always clean up locally. */
export async function logout(): Promise<void> {
  try {
    // Unregister while the token still works: logout revokes it.
    await unregisterDevicePush();
    await riderAuthService.logout();
  } catch {
    // offline or already revoked: still sign out here
  } finally {
    await signOutLocally();
  }
}

setUnauthorizedHandler(() => {
  void signOutLocally();
});
