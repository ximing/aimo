/**
 * User DTOs
 */

export interface UserInfoDto {
  uid: string;
  email?: string;
  nickname?: string;
}

export interface UpdateUserDto {
  nickname?: string;
  avatar?: string;
}

export interface UserProfileDto extends UserInfoDto {
  avatar?: string;
  phone?: string;
  status: number;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}
