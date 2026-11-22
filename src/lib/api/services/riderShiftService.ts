import { apiClient } from '../client';
import type { ApprovalStatus, LocationPoint, PublicBranch } from '../types';

export interface ToggleStatusResponse {
  is_active: boolean;
  is_busy: boolean;
  approval_status: ApprovalStatus;
}

export interface LocationResponse {
  status: string;
  /** A job is in hand: keep the background task running. */
  tracking: boolean;
  received: number;
}

export const riderShiftService = {
  /** Public: the registration form's branch list. */
  getBranches: async (): Promise<PublicBranch[]> => {
    const { data } = await apiClient.get<{ data: PublicBranch[] }>('/rider/branches');
    return data.data ?? [];
  },

  /** Going offline with a job in hand fails with 422 ("finish your delivery first"). */
  toggleStatus: async (isActive: boolean): Promise<ToggleStatusResponse> => {
    const { data } = await apiClient.post<{ data: ToggleStatusResponse }>('/rider/status', {
      is_active: isActive,
    });
    return data.data;
  },

  /** One point, or a batch (max 60, oldest first). */
  sendLocation: async (points: LocationPoint[]): Promise<LocationResponse> => {
    const body = points.length === 1 ? points[0] : { points };
    const { data } = await apiClient.post<{ data: LocationResponse }>('/rider/location', body);
    return data.data;
  },
};
