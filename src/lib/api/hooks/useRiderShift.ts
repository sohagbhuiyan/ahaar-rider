import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../auth/authStore';
import { queryKeys } from '../queryKeys';
import { riderShiftService } from '../services/riderShiftService';

export function useToggleShiftStatus() {
  const qc = useQueryClient();
  const updateProfile = useAuthStore((s) => s.updateProfile);

  return useMutation({
    mutationFn: riderShiftService.toggleStatus,
    onSuccess: (data) => {
      // The endpoint answers `{ is_active, is_busy, approval_status }`, not a profile.
      if (data) {
        updateProfile({
          is_active: data.is_active,
          is_busy: data.is_busy,
          approval_status: data.approval_status,
        });
      }
      qc.invalidateQueries({ queryKey: queryKeys.rider.me() });
      qc.invalidateQueries({ queryKey: queryKeys.activeJob });
      qc.invalidateQueries({ queryKey: queryKeys.offers.all });
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.all });
    },
  });
}

/** Public branch list for the registration form. */
export function useBranches(enabled = true) {
  return useQuery({
    queryKey: queryKeys.branches.list(),
    queryFn: riderShiftService.getBranches,
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}
