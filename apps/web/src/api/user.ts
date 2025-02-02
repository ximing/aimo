import request from '@/utils/request';
import type { UserResponse } from './types';

interface UpdateProfileParams {
  name?: string;
  nickname?: string;
  password?: string;
}

export async function getProfile() {
  return (await request.get<UserResponse>('/users/profile')).data;
}

export async function updateProfile(formData: FormData) {
  return (
    await request.put<UserResponse>('/users/profile', formData, {
      headers: {
        // 移除默认的 Content-Type，让浏览器自动设置 multipart/form-data
        'Content-Type': undefined,
      },
    })
  ).data;
}

export async function getUserSettings() {
  return (
    await request.get<{
      emailNotifications: boolean;
    }>('/users/settings')
  ).data;
}

export async function updateUserSettings(data: {
  emailNotifications: boolean;
}) {
  return (await request.put('/users/settings', data)).data;
}
