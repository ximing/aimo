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

/**
 * Upload avatar
 */
export const uploadAvatar = (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);

  return request.post<unknown, { code: number; data: { message: string; avatar: string } }>(
    '/api/v1/user/avatar',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
};
