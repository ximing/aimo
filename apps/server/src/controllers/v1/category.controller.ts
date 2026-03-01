import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { CategoryService } from '../../services/category.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { CreateCategoryDto, UpdateCategoryDto, UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/categories')
export class CategoryV1Controller {
  constructor(private categoryService: CategoryService) {}

  @Get()
  async getCategories(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const categories = await this.categoryService.getCategoriesByUid(user.uid);

      return ResponseUtility.success({
        message: 'Categories fetched successfully',
        categories,
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:categoryId')
  async getCategory(@Param('categoryId') categoryId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const category = await this.categoryService.getCategoryById(categoryId, user.uid);
      if (!category) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Category fetched successfully',
        category,
      });
    } catch (error) {
      logger.error('Get category error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post()
  async createCategory(@Body() categoryData: CreateCategoryDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!categoryData.name) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Category name is required');
      }

      const category = await this.categoryService.createCategory(user.uid, categoryData);

      return ResponseUtility.success({
        message: 'Category created successfully',
        category,
      });
    } catch (error) {
      logger.error('Create category error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtility.error(ErrorCode.CATEGORY_ALREADY_EXISTS);
      }
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/:categoryId')
  async updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() categoryData: UpdateCategoryDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const category = await this.categoryService.updateCategory(
        categoryId,
        user.uid,
        categoryData
      );
      if (!category) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Category updated successfully',
        category,
      });
    } catch (error) {
      logger.error('Update category error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtility.error(ErrorCode.CATEGORY_ALREADY_EXISTS);
      }
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:categoryId')
  async deleteCategory(@Param('categoryId') categoryId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const success = await this.categoryService.deleteCategory(categoryId, user.uid);
      if (!success) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Category deleted successfully',
      });
    } catch (error) {
      logger.error('Delete category error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
