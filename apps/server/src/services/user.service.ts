import { Service } from 'typedi';
import { eq, and, sql } from 'drizzle-orm';

import {
  hashPassword as hashPasswordValue,
  verifyPassword as verifyPasswordValue,
} from '../auth/password.js';
import { normalizeEmail } from '../auth/oidc-logic.js';
import { getDatabase } from '../db/connection.js';
import { categories } from '../db/schema/categories.js';
import { users } from '../db/schema/users.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { CategoryService } from './category.service.js';

import type { User, NewUser } from '../db/schema/users.js';

// Default category name for new users
const DEFAULT_CATEGORY_NAME = '日记';

@Service()
export class UserService {
  constructor(private categoryService: CategoryService) {}

  async createUser(userData: NewUser): Promise<User> {
    try {
      const db = getDatabase();

      // Check if user with email already exists
      if (userData.email) {
        const existingUser = await this.findUserByEmail(userData.email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
      }

      // Create new user record
      const uid = userData.uid || generateUid();
      const newUser: NewUser = {
        uid,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        salt: userData.salt,
        nickname: userData.nickname,
        avatar: userData.avatar,
        status: userData.status ?? 1,
      };

      // Insert user into MySQL
      await db.insert(users).values(newUser);

      // Fetch the created user to get auto-generated timestamps
      const [createdUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.uid, uid), eq(users.deletedAt, 0)));

      // Create default category for new user
      try {
        await this.categoryService.createCategory(uid, {
          name: DEFAULT_CATEGORY_NAME,
        });
      } catch (error) {
        // Log error but don't fail user creation if category creation fails
        logger.warn('Failed to create default category for user:', error);
      }

      return createdUser;
    } catch (error) {
      logger.error('Error creating user');
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const normalized = normalizeEmail(email);
      if (!normalized) return null;
      const db = getDatabase();
      const results = await db
        .select()
        .from(users)
        .where(and(sql`lower(${users.email}) = ${normalized}`, eq(users.deletedAt, 0)))
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by UID
   */
  async findUserByUid(uid: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(users)
        .where(and(eq(users.uid, uid), eq(users.deletedAt, 0)))
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error finding user by UID:', error);
      throw error;
    }
  }

  /**
   * Find user by phone
   */
  async findUserByPhone(phone: string): Promise<User | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(users)
        .where(and(eq(users.phone, phone), eq(users.deletedAt, 0)))
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error finding user by phone:', error);
      throw error;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(plainPassword: string, hashedPassword: string | null): Promise<boolean> {
    return verifyPasswordValue(plainPassword, hashedPassword);
  }

  /**
   * Hash a new password as argon2id. The salt lives inside the PHC string.
   */
  async hashPassword(password: string): Promise<{ hashedPassword: string; salt: null }> {
    try {
      const hashedPassword = await hashPasswordValue(password);
      return { hashedPassword, salt: null };
    } catch (error) {
      logger.error('Error hashing password');
      throw error;
    }
  }

  /**
   * Remove a user created in this request when Keycloak or the identity row failed.
   */
  async deleteCreatedUser(uid: string): Promise<void> {
    const db = getDatabase();
    await db.delete(categories).where(eq(categories.uid, uid));
    await db.delete(users).where(eq(users.uid, uid));
  }

  /**
   * Update user information
   */
  async updateUser(uid: string, updates: Partial<User>): Promise<User | null> {
    try {
      const db = getDatabase();

      // Check if user exists
      const existingUser = await this.findUserByUid(uid);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Remove uid from updates to prevent changing primary key
      const { uid: _, ...updateValues } = updates;

      // Update user in MySQL (only if not soft-deleted)
      await db
        .update(users)
        .set(updateValues)
        .where(and(eq(users.uid, uid), eq(users.deletedAt, 0)));

      // Fetch updated user
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.uid, uid), eq(users.deletedAt, 0)));

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user');
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(uid: string): Promise<boolean> {
    try {
      const db = getDatabase();

      // Check if user exists
      const existingUser = await this.findUserByUid(uid);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Soft delete user by setting deletedAt timestamp (only if not already soft-deleted)
      await db
        .update(users)
        .set({ deletedAt: Date.now() })
        .where(and(eq(users.uid, uid), eq(users.deletedAt, 0)));

      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    uid: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by UID
      const user = await this.findUserByUid(uid);
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      if (!user.password) {
        return { success: false, message: '此账号没有本地密码' };
      }

      // Verify old password
      const isPasswordValid = await this.verifyPassword(oldPassword, user.password);
      if (!isPasswordValid) {
        return { success: false, message: '当前密码错误' };
      }

      // Hash new password
      const { hashedPassword, salt } = await this.hashPassword(newPassword);

      // Update password
      await this.updateUser(uid, {
        password: hashedPassword,
        salt: salt,
      });

      return { success: true, message: '密码修改成功' };
    } catch {
      logger.error('Error changing password');
      return { success: false, message: '密码修改失败' };
    }
  }
}
