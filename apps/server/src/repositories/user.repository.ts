/**
 * User Repository
 * Handles Drizzle database operations for users
 */

import { Service } from 'typedi';

import { DrizzleAdapter, getUsersTable } from '../sources/database/index.js';
import type { UsersSelect, UsersInsert } from '../sources/database/schema/users.js';

import type { UserInfoDto, UpdateUserDto, UserProfileDto } from '@aimo/dto';

export interface CreateUserData {
  uid: string;
  email?: string;
  phone?: string;
  password: string;
  salt: string;
  nickname?: string;
  avatar?: string;
  status?: number;
}

@Service()
export class UserRepository {
  constructor(private drizzleAdapter: DrizzleAdapter) {}

  /**
   * Get the database client and table
   */
  private getTable() {
    const db = this.drizzleAdapter.getDb() as any;
    const dbType = this.drizzleAdapter.getDbType();
    return getUsersTable(dbType);
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<UserProfileDto> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();
    const now = Date.now();

    const insertData: Omit<UsersInsert, 'id'> = {
      uid: data.uid,
      email: data.email || null,
      phone: data.phone || null,
      password: data.password,
      salt: data.salt,
      nickname: data.nickname || null,
      avatar: data.avatar || null,
      status: data.status ?? 1,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };

    await db.insert(table).values(insertData);

    return this.mapToProfileDto(insertData as UsersSelect);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserProfileDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(eq(table.email, email))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.mapToProfileDto(results[0]);
  }

  /**
   * Find user by UID
   */
  async findByUid(uid: string): Promise<UserProfileDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');

    const results = await db
      .select()
      .from(table)
      .where(eq(table.uid, uid))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return this.mapToProfileDto(results[0]);
  }

  /**
   * Update user
   */
  async update(uid: string, data: UpdateUserDto): Promise<UserProfileDto | null> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');

    // Build update data
    const updateData: Partial<UsersSelect> = {
      updatedAt: new Date(),
    };

    if (data.nickname !== undefined) {
      updateData.nickname = data.nickname;
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }

    await db.update(table).set(updateData).where(eq(table.uid, uid));

    return this.findByUid(uid);
  }

  /**
   * Delete user (soft delete - sets status to 0)
   */
  async delete(uid: string): Promise<boolean> {
    const db = this.drizzleAdapter.getDb() as any;
    const table = this.getTable();

    const { eq } = await import('drizzle-orm');

    await db
      .update(table)
      .set({ status: 0, updatedAt: new Date() })
      .where(eq(table.uid, uid));

    return true;
  }

  /**
   * Map database row to UserProfileDto
   */
  private mapToProfileDto(row: UsersSelect): UserProfileDto {
    return {
      uid: row.uid,
      email: row.email || undefined,
      nickname: row.nickname || undefined,
      avatar: row.avatar || undefined,
      phone: row.phone || undefined,
      status: row.status,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
    };
  }
}
