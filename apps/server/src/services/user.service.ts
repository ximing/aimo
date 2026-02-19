import { Service } from 'typedi';
import * as bcrypt from 'bcrypt';
import { LanceDbService } from '../sources/lancedb.js';
import { BackupService } from './backup.service.js';
import { CategoryService } from './category.service.js';
import type { User, NewUser } from '../models/db/user.schema.js';
import { generateUid } from '../utils/id.js';

// Type for LanceDB table records
type UserRecord = Record<string, any>;

// Default category name for new users
const DEFAULT_CATEGORY_NAME = '日记';

@Service()
export class UserService {
  constructor(
    private lanceDb: LanceDbService,
    private backupService: BackupService,
    private categoryService: CategoryService
  ) {}

  /**
   * Trigger backup for data changes
   */
  private async triggerBackup(reason: string): Promise<void> {
    try {
      await this.backupService.triggerBackup(reason);
    } catch (error) {
      console.warn('Failed to trigger backup:', error);
      // Don't throw - backup failure shouldn't interrupt normal operations
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: NewUser): Promise<User> {
    try {
      // Check if user with email already exists
      if (userData.email) {
        const existingUser = await this.findUserByEmail(userData.email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
      }

      // Create new user record
      const now = Date.now();
      const user: User = {
        uid: userData.uid || generateUid(),
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        salt: userData.salt,
        nickname: userData.nickname,
        avatar: userData.avatar,
        status: userData.status ?? 1,
        createdAt: userData.createdAt || now,
        updatedAt: userData.updatedAt || now,
      };

      const usersTable = await this.lanceDb.openTable('users');
      await usersTable.add([user as unknown as Record<string, unknown>]);

      // Trigger backup on user creation
      this.triggerBackup('user_created');

      // Create default category for new user
      try {
        await this.categoryService.createCategory(user.uid, {
          name: DEFAULT_CATEGORY_NAME,
        });
      } catch (error) {
        // Log error but don't fail user creation if category creation fails
        console.warn('Failed to create default category for user:', error);
      }

      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const usersTable = await this.lanceDb.openTable('users');

      const results = await usersTable.query().where(`email = '${email}'`).limit(1).toArray();

      return results.length > 0 ? (results[0] as User) : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by UID
   */
  async findUserByUid(uid: string): Promise<User | null> {
    try {
      const usersTable = await this.lanceDb.openTable('users');

      const results = await usersTable.query().where(`uid = '${uid}'`).limit(1).toArray();

      return results.length > 0 ? (results[0] as User) : null;
    } catch (error) {
      console.error('Error finding user by UID:', error);
      throw error;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<{ hashedPassword: string; salt: string }> {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      return { hashedPassword, salt };
    } catch (error) {
      console.error('Error hashing password:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(uid: string, updates: Partial<User>): Promise<User | null> {
    try {
      const usersTable = await this.lanceDb.openTable('users');

      // Find existing user
      const existingUsers = await usersTable.query().where(`uid = '${uid}'`).limit(1).toArray();

      if (existingUsers.length === 0) {
        throw new Error('User not found');
      }

      const existingUser = existingUsers[0] as User;
      const now = Date.now();
      const updatedUser: UserRecord = {
        ...existingUser,
        ...updates,
        uid: existingUser.uid, // Don't allow changing UID
        updatedAt: now,
      };

      const updateValues: Record<string, any> = { updatedAt: now };
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'uid') {
          return;
        }
        if (value !== undefined) {
          updateValues[key] = value;
        }
      });

      await usersTable.update({
        where: `uid = '${uid}'`,
        values: updateValues,
      });

      // Trigger backup on user update
      this.triggerBackup('user_updated');

      return updatedUser as User;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<boolean> {
    try {
      const usersTable = await this.lanceDb.openTable('users');

      // Check if user exists
      const existing = await usersTable.query().where(`uid = '${uid}'`).limit(1).toArray();

      if (existing.length === 0) {
        throw new Error('User not found');
      }

      // Mark as inactive instead of hard delete
      await usersTable.update({
        where: `uid = '${uid}'`,
        values: {
          status: 0,
          updatedAt: Date.now(),
        },
      });

      // Trigger backup on user deletion
      this.triggerBackup('user_deleted');

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}