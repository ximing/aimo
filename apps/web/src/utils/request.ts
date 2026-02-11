import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';

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
 * Add token to headers if available
 */
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('aimo_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (error: AxiosError<{ code: number; message: string }>) => {
    // Handle error responses
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear auth data and redirect to login
          localStorage.removeItem('aimo_token');
          localStorage.removeItem('aimo_user');

          // Only redirect if not already on auth page
          if (!window.location.pathname.includes('/auth')) {
            window.location.href = '/auth';
          }
          break;

        case 403:
          console.error('Forbidden:', data?.message || 'Access denied');
          break;

        case 404:
          console.error('Not found:', data?.message || 'Resource not found');
          break;

        case 500:
          console.error('Server error:', data?.message || 'Internal server error');
          break;

        default:
          console.error('Request failed:', data?.message || 'Unknown error');
      }

      return Promise.reject(data || error);
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
