import { apiClient } from '../client';
import type { DocumentsResponse, DriverProfileState, VehicleType } from '../types';

const UPLOAD_TIMEOUT_MS = 60_000;

export const riderDocumentService = {
  getDocuments: async (): Promise<DocumentsResponse> => {
    const { data } = await apiClient.get<{ data: DocumentsResponse }>('/rider/documents');
    return data.data;
  },

  /** Upload or replace one document; resolves with the refreshed checklist. */
  uploadDocument: async ({
    formData,
    onProgress,
  }: {
    formData: FormData;
    onProgress?: (fraction: number) => void;
  }): Promise<DocumentsResponse> => {
    const { data } = await apiClient.post<{ data: DocumentsResponse }>('/rider/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
      // Axios would otherwise JSON-serialize the FormData on React Native.
      transformRequest: (body) => body,
      onUploadProgress: (event) => {
        if (onProgress && event.total) onProgress(Math.min(1, event.loaded / event.total));
      },
    });
    return data.data;
  },

  saveVehicle: async (payload: {
    vehicle_type: VehicleType;
    vehicle_plate: string;
    vehicle_model?: string;
  }): Promise<{ driver_profile: DriverProfileState; documents: DocumentsResponse }> => {
    const { data } = await apiClient.post<{
      data: { driver_profile: DriverProfileState; documents: DocumentsResponse };
    }>('/rider/vehicle', payload);
    return data.data;
  },

  submitForReview: async (): Promise<{ driver_profile: DriverProfileState }> => {
    const { data } = await apiClient.post<{ data: { driver_profile: DriverProfileState } }>(
      '/rider/submit-for-review',
    );
    return data.data;
  },
};
