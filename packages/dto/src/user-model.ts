/**
 * DTOs for user model configuration (LLM settings)
 */

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'deepseek' | 'openrouter' | 'other';

/**
 * DTO for creating a user model
 */
export interface CreateUserModelDto {
  name: string;
  provider: LLMProvider;
  apiBaseUrl?: string;
  apiKey: string;
  modelName: string;
  isDefault?: boolean;
}

/**
 * DTO for updating a user model
 */
export interface UpdateUserModelDto {
  name?: string;
  provider?: LLMProvider;
  apiBaseUrl?: string | null;
  apiKey?: string;
  modelName?: string;
  isDefault?: boolean;
}

/**
 * DTO for user model response
 */
export interface UserModelDto {
  id: string;
  userId: string;
  name: string;
  provider: LLMProvider;
  apiBaseUrl?: string;
  apiKey?: string;
  modelName: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for user model list response
 */
export interface UserModelListDto {
  models: UserModelDto[];
}
