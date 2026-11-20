import axios, { type AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'ahaar_rider_jwt_token';

// Point at the hosted API by default so the app works on a real phone in
// Expo Go. `localhost` / `10.0.2.2` only resolve on a simulator/emulator, so a
// physical device got "Network Error" before the request ever left the phone.
// Override with EXPO_PUBLIC_API_URL in .env.local (restart Metro after).
const HOSTED_API_URL = 'https://api.ahaar.store/api/v1';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || HOSTED_API_URL).replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore unavailable in some environments
  }
  return config;
});

export async function storeAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
    if (err.response?.data?.errors) {
      const firstField = Object.values(err.response.data.errors)[0];
      if (firstField && firstField[0]) return firstField[0];
    }
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (!err.response) {
      return err.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : `Can't reach the server (${API_BASE_URL}). Check your internet connection.`;
    }
    if (err.message) return err.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
