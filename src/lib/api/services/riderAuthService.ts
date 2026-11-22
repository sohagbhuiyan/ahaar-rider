import { apiClient } from '../client';
import type { DriverProfileState, RiderUser } from '../types';

export interface AuthResponse {
  token: string;
  user: RiderUser;
  driver_profile: DriverProfileState;
}

export interface MeResponse {
  user: RiderUser;
  driver_profile: DriverProfileState;
}

export const riderAuthService = {
  register: async (payload: {
    name: string;
    phone: string;
    email: string;
    password: string;
    password_confirmation: string;
    branch_id?: number | null;
  }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<{ data: AuthResponse }>('/rider/auth/register', payload);
    return data.data;
  },

  login: async (payload: { login: string; password: string }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<{ data: AuthResponse }>('/rider/auth/login', {
      ...payload,
      device_name: 'rider-app',
    });
    return data.data;
  },

  me: async (): Promise<MeResponse> => {
    const { data } = await apiClient.get<{ data: MeResponse }>('/rider/me');
    return data.data;
  },

  logout: async (): Promise<void> => {
    // A 401 here just means the session was already gone.
    await apiClient.post('/rider/auth/logout', undefined, { skipAuthRedirect: true, timeout: 8000 });
  },
};
