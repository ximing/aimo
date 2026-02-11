import type { UserInfoDto, UpdateUserDto } from '@aimo/dto';
import request from '../utils/request';

/**
 * Get current user info
 */
export const getUserInfo = () => {
  return request.get<unknown, { code: number; data: UserInfoDto }>('/api/v1/user/info');
};

/**
 * Update user info
 */
export const updateUserInfo = (data: UpdateUserDto) => {
  return request.put<unknown, { code: number; data: { message: string; user: UserInfoDto } }>(
    '/api/v1/user/info',
    data
  );
};
