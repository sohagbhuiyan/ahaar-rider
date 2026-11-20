import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../auth/authStore';
import { queryKeys } from '../queryKeys';
import { riderDocumentService } from '../services/riderDocumentService';
import type { DocumentsResponse } from '../types';

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
    onSuccess: (data) => {
      qc.setQueryData<DocumentsResponse>(queryKeys.rider.documents(), data);
    },
  });
}

export function useSaveVehicle() {
  const qc = useQueryClient();
  const { updateProfile } = useAuthStore();

  return useMutation({
    mutationFn: riderDocumentService.saveVehicle,
    onSuccess: (data) => {
      if (data?.driver_profile) updateProfile(data.driver_profile);
      if (data?.documents) qc.setQueryData(queryKeys.rider.documents(), data.documents);
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
      if (data?.driver_profile) updateProfile(data.driver_profile);
      qc.invalidateQueries({ queryKey: queryKeys.rider.documents() });
      qc.invalidateQueries({ queryKey: queryKeys.rider.me() });
    },
  });
}
