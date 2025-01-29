import request from '@/utils/request'
import type { User, UpdateProfileInput, UserSettings } from './types'

export function updateProfile(data: UpdateProfileInput) {
  return request.put<any, User>('/users/profile', data)
}

export function getProfile() {
  return request.get<any, User>('/users/profile')
}

export function getUserSettings() {
  return request.get<any, UserSettings>('/users/settings')
}

export function updateUserSettings(data: Partial<UserSettings>) {
  return request.put<any, UserSettings>('/users/settings', data)
} 