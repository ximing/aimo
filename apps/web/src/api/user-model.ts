import type {
  UserModelDto,
  CreateUserModelDto,
  UpdateUserModelDto,
  UserModelListDto,
} from '@aimo/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

export interface TestModelResult {
  success: boolean;
  message: string;
  response: string;
}

/**
 * User model (LLM) API endpoints
 */
export const userModelApi = {
  /**
   * Get all models for current user
   */
  getModels: async (): Promise<UserModelListDto> => {
    const response = await request.get<unknown, ApiResponse<UserModelListDto>>(
      '/api/v1/user-models'
    );
    return response.data;
  },

  /**
   * Get a single model by ID
   */
  getModel: async (id: string): Promise<UserModelDto> => {
    const response = await request.get<unknown, ApiResponse<UserModelDto>>(
      `/api/v1/user-models/${id}`
    );
    return response.data;
  },

  /**
   * Create a new model
   */
  createModel: async (data: CreateUserModelDto): Promise<UserModelDto> => {
    const response = await request.post<CreateUserModelDto, ApiResponse<UserModelDto>>(
      '/api/v1/user-models',
      data
    );
    return response.data;
  },

  /**
   * Update a model
   */
  updateModel: async (id: string, data: UpdateUserModelDto): Promise<UserModelDto> => {
    const response = await request.put<UpdateUserModelDto, ApiResponse<UserModelDto>>(
      `/api/v1/user-models/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a model
   */
  deleteModel: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/user-models/${id}`
    );
    return response.data;
  },

  /**
   * Set a model as default
   */
  setDefault: async (id: string): Promise<UserModelDto> => {
    const response = await request.patch<unknown, ApiResponse<UserModelDto>>(
      `/api/v1/user-models/${id}/set-default`
    );
    return response.data;
  },

  /**
   * Test model configuration
   */
  testModel: async (data: CreateUserModelDto): Promise<TestModelResult> => {
    const response = await request.post<CreateUserModelDto, ApiResponse<TestModelResult>>(
      '/api/v1/user-models/test',
      data
    );
    return response.data;
  },
};
