/**
 * User data model for LanceDB
 * LanceDB stores all user data with automatic schema inference
 */

export interface User {
  id?: number;
  uid: string; // Unique user ID (nanoid)
  email?: string;
  phone?: string;
  password: string; // Hashed password
  salt: string; // Password salt
  nickname?: string;
  avatar?: string;
  status: number; // 1: active, 0: inactive
  createdAt: Date;
  updatedAt: Date;
}

export type NewUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};
