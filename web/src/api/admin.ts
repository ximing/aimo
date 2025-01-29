import request from '@/utils/request'
import type { UserListItem, SystemStats, UpdateUserInput } from './types'

export function getUsers(params?: { limit?: number; offset?: number }) {
  return request.get<any, UserListItem[]>('/admin/users', { params })
}

export function updateUser(id: number, data: UpdateUserInput) {
  return request.put<any, UserListItem>(`/admin/users/${id}`, data)
}

export function deleteUser(id: number) {
  return request.delete<any, void>(`/admin/users/${id}`)
}

export function getSystemStats() {
  return request.get<any, SystemStats>('/admin/stats')
}