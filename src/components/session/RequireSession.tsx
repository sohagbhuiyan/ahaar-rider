import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAuthStore } from '@/lib/auth/authStore';

/**
 * Screens past the gateway need a token and a loaded profile. Anything else
 * (cold start straight onto a deep link, a session that just ended) goes back
 * to '/', which restores the session or shows sign-in.
 */
export function RequireSession({ children, approved = true }: { children: ReactNode; approved?: boolean }) {
  const token = useAuthStore((s) => s.token);
  const profile = useAuthStore((s) => s.profile);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) return null;
  if (!token || !profile) return <Redirect href="/" />;
  if (approved && profile.approval_status !== 'approved') return <Redirect href="/" />;
  return <>{children}</>;
}
