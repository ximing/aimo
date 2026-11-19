import type {
  RegisterDto,
  LoginDto,
  LoginResponseDto,
  UserInfoDto,
  ApiResponseDto,
} from '@aimo/dto';
import request from '../utils/request';

/**
 * Register a new user
 */
export const register = (data: RegisterDto) => {
  return request.post<RegisterDto, ApiResponseDto<{ user: UserInfoDto }>>(
    '/api/v1/auth/register',
    data
  );
};

/**
 * Login with email and password
 */
export const login = (data: LoginDto) => {
  return request.post<LoginDto, ApiResponseDto<LoginResponseDto>>('/api/v1/auth/login', data);
};

/**
 * Clear the httpOnly session cookie. Does not call Keycloak.
 */
export const logout = () => {
  return request.post<unknown, ApiResponseDto<{ ok: boolean }>>('/api/v1/auth/logout');
};
