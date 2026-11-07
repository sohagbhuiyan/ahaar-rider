import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { riderDocumentService } from '../services/riderDocumentService';
import { useAuthStore } from '../../auth/authStore';

export function useRiderDocuments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.rider.documents(),
    queryFn: riderDocumentService.getDocuments,
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: riderDocumentService.uploadDocument,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.rider.documents() });
    },
  });
}

export function useSaveVehicle() {
  const qc = useQueryClient();
  const { updateProfile } = useAuthStore();

  return useMutation({
    mutationFn: riderDocumentService.saveVehicle,
    onSuccess: (data) => {
      if (data?.driver_profile) {
        updateProfile(data.driver_profile);
      }
      qc.invalidateQueries({ queryKey: queryKeys.rider.documents() });
      qc.invalidateQueries({ queryKey: queryKeys.rider.me() });
    },
  });
}

export function useSubmitForReview() {
  const qc = useQueryClient();
  const { updateProfile } = useAuthStore();

  return useMutation({
    mutationFn: riderDocumentService.submitForReview,
    onSuccess: (data) => {
      if (data?.driver_profile) {
        updateProfile(data.driver_profile);
      }
      qc.invalidateQueries({ queryKey: queryKeys.rider.documents() });
      qc.invalidateQueries({ queryKey: queryKeys.rider.me() });
    },
  });
}
