import request from '@/utils/request';
import type { User, UpdateProfileInput, UserSettings } from './types';

export async function updateProfile(data: UpdateProfileInput) {
  return (await request.put<User>('/users/profile', data)).data;
}

export async function getProfile() {
  return (await request.get<User>('/users/profile')).data;
}

export async function getUserSettings() {
  return (await request.get<UserSettings>('/users/settings')).data;
}

export async function updateUserSettings(data: Partial<UserSettings>) {
  return (await request.put<UserSettings>('/users/settings', data)).data;
}
