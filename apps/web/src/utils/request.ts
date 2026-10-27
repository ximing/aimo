import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { navigate } from './navigation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';

/**
 * Public pages that can be visited without authentication.
 * 401 responses on these pages should NOT trigger a redirect to /auth.
 */
const PUBLIC_PAGE_PATTERNS: Array<string | RegExp> = ['/', /^\/share\//];

function getCurrentRoutePath(): string {
  return window.location.pathname;
}

/**
 * Check if the current page is public (no login required)
 */
function isPublicPage(): boolean {
  const path = getCurrentRoutePath();
  return PUBLIC_PAGE_PATTERNS.some((pattern) =>
    typeof pattern === 'string' ? pattern === path : pattern.test(path)
  );
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
 * Request interceptor. Serialize Date objects to timestamps.
 * The session cookie is sent with the request.
 */
request.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
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
          // Unauthorized - clear auth data
          localStorage.removeItem('aimo_user');

          // Redirect to login, unless we're on a public page (landing, share)
          const isAuthPage = window.location.pathname.includes('/auth');
          if (!isAuthPage && !isPublicPage()) {
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
