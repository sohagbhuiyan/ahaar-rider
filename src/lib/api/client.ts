import { create, isAxiosError, type AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

import type { DispatchReason } from './types';

/** SecureStore key of the Sanctum token. The background location task reads it too. */
export const TOKEN_KEY = 'ahaar_rider_jwt_token';

// Point at the hosted API by default so the app works on a real phone in
// Expo Go. `localhost` / `10.0.2.2` only resolve on a simulator/emulator, so a
// physical device got "Network Error" before the request ever left the phone.
// Override with EXPO_PUBLIC_API_URL in .env.local (restart Metro after).
const HOSTED_API_URL = 'https://api.ahaar.store/api/v1';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || HOSTED_API_URL).replace(/\/+$/, '');

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Don't sign out on a 401 from this request (sign-out's own best-effort calls). */
    skipAuthRedirect?: boolean;
  }
}

export const apiClient = create({
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

// A 401 on an authenticated request means the session is gone (expired,
// revoked, or signed out elsewhere). One handler, registered by the session
// module, wipes everything and returns to the gateway. Registered rather than
// imported to avoid a client → session → client import cycle.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const config = error.config;
    const sentToken = Boolean(config?.headers?.Authorization);
    const isAuthCall = /\/rider\/auth\/(login|register)$/.test(config?.url ?? '');
    if (
      error.response?.status === 401 &&
      sentToken &&
      !isAuthCall &&
      !config?.skipAuthRedirect
    ) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

/** FormData must reach the native networking layer untouched: axios JSON-encodes it on RN otherwise. */
export const multipartConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
  transformRequest: (body: unknown) => body,
  timeout: 60_000,
};

export async function storeAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // already gone
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

type ApiErrorBody = {
  message?: string;
  reason?: DispatchReason;
  errors?: Record<string, string[]>;
  data?: Record<string, unknown>;
};

/** The dispatch `reason` of a failed request (`already_taken`, `wrong_run`, ...), if any. */
export function errorReason(error: unknown): DispatchReason | null {
  if (isAxiosError(error)) {
    return (error.response?.data as ApiErrorBody | undefined)?.reason ?? null;
  }
  return null;
}

export function errorStatus(error: unknown): number | null {
  return isAxiosError(error) ? (error.response?.status ?? null) : null;
}

/** The `data` block an error response carried (e.g. wrong_package's `belonging_stop`, wrong_run's route hint). */
export function errorData<T = Record<string, unknown>>(error: unknown): T | null {
  if (isAxiosError(error)) {
    return ((error.response?.data as ApiErrorBody | undefined)?.data as T) ?? null;
  }
  return null;
}

/** A request that never got an HTTP response (offline, DNS, timeout). */
export function isNetworkError(error: unknown): boolean {
  return isAxiosError(error) && !error.response;
}

export function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const err = error as AxiosError<ApiErrorBody>;
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
