import type { RegisterDto, LoginDto, LoginResponseDto, UserInfoDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Register a new user
 */
export const register = (data: RegisterDto) => {
  return request.post<RegisterDto, { code: number; data: { user: UserInfoDto } }>('/api/v1/auth/register', data);
};

/**
 * Login with email and password
 */
export const login = (data: LoginDto) => {
  return request.post<LoginDto, { code: number; data: LoginResponseDto }>('/api/v1/auth/login', data);
};
