import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/authStore';
import { queryKeys } from '../queryKeys';
import { riderShiftService } from '../services/riderShiftService';

export function useToggleShiftStatus() {
  const qc = useQueryClient();
  const { updateProfile } = useAuthStore();

  return useMutation({
    mutationFn: riderShiftService.toggleStatus,
    onSuccess: (data) => {
      if (data?.driver_profile) {
        updateProfile(data.driver_profile);
      }
      qc.invalidateQueries({ queryKey: queryKeys.rider.me() });
      qc.invalidateQueries({ queryKey: queryKeys.deliveries.all });
      qc.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

export function useSendLocationBeacon() {
  return useMutation({
    mutationFn: riderShiftService.updateLocation,
  });
}
