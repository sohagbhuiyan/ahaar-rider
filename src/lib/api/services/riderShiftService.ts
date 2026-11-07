import { apiClient } from '../client';
import type { DriverProfileState } from '../types';

export const riderShiftService = {
  toggleStatus: async (isActive: boolean): Promise<{ driver_profile: DriverProfileState }> => {
    const { data } = await apiClient.post<{ data: { driver_profile: DriverProfileState } }>('/rider/status', {
      is_active: isActive,
    });
    return data.data;
  },

  updateLocation: async (payload: {
    lat: number;
    lng: number;
    heading?: number | null;
    speed?: number | null;
  }): Promise<void> => {
    await apiClient.post('/rider/location', payload);
  },
};
