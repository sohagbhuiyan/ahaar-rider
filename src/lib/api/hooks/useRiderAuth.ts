import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/authStore';
import { getAuthToken, removeAuthToken, storeAuthToken } from '../client';
import { queryKeys } from '../queryKeys';
import { riderAuthService } from '../services/riderAuthService';

export function useRiderMe(
  enabled = true,
  options: { refetchInterval?: number | false } = {},
) {
  const { setAuth, clearAuth } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.rider.me(),
    queryFn: async () => {
      const token = await getAuthToken();
      if (!token) return null;
      try {
        const res = await riderAuthService.me();
        if (res?.user && res?.driver_profile) {
          await setAuth(token, res.user, res.driver_profile);
        }
        return res;
      } catch (err) {
        // A revoked/expired token: drop it so the rider lands on sign-in.
        if (isAxiosError(err) && err.response?.status === 401) {
          await clearAuth();
          return null;
        }
        throw err;
      }
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: options.refetchInterval,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: riderAuthService.login,
    onSuccess: async (data) => {
      await storeAuthToken(data.token);
      await setAuth(data.token, data.user, data.driver_profile);
      qc.invalidateQueries({ queryKey: queryKeys.rider.all });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: riderAuthService.register,
    onSuccess: async (data) => {
      await storeAuthToken(data.token);
      await setAuth(data.token, data.user, data.driver_profile);
      qc.invalidateQueries({ queryKey: queryKeys.rider.all });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      try {
        await riderAuthService.logout();
      } catch {
        // quiet network fail on logout
      }
      await removeAuthToken();
      await clearAuth();
    },
    onSuccess: () => {
      qc.clear();
    },
  });
}
