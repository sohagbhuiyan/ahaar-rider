import { create } from 'zustand';
import { getAuthToken, storeAuthToken } from '../api/client';
import type { DriverProfileState, RiderUser } from '../api/types';

interface AuthState {
  token: string | null;
  user: RiderUser | null;
  profile: DriverProfileState | null;
  isInitializing: boolean;
  /** Sign-in / registration: persists the token. */
  setAuth: (token: string, user: RiderUser, profile: DriverProfileState) => Promise<void>;
  /** A fresh GET /rider/me: the token is already stored. */
  setSession: (user: RiderUser, profile: DriverProfileState) => void;
  updateProfile: (profileUpdates: Partial<DriverProfileState>) => void;
  restoreToken: () => Promise<string | null>;
  /** In-memory only. The SecureStore token is removed by `signOutLocally`. */
  reset: () => void;
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

  setSession: (user, profile) => set({ user, profile }),

  updateProfile: (profileUpdates) => {
    const current = get().profile;
    if (current) {
      set({ profile: { ...current, ...profileUpdates } });
    }
  },

  restoreToken: async () => {
    const token = await getAuthToken();
    set({ token, isInitializing: false });
    return token;
  },

  reset: () => set({ token: null, user: null, profile: null, isInitializing: false }),
}));
