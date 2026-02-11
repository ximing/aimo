/**
 * Authentication DTOs
 */

import type { UserInfoDto } from './user.js';

export interface RegisterDto {
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  token: string;
  user: UserInfoDto;
}
