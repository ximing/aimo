import { Service } from 'typedi';
import * as bcrypt from 'bcrypt';
import { LanceDbService } from '../sources/lancedb.js';
import { BackupService } from './backup.service.js';
import type { User, NewUser } from '../models/db/user.schema.js';
import { generateUid } from '../utils/id.js';

// Type for LanceDB table records
type UserRecord = Record<string, any>;

@Service()
export class UserService {
  constructor(
    private lanceDb: LanceDbService,
    private backupService: BackupService
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
      const updatedUser: UserRecord = {
        ...existingUser,
        ...updates,
        uid: existingUser.uid, // Don't allow changing UID
        updatedAt: Date.now(),
      };

      // Use update with SQL where clause
      const updateData: Record<string, string> = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          updateData[key] = String(value);
        }
      });

      await usersTable.update(updateData, { where: `uid = '${uid}'` });

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
      const updateData: Record<string, string> = { status: '0' };
      await usersTable.update(updateData, { where: `uid = '${uid}'` });

      // Trigger backup on user deletion
      this.triggerBackup('user_deleted');

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}
