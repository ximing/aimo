import type { RegisterDto, LoginDto, LoginResponseDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Register a new user
 */
export const register = (data: RegisterDto) => {
  return request.post<any, { code: number; data: { user: any } }>('/api/v1/auth/register', data);
};

/**
 * Login with email and password
 */
export const login = (data: LoginDto) => {
  return request.post<any, { code: number; data: LoginResponseDto }>('/api/v1/auth/login', data);
};
