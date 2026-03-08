import { Service } from 'typedi';
import { eq, and } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { userFeatureConfigs } from '../db/schema/user-feature-configs.js';
import { generateUid } from '../utils/id.js';
import { logger } from '../utils/logger.js';

import type { UserFeatureConfig, NewUserFeatureConfig } from '../db/schema/user-feature-configs.js';

const TAG_GENERATION_FEATURE = 'tag_generation';

@Service()
export class UserFeatureConfigService {
  /**
   * Get the tag generation model ID for a user
   * @param userId - The user's ID
   * @returns The user's configured model ID, or null if not configured
   */
  async getTagModelId(userId: string): Promise<string | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(userFeatureConfigs)
        .where(
          and(
            eq(userFeatureConfigs.userId, userId),
            eq(userFeatureConfigs.feature, TAG_GENERATION_FEATURE)
          )
        )
        .limit(1);

      return results.length > 0 ? results[0].userModelId : null;
    } catch (error) {
      logger.error('Error getting tag model ID:', error);
      throw error;
    }
  }

  /**
   * Set the tag generation model ID for a user (upsert)
   * @param userId - The user's ID
   * @param userModelId - The model ID to set, or null to use system default
   */
  async setTagModelId(userId: string, userModelId: string | null): Promise<void> {
    try {
      const db = getDatabase();

      // Check if config already exists
      const existing = await db
        .select()
        .from(userFeatureConfigs)
        .where(
          and(
            eq(userFeatureConfigs.userId, userId),
            eq(userFeatureConfigs.feature, TAG_GENERATION_FEATURE)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(userFeatureConfigs)
          .set({ userModelId, updatedAt: new Date() })
          .where(eq(userFeatureConfigs.id, existing[0].id));
      } else {
        // Insert new record
        const id = generateUid();
        const newConfig: NewUserFeatureConfig = {
          id,
          userId,
          feature: TAG_GENERATION_FEATURE,
          userModelId,
        };

        await db.insert(userFeatureConfigs).values(newConfig);
      }
    } catch (error) {
      logger.error('Error setting tag model ID:', error);
      throw error;
    }
  }

  /**
   * Get feature config for any feature (not just tag generation)
   * @param userId - The user's ID
   * @param feature - The feature name
   * @returns The user's configured model ID, or null if not configured
   */
  async getFeatureModelId(userId: string, feature: string): Promise<string | null> {
    try {
      const db = getDatabase();
      const results = await db
        .select()
        .from(userFeatureConfigs)
        .where(and(eq(userFeatureConfigs.userId, userId), eq(userFeatureConfigs.feature, feature)))
        .limit(1);

      return results.length > 0 ? results[0].userModelId : null;
    } catch (error) {
      logger.error('Error getting feature model ID:', error);
      throw error;
    }
  }

  /**
   * Set feature config for any feature (upsert)
   * @param userId - The user's ID
   * @param feature - The feature name
   * @param userModelId - The model ID to set, or null to use system default
   */
  async setFeatureModelId(
    userId: string,
    feature: string,
    userModelId: string | null
  ): Promise<void> {
    try {
      const db = getDatabase();

      // Check if config already exists
      const existing = await db
        .select()
        .from(userFeatureConfigs)
        .where(and(eq(userFeatureConfigs.userId, userId), eq(userFeatureConfigs.feature, feature)))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db
          .update(userFeatureConfigs)
          .set({ userModelId, updatedAt: new Date() })
          .where(eq(userFeatureConfigs.id, existing[0].id));
      } else {
        // Insert new record
        const id = generateUid();
        const newConfig: NewUserFeatureConfig = {
          id,
          userId,
          feature,
          userModelId,
        };

        await db.insert(userFeatureConfigs).values(newConfig);
      }
    } catch (error) {
      logger.error('Error setting feature model ID:', error);
      throw error;
    }
  }
}
