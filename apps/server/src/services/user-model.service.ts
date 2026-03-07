import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { userModels } from  '../db/schema/user-models.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type { UserModel, NewUserModel } from '../db/schema/user-models.js';
import type { CreateUserModelDto, UpdateUserModelDto } from '@aimo/dto';

@Service()
export class UserModelService {
  /**
   * Get all models for a user
   */
  async getModels(userId: string): Promise<UserModel[]> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(userModels)
        .where(eq(userModels.userId, userId))
        .orderBy(userModels.createdAt);

      return results;
    } catch (error) {
      logger.error('Error getting user models:', error);
      throw error;
    }
  }

  /**
   * Get a single model by ID
   */
  async getModel(id: string, userId: string): Promise<UserModel | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(userModels)
        .where(and(eq(userModels.id, id), eq(userModels.userId, userId)))
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error getting user model:', error);
      throw error;
    }
  }

  /**
   * Get the default model for a user
   */
  async getDefaultModel(userId: string): Promise<UserModel | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(userModels)
        .where(and(eq(userModels.userId, userId), eq(userModels.isDefault, true)))
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Error getting default user model:', error);
      throw error;
    }
  }

  /**
   * Create a new model for a user
   */
  async createModel(userId: string, data: CreateUserModelDto): Promise<UserModel> {
    try {
      const db = getDatabase();

      // If this is set as default, unset other defaults first
      if (data.isDefault) {
        await db.update(userModels).set({ isDefault: false }).where(eq(userModels.userId, userId));
      }

      const id = generateUid();
      const newModel: NewUserModel = {
        id,
        userId,
        name: data.name,
        provider: data.provider,
        apiBaseUrl: data.apiBaseUrl || null,
        apiKey: data.apiKey,
        modelName: data.modelName,
        isDefault: data.isDefault || false,
      };

      await db.insert(userModels).values(newModel);

      // Fetch the created model
      const [created] = await db.select().from(userModels).where(eq(userModels.id, id));

      return created;
    } catch (error) {
      logger.error('Error creating user model:', error);
      throw error;
    }
  }

  /**
   * Update a model
   */
  async updateModel(
    id: string,
    userId: string,
    data: UpdateUserModelDto
  ): Promise<UserModel | null> {
    try {
      const db = getDatabase();

      // Check if model exists
      const existing = await this.getModel(id, userId);
      if (!existing) {
        return null;
      }

      // If setting as default, unset other defaults first
      if (data.isDefault === true && !existing.isDefault) {
        await db
          .update(userModels)
          .set({ isDefault: false })
          .where(and(eq(userModels.userId, userId), eq(userModels.isDefault, true)));
      }

      // Build update object with only provided fields
      const updateFields: Partial<NewUserModel> = {};

      if (data.name !== undefined) {
        updateFields.name = data.name;
      }
      if (data.provider !== undefined) {
        updateFields.provider = data.provider;
      }
      if (data.apiBaseUrl !== undefined) {
        updateFields.apiBaseUrl = data.apiBaseUrl;
      }
      if (data.apiKey !== undefined) {
        updateFields.apiKey = data.apiKey;
      }
      if (data.modelName !== undefined) {
        updateFields.modelName = data.modelName;
      }
      if (data.isDefault !== undefined) {
        updateFields.isDefault = data.isDefault;
      }

      if (Object.keys(updateFields).length === 0) {
        return existing;
      }

      await db.update(userModels).set(updateFields).where(eq(userModels.id, id));

      // Fetch the updated model
      const [updated] = await db.select().from(userModels).where(eq(userModels.id, id));

      return updated;
    } catch (error) {
      logger.error('Error updating user model:', error);
      throw error;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(id: string, userId: string): Promise<boolean> {
    try {
      const db = getDatabase();

      // Check if model exists
      const existing = await this.getModel(id, userId);
      if (!existing) {
        return false;
      }

      await db.delete(userModels).where(eq(userModels.id, id));

      // If deleted model was default, set another one as default
      if (existing.isDefault) {
        const remaining = await this.getModels(userId);
        if (remaining.length > 0) {
          await db
            .update(userModels)
            .set({ isDefault: true })
            .where(eq(userModels.id, remaining[0].id));
        }
      }

      return true;
    } catch (error) {
      logger.error('Error deleting user model:', error);
      throw error;
    }
  }

  /**
   * Set a model as default
   */
  async setDefaultModel(id: string, userId: string): Promise<UserModel | null> {
    try {
      const db = getDatabase();

      // Check if model exists
      const existing = await this.getModel(id, userId);
      if (!existing) {
        return null;
      }

      // Unset all other defaults
      await db
        .update(userModels)
        .set({ isDefault: false })
        .where(and(eq(userModels.userId, userId), eq(userModels.isDefault, true)));

      // Set this model as default
      await db.update(userModels).set({ isDefault: true }).where(eq(userModels.id, id));

      // Fetch the updated model
      const [updated] = await db.select().from(userModels).where(eq(userModels.id, id));

      return updated;
    } catch (error) {
      logger.error('Error setting default user model:', error);
      throw error;
    }
  }
}
