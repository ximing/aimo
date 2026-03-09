import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { navigate } from './navigation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';

// Cached token for Electron environment (loaded once after login)
let cachedElectronToken: string | null = null;

// Promise that resolves when the token has been loaded from secure storage
let tokenReadyResolve: (() => void) | null = null;
let tokenReadyPromise: Promise<void> = new Promise((resolve) => {
  tokenReadyResolve = resolve;
});

/**
 * Check if running in Electron environment
 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/**
 * Set cached token (called after login or on startup token restore)
 */
export function setElectronToken(token: string | null): void {
  cachedElectronToken = token;
  // Mark token as ready so queued requests can proceed
  if (tokenReadyResolve) {
    tokenReadyResolve();
    tokenReadyResolve = null;
  }
}

/**
 * Signal that token loading is complete with no token (not logged in).
 * Allows queued requests to proceed and return 401 naturally.
 */
export function resolveTokenReady(): void {
  if (tokenReadyResolve) {
    tokenReadyResolve();
    tokenReadyResolve = null;
  }
}

/**
 * Clear cached token (called on logout)
 */
export function clearElectronToken(): void {
  cachedElectronToken = null;
  // Reset the ready gate so the next login will re-arm it
  tokenReadyPromise = new Promise((resolve) => {
    tokenReadyResolve = resolve;
  });
}

/**
 * Get stored token for Electron environment (from cache)
 */
function getElectronToken(): string | null {
  return cachedElectronToken;
}

/**
 * Create axios instance with default config
 */
const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Important: Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor
 * In Electron: wait for token to be loaded from secure storage before sending.
 * Serialize Date objects to timestamps.
 */
request.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isElectron()) {
      // Block until the token has been loaded (or determined to be absent)
      await tokenReadyPromise;

      const token = getElectronToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Serialize Date objects in query parameters to timestamps
    if (config.params) {
      Object.keys(config.params).forEach((key) => {
        if (config.params[key] instanceof Date) {
          config.params[key] = config.params[key].getTime();
        }
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handle common error responses
 */
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return the data directly if the response is successful
    return response.data;
  },
  (error: AxiosError<{ code: number; msg?: string; message?: string }>) => {
    // Handle error responses
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401: {
          // Unauthorized - clear auth data and redirect to login
          localStorage.removeItem('aimo_user');

          // Only redirect if not already on auth page (check both pathname and hash for compatibility)
          const isAuthPage =
            window.location.pathname.includes('/auth') || window.location.hash.includes('/auth');
          if (!isAuthPage) {
            navigate('/auth', { replace: true });
          }
          break;
        }

        case 403:
          console.error('Forbidden:', data?.msg || data?.message || 'Access denied');
          break;

        case 404:
          console.error('Not found:', data?.msg || data?.message || 'Resource not found');
          break;

        case 500:
          console.error('Server error:', data?.msg || data?.message || 'Internal server error');
          break;

        default:
          console.error('Request failed:', data?.msg || data?.message || 'Unknown error');
      }

      // Return both msg and message for downstream error handling
      const errorData = {
        code: data?.code,
        msg: data?.msg || data?.message,
        message: data?.msg || data?.message,
      };
      return Promise.reject(errorData || error);
    } else if (error.request) {
      // Request made but no response
      console.error('Network error: No response from server');
      return Promise.reject({
        code: -1,
        message: 'Network error: Unable to connect to server',
      });
    } else {
      // Something else happened
      console.error('Request error:', error.message);
      return Promise.reject({
        code: -1,
        message: error.message || 'Unknown error occurred',
      });
    }
  }
);

export default request;
