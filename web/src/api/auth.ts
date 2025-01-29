import request from '@/utils/request'
import type { LoginResponse } from './types'

interface LoginParams {
  email: string
  password: string
}

export function login(params: LoginParams) {
  return request.post<any, LoginResponse>('/auth/login', params)
}

export function register(params: LoginParams & { name?: string }) {
  return request.post<any, LoginResponse>('/auth/register', params)
}

export function getProfile() {
  return request.get<any, LoginResponse>('/auth/profile')
} 