import axios, { type AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'ahaar_rider_jwt_token';

// In development, Android emulator uses 10.0.2.2, iOS simulator uses localhost
const DEFAULT_API_URL = __DEV__
  ? (Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1')
  : 'https://api.ahaar.store/api/v1';

export const apiClient = axios.create({
  baseURL: DEFAULT_API_URL,
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
    if (err.message) return err.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
