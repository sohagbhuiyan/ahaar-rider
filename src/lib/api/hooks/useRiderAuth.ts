import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { logout } from '../../session';
import { useAuthStore } from '../../auth/authStore';
import { queryKeys } from '../queryKeys';
import { riderAuthService } from '../services/riderAuthService';

/**
 * GET /rider/me, mirrored into the auth store. Enabled only with a token; a
 * 401 is handled by the client interceptor (signOutLocally), and a network
 * error surfaces as `isError` so screens can offer a retry.
 */
export function useRiderMe(
  enabled = true,
  options: { refetchInterval?: number | false } = {},
) {
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);

  return useQuery({
    queryKey: queryKeys.rider.me(),
    queryFn: async () => {
      const res = await riderAuthService.me();
      if (res?.user && res?.driver_profile) setSession(res.user, res.driver_profile);
      return res;
    },
    enabled: enabled && Boolean(token),
    staleTime: 1000 * 60,
    refetchInterval: options.refetchInterval,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: riderAuthService.login,
    onSuccess: async (data) => {
      await setAuth(data.token, data.user, data.driver_profile);
      qc.setQueryData(queryKeys.rider.me(), { user: data.user, driver_profile: data.driver_profile });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: riderAuthService.register,
    onSuccess: async (data) => {
      await setAuth(data.token, data.user, data.driver_profile);
      qc.setQueryData(queryKeys.rider.me(), { user: data.user, driver_profile: data.driver_profile });
    },
  });
}

/** POST /rider/auth/logout, then the full local clean-up (always, even offline). */
export function useLogout() {
  return useMutation({ mutationFn: logout });
}
