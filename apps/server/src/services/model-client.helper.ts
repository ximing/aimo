import { ChatOpenAI } from '@langchain/openai';
import { eq } from 'drizzle-orm';

import { config } from '../config/config.js';
import { getDatabase } from '../db/connection.js';
import { userModels } from '../db/schema/index.js';
import { ErrorCode } from '../constants/error-codes.js';

// Type alias for database instance
type Database = ReturnType<typeof getDatabase>;

/**
 * Get a ChatOpenAI instance based on user model configuration.
 *
 * When userModelId is provided and not null:
 * - Queries user_models table to find the model configuration
 * - Verifies that the model belongs to the specified user
 * - Returns a ChatOpenAI instance with the user's custom API key, base URL, and model name
 *
 * When userModelId is null or undefined:
 * - Returns a ChatOpenAI instance with system default configuration
 *
 * @param db - The database instance (optional, will get from connection if not provided)
 * @param userId - The user's ID (required when userModelId is provided)
 * @param userModelId - Optional user model ID. If null/undefined, uses system defaults
 * @returns Promise<ChatOpenAI> - Configured ChatOpenAI instance
 * @throws Error - When userModelId is provided but model not found or doesn't belong to user
 */
export async function getModelClient(
  db: Database,
  userId: string,
  userModelId?: string | null
): Promise<ChatOpenAI> {
  // If userModelId is provided and not null, use user's custom model
  if (userModelId) {
    // Query the user_models table to find the model configuration
    const modelConfig = await db
      .select()
      .from(userModels)
      .where(eq(userModels.id, userModelId))
      .then((rows) => rows[0]);

    // Check if model exists
    if (!modelConfig) {
      const error = new Error('Model not found') as Error & { code?: number };
      error.code = ErrorCode.NOT_FOUND;
      throw error;
    }

    // Verify that the model belongs to the specified user
    if (modelConfig.userId !== userId) {
      const error = new Error('Model does not belong to user') as Error & { code?: number };
      error.code = ErrorCode.FORBIDDEN;
      throw error;
    }

    // Return ChatOpenAI with user's custom configuration
    return new ChatOpenAI({
      modelName: modelConfig.modelName,
      apiKey: modelConfig.apiKey,
      configuration: {
        baseURL: modelConfig.apiBaseUrl || config.openai.baseURL,
      },
      temperature: 0.3,
    });
  }

  // Fallback to system default configuration
  return new ChatOpenAI({
    modelName: config.openai.model || 'gpt-4o-mini',
    apiKey: config.openai.apiKey,
    configuration: {
      baseURL: config.openai.baseURL,
    },
    temperature: 0.3,
  });
}

/**
 * Get a ChatOpenAI instance using the default database connection.
 * Convenience wrapper when you don't need to pass a specific database instance.
 *
 * @param userId - The user's ID (required when userModelId is provided)
 * @param userModelId - Optional user model ID. If null/undefined, uses system defaults
 * @returns Promise<ChatOpenAI> - Configured ChatOpenAI instance
 */
export async function getDefaultModelClient(
  userId: string,
  userModelId?: string | null
): Promise<ChatOpenAI> {
  const db = getDatabase();
  return getModelClient(db, userId, userModelId);
}
