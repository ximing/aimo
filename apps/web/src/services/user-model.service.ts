import { Service } from '@rabjs/react';
import { userModelApi } from '../api/user-model';
import type { UserModelDto, CreateUserModelDto, UpdateUserModelDto } from '@aimo/dto';

/**
 * User Model Service
 * Manages LLM model configuration state and operations
 */
export class UserModelService extends Service {
  // State
  models: UserModelDto[] = [];
  isLoading = false;
  error: string | null = null;

  /**
   * Load all models for current user
   */
  async loadModels(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const result = await userModelApi.getModels();
      this.models = result.models;
    } catch (err) {
      this.error = 'Failed to load models';
      console.error('Load models error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Create a new model
   */
  async createModel(data: CreateUserModelDto): Promise<boolean> {
    try {
      await userModelApi.createModel(data);
      await this.loadModels();
      return true;
    } catch (err) {
      this.error = 'Failed to create model';
      console.error('Create model error:', err);
      return false;
    }
  }

  /**
   * Update an existing model
   */
  async updateModel(id: string, data: UpdateUserModelDto): Promise<boolean> {
    try {
      await userModelApi.updateModel(id, data);
      await this.loadModels();
      return true;
    } catch (err) {
      this.error = 'Failed to update model';
      console.error('Update model error:', err);
      return false;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(id: string): Promise<boolean> {
    try {
      await userModelApi.deleteModel(id);
      await this.loadModels();
      return true;
    } catch (err) {
      this.error = 'Failed to delete model';
      console.error('Delete model error:', err);
      return false;
    }
  }

  /**
   * Set a model as default
   */
  async setDefault(id: string): Promise<boolean> {
    try {
      await userModelApi.setDefault(id);
      await this.loadModels();
      return true;
    } catch (err) {
      this.error = 'Failed to set default model';
      console.error('Set default error:', err);
      return false;
    }
  }

  /**
   * Get provider display name
   */
  getProviderName(provider: string): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      deepseek: 'DeepSeek',
      openrouter: 'OpenRouter',
      other: '其他 (OpenAI 兼容)',
    };
    return names[provider] || provider;
  }
}
