/**
 * User data model for LanceDB
 * LanceDB stores all user data with automatic schema inference
 */

export interface User {
  uid: string; // Unique user ID (generateTypeId)
  email?: string;
  phone?: string;
  password: string; // Hashed password
  salt: string; // Password salt
  nickname?: string;
  avatar?: string;
  status: number; // 1: active, 0: inactive
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

export type NewUser = Omit<User, 'createdAt' | 'updatedAt'> & {
  createdAt?: number;
  updatedAt?: number;
};
