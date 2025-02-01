import request from '@/utils/request';
import type { UserListItem, SystemStats, UpdateUserInput } from './types';

export async function getUsers(params?: { limit?: number; offset?: number }) {
  return (await request.get<UserListItem[]>('/admin/users', { params })).data;
}

export async function updateUser(id: number, data: UpdateUserInput) {
  return (await request.put<UserListItem>(`/admin/users/${id}`, data)).data;
}

export async function deleteUser(id: number) {
  return (await request.delete<void>(`/admin/users/${id}`)).data;
}

export async function getSystemStats() {
  return (await request.get<SystemStats>('/admin/stats')).data;
}
