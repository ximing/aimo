import * as bcrypt from 'bcrypt';
import { Service } from 'typedi';

import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import { CategoryService } from './category.service.js';

import { UserRepository } from '../repositories/user.repository.js';
import type { UserProfileDto, UpdateUserDto } from '@aimo/dto';
import type { NewUser } from '../models/db/user.schema.js';

// Default category name for new users
const DEFAULT_CATEGORY_NAME = '日记';

@Service()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private categoryService: CategoryService
  ) {}

  async createUser(userData: NewUser): Promise<UserProfileDto> {
    try {
      // Check if user with email already exists
      if (userData.email) {
        const existingUser = await this.userRepository.findByEmail(userData.email);
        if (existingUser) {
          throw new Error('User with this email already exists');
        }
      }

      // Hash password if provided
      let hashedPassword = userData.password;
      let salt = userData.salt;
      if (userData.password && !userData.salt) {
        const hashResult = await this.hashPassword(userData.password);
        hashedPassword = hashResult.hashedPassword;
        salt = hashResult.salt;
      }

      // Create new user via repository
      const user = await this.userRepository.create({
        uid: userData.uid || generateUid(),
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        salt: salt || '',
        nickname: userData.nickname,
        avatar: userData.avatar,
        status: userData.status ?? 1,
      });

      // Create default category for new user
      try {
        await this.categoryService.createCategory(user.uid, {
          name: DEFAULT_CATEGORY_NAME,
        });
      } catch (error) {
        // Log error but don't fail user creation if category creation fails
        logger.warn('Failed to create default category for user:', error);
      }

      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<ReturnType<typeof this.userRepository.findByEmailWithPassword> | null> {
    try {
      return await this.userRepository.findByEmailWithPassword(email);
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by UID
   */
  async findUserByUid(uid: string): Promise<UserProfileDto | null> {
    try {
      return await this.userRepository.findByUid(uid);
    } catch (error) {
      logger.error('Error finding user by UID:', error);
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
      logger.error('Error verifying password:', error);
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
      logger.error('Error hashing password:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(uid: string, updates: Partial<UpdateUserDto>): Promise<UserProfileDto | null> {
    try {
      // Build update data
      const updateData: UpdateUserDto = {};
      if (updates.nickname !== undefined) {
        updateData.nickname = updates.nickname;
      }
      if (updates.avatar !== undefined) {
        updateData.avatar = updates.avatar;
      }

      return await this.userRepository.update(uid, updateData);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<boolean> {
    try {
      return await this.userRepository.delete(uid);
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
      // Find user by UID with password
      const user = await this.userRepository.findByUidWithPassword(uid);
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // Verify old password
      const isPasswordValid = await this.verifyPassword(oldPassword, user.password);
      if (!isPasswordValid) {
        return { success: false, message: '当前密码错误' };
      }

      // Hash new password
      const { hashedPassword, salt } = await this.hashPassword(newPassword);

      // Update password
      await this.userRepository.updatePassword(uid, hashedPassword, salt);

      return { success: true, message: '密码修改成功' };
    } catch (error) {
      logger.error('Error changing password:', error);
      return { success: false, message: '密码修改失败' };
    }
  }
}
