import { apiClient } from '../client';
import type { DocumentsResponse, DriverDocumentItem, DriverProfileState } from '../types';

export const riderDocumentService = {
  getDocuments: async (): Promise<DocumentsResponse> => {
    const { data } = await apiClient.get<{ data: DocumentsResponse }>('/rider/documents');
    return data.data;
  },

  uploadDocument: async (formData: FormData): Promise<DriverDocumentItem> => {
    const { data } = await apiClient.post<{ data: DriverDocumentItem }>('/rider/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  saveVehicle: async (payload: {
    vehicle_type: 'car' | 'bike';
    vehicle_plate: string;
    vehicle_model?: string;
  }): Promise<{ driver_profile: DriverProfileState }> => {
    const { data } = await apiClient.post<{ data: { driver_profile: DriverProfileState } }>('/rider/vehicle', payload);
    return data.data;
  },

  submitForReview: async (): Promise<{ driver_profile: DriverProfileState }> => {
    const { data } = await apiClient.post<{ data: { driver_profile: DriverProfileState } }>('/rider/submit-for-review');
    return data.data;
  },
};
