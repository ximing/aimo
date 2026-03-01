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
import { TagService } from '../../services/tag.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import type { CreateTagDto, UpdateTagDto, UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/tags')
export class TagV1Controller {
  constructor(private tagService: TagService) {}

  @Get()
  async getTags(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const tags = await this.tagService.getTagsByUser(user.uid);

      return ResponseUtility.success({
        message: 'Tags fetched successfully',
        tags,
      });
    } catch (error) {
      logger.error('Get tags error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:tagId')
  async getTag(@Param('tagId') tagId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const tag = await this.tagService.getTagById(tagId, user.uid);
      if (!tag) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Tag fetched successfully',
        tag,
      });
    } catch (error) {
      logger.error('Get tag error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post()
  async createTag(@Body() tagData: CreateTagDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!tagData.name || tagData.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Tag name is required');
      }

      const tag = await this.tagService.createTag(tagData, user.uid);

      return ResponseUtility.success({
        message: 'Tag created successfully',
        tag,
      });
    } catch (error) {
      logger.error('Create tag error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/:tagId')
  async updateTag(
    @Param('tagId') tagId: string,
    @Body() tagData: UpdateTagDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (tagData.name !== undefined && tagData.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Tag name cannot be empty');
      }

      const tag = await this.tagService.updateTag(tagId, tagData, user.uid);
      if (!tag) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Tag updated successfully',
        tag,
      });
    } catch (error) {
      logger.error('Update tag error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:tagId')
  async deleteTag(@Param('tagId') tagId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const success = await this.tagService.deleteTag(tagId, user.uid);
      if (!success) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Tag deleted successfully',
      });
    } catch (error) {
      logger.error('Delete tag error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
