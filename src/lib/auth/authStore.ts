import { create } from 'zustand';
import { getAuthToken, removeAuthToken, storeAuthToken } from '../api/client';
import type { DriverProfileState, RiderUser } from '../api/types';

interface AuthState {
  token: string | null;
  user: RiderUser | null;
  profile: DriverProfileState | null;
  isInitializing: boolean;
  setAuth: (token: string, user: RiderUser, profile: DriverProfileState) => Promise<void>;
  updateProfile: (profileUpdates: Partial<DriverProfileState>) => void;
  clearAuth: () => Promise<void>;
  restoreToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  profile: null,
  isInitializing: true,

  setAuth: async (token, user, profile) => {
    await storeAuthToken(token);
    set({ token, user, profile, isInitializing: false });
  },

  updateProfile: (profileUpdates) => {
    const current = get().profile;
    if (current) {
      set({ profile: { ...current, ...profileUpdates } });
    }
  },

  clearAuth: async () => {
    await removeAuthToken();
    set({ token: null, user: null, profile: null, isInitializing: false });
  },

  restoreToken: async () => {
    try {
      const token = await getAuthToken();
      set({ token, isInitializing: false });
      return token;
    } catch {
      set({ token: null, isInitializing: false });
      return null;
    }
  },
}));
