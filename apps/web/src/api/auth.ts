import request from '@/utils/request';
import type { LoginResponse } from './types';

interface LoginParams {
  email: string;
  password: string;
}

export async function login(params: LoginParams) {
  return (await request.post<LoginResponse>('/auth/login', params)).data;
}

export async function register(params: LoginParams & { name?: string }) {
  return (await request.post<LoginResponse>('/auth/register', params)).data;
}

export async function getProfile() {
  return (await request.get<LoginResponse>('/auth/profile')).data;
}
