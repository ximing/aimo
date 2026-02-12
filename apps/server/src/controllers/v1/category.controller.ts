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
import type { CreateCategoryDto, UpdateCategoryDto, UserInfoDto } from '@aimo/dto';
import { CategoryService } from '../../services/category.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';

@Service()
@JsonController('/api/v1/categories')
export class CategoryV1Controller {
  constructor(private categoryService: CategoryService) {}

  @Get()
  async getCategories(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const categories = await this.categoryService.getCategoriesByUid(user.uid);

      return ResponseUtil.success({
        message: 'Categories fetched successfully',
        categories,
      });
    } catch (error) {
      console.error('Get categories error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:categoryId')
  async getCategory(
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const category = await this.categoryService.getCategoryById(categoryId, user.uid);
      if (!category) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtil.success({
        message: 'Category fetched successfully',
        category,
      });
    } catch (error) {
      console.error('Get category error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Post()
  async createCategory(
    @Body() categoryData: CreateCategoryDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!categoryData.name) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Category name is required');
      }

      const category = await this.categoryService.createCategory(user.uid, categoryData);

      return ResponseUtil.success({
        message: 'Category created successfully',
        category,
      });
    } catch (error) {
      console.error('Create category error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
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
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const category = await this.categoryService.updateCategory(
        categoryId,
        user.uid,
        categoryData
      );
      if (!category) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtil.success({
        message: 'Category updated successfully',
        category,
      });
    } catch (error) {
      console.error('Update category error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:categoryId')
  async deleteCategory(
    @Param('categoryId') categoryId: string,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const success = await this.categoryService.deleteCategory(categoryId, user.uid);
      if (!success) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtil.success({
        message: 'Category deleted successfully',
      });
    } catch (error) {
      console.error('Delete category error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}
