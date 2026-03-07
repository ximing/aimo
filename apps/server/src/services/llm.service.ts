import { Service } from 'typedi';

import { UserModelService } from './user-model.service.js';
import { logger } from '../utils/logger.js';

import type { UserModel } from '../db/schema/user-models.js';
import type { LLMProvider } from '@x-console/dto';

/**
 * Message format for LLM chat
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Response from LLM chat
 */
export interface ChatResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Options for LLM chat
 */
export interface ChatOptions {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

/**
 * Error from LLM service
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

@Service()
export class LLMService {
  constructor(private userModelService: UserModelService) {}

  /**
   * Get API configuration for a provider
   */
  private getApiConfig(
    provider: LLMProvider,
    model: UserModel
  ): { baseUrl: string; apiKey: string } {
    const modelName = model.modelName;

    // Determine base URL based on provider
    let baseUrl: string;
    switch (provider) {
      case 'openai':
        baseUrl = model.apiBaseUrl || 'https://api.openai.com/v1';
        break;
      case 'deepseek':
        baseUrl = model.apiBaseUrl || 'https://api.deepseek.com/v1';
        break;
      case 'openrouter':
        baseUrl = model.apiBaseUrl || 'https://openrouter.ai/api/v1';
        break;
      case 'other':
        if (!model.apiBaseUrl) {
          throw new LLMError('API Base URL is required for custom providers', 'other');
        }
        baseUrl = model.apiBaseUrl;
        break;
      default:
        throw new LLMError(`Unknown provider: ${provider}`, provider as string);
    }

    return {
      baseUrl,
      apiKey: model.apiKey,
    };
  }

  /**
   * Call LLM with user configured model
   */
  async chat(userId: string, options: ChatOptions): Promise<ChatResponse> {
    // Find the default model for the user
    const defaultModel = await this.userModelService.getDefaultModel(userId);

    if (!defaultModel) {
      throw new LLMError('No default model configured', 'unknown');
    }

    return this.chatWithModel(userId, defaultModel.id, options);
  }

  /**
   * Call LLM with a specific model ID
   */
  async chatWithModel(
    userId: string,
    modelId: string,
    options: ChatOptions
  ): Promise<ChatResponse> {
    // Get the model configuration
    const model = await this.userModelService.getModel(modelId, userId);

    if (!model) {
      throw new LLMError('Model not found', 'unknown', 404);
    }

    const { baseUrl, apiKey } = this.getApiConfig(model.provider as LLMProvider, model);
    const modelName = options.model || model.modelName;

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          top_p: options.top_p,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const isRetryable = response.status >= 500 || response.status === 429;

        throw new LLMError(
          `API error: ${response.status} - ${errorBody}`,
          model.provider as string,
          response.status,
          isRetryable
        );
      }

      const data = (await response.json()) as ChatResponse;
      return data;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }

      logger.error('LLM request error:', error);
      throw new LLMError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model.provider as string,
        undefined,
        true
      );
    }
  }

  /**
   * List available models for a user (from their configuration)
   */
  async listModels(userId: string) {
    const models = await this.userModelService.getModels(userId);

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      modelName: model.modelName,
      isDefault: model.isDefault,
    }));
  }

  /**
   * Get model configuration by ID
   */
  async getModel(userId: string, modelId: string) {
    const model = await this.userModelService.getModel(modelId, userId);

    if (!model) {
      return null;
    }

    return {
      id: model.id,
      name: model.name,
      provider: model.provider,
      apiBaseUrl: model.apiBaseUrl,
      modelName: model.modelName,
      isDefault: model.isDefault,
    };
  }
}
