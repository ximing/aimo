import {
  JsonController,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  CurrentUser,
} from 'routing-controllers';
import { Service, Container } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { UserModelService } from '../../services/user-model.service.js';
import { LLMService, type ChatMessage } from '../../services/llm.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type {
  CreateUserModelDto,
  UpdateUserModelDto,
  UserModelDto,
  UserModelListDto,
  UserInfoDto,
} from '@aimo/dto';
import type { UserModel } from '../../db/schema/user-models.js';

/**
 * Helper to convert UserModel to UserModelDto
 */
function convertToDto(model: UserModel): UserModelDto {
  return {
    id: model.id,
    userId: model.userId,
    name: model.name,
    provider: model.provider as UserModelDto['provider'],
    apiBaseUrl: model.apiBaseUrl ?? undefined,
    apiKey: model.apiKey, // Return API key - masking should be done on frontend
    modelName: model.modelName,
    isDefault: model.isDefault,
    createdAt: model.createdAt instanceof Date ? model.createdAt.toISOString() : model.createdAt,
    updatedAt: model.updatedAt instanceof Date ? model.updatedAt.toISOString() : model.updatedAt,
  };
}

@Service()
@JsonController('/api/v1/user-models')
export class UserModelController {
  constructor(
    private userModelService: UserModelService,
    private llmService: LLMService
  ) {}

  /**
   * POST /api/v1/user-models/test - Test model configuration
   */
  @Post('/test')
  async testModel(@CurrentUser() userDto: UserInfoDto, @Body() testData: CreateUserModelDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate required fields
      if (!testData.provider) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Provider is required');
      }
      if (!testData.apiKey || testData.apiKey.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'API key is required');
      }
      if (!testData.modelName || testData.modelName.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Model name is required');
      }

      // Get API config based on provider
      let baseUrl: string;
      switch (testData.provider) {
        case 'openai':
          baseUrl = testData.apiBaseUrl || 'https://api.openai.com/v1';
          break;
        case 'deepseek':
          baseUrl = testData.apiBaseUrl || 'https://api.deepseek.com/v1';
          break;
        case 'openrouter':
          baseUrl = testData.apiBaseUrl || 'https://openrouter.ai/api/v1';
          break;
        case 'other':
          if (!testData.apiBaseUrl) {
            return ResponseUtility.error(
              ErrorCode.PARAMS_ERROR,
              'API Base URL is required for custom providers'
            );
          }
          baseUrl = testData.apiBaseUrl;
          break;
        default:
          return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid provider');
      }

      const testMessages: ChatMessage[] = [
        { role: 'user', content: 'Say "OK" if you can see this message.' },
      ];

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testData.apiKey}`,
        },
        body: JSON.stringify({
          model: testData.modelName,
          messages: testMessages,
          max_tokens: 50,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return ResponseUtility.error(
          ErrorCode.EXTERNAL_SERVICE_ERROR,
          `API request failed: ${response.status} - ${errorBody}`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message: { content: string } }>;
        error?: { message: string };
      };

      if (data.error) {
        return ResponseUtility.error(ErrorCode.EXTERNAL_SERVICE_ERROR, data.error.message);
      }

      const content = data.choices?.[0]?.message?.content || 'No response';

      return ResponseUtility.success({
        success: true,
        message: 'Model connection test successful',
        response: content,
      });
    } catch (error) {
      logger.error('Test user model error:', error);
      return ResponseUtility.error(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/v1/user-models - Create a new model configuration
   */
  @Post('/')
  async createModel(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateUserModelDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate required fields
      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Model name is required');
      }

      if (!createData.provider) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Provider is required');
      }

      if (!createData.apiKey || createData.apiKey.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'API key is required');
      }

      if (!createData.modelName || createData.modelName.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Model name is required');
      }

      const model = await this.userModelService.createModel(userDto.id, {
        name: createData.name.trim(),
        provider: createData.provider,
        apiBaseUrl: createData.apiBaseUrl,
        apiKey: createData.apiKey,
        modelName: createData.modelName.trim(),
        isDefault: createData.isDefault,
      });

      return ResponseUtility.success(convertToDto(model));
    } catch (error) {
      logger.error('Create user model error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/user-models - Get all models for current user
   */
  @Get('/')
  async getModels(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const models = await this.userModelService.getModels(userDto.id);
      const modelDtos = models.map(convertToDto);

      const response: UserModelListDto = {
        models: modelDtos,
      };

      return ResponseUtility.success(response);
    } catch (error) {
      logger.error('Get user models error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/user-models/:id - Get single model details
   */
  @Get('/:id')
  async getModel(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const model = await this.userModelService.getModel(id, userDto.id);
      if (!model) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Model not found');
      }

      return ResponseUtility.success(convertToDto(model));
    } catch (error) {
      logger.error('Get user model error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/user-models/:id - Update model configuration
   */
  @Put('/:id')
  async updateModel(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateUserModelDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate that there's something to update
      if (Object.keys(updateData).length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'No fields to update');
      }

      const updatedModel = await this.userModelService.updateModel(id, userDto.id, updateData);
      if (!updatedModel) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Model not found');
      }

      return ResponseUtility.success(convertToDto(updatedModel));
    } catch (error) {
      logger.error('Update user model error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/user-models/:id - Delete model configuration
   */
  @Delete('/:id')
  async deleteModel(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.userModelService.deleteModel(id, userDto.id);
      if (!deleted) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Model not found');
      }

      return ResponseUtility.success({ deleted: true });
    } catch (error) {
      logger.error('Delete user model error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PATCH /api/v1/user-models/:id/set-default - Set model as default
   */
  @Patch('/:id/set-default')
  async setDefault(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const updatedModel = await this.userModelService.setDefaultModel(id, userDto.id);
      if (!updatedModel) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Model not found');
      }

      return ResponseUtility.success(convertToDto(updatedModel));
    } catch (error) {
      logger.error('Set default user model error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
