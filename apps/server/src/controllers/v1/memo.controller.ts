import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  QueryParam,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { AvatarService } from '../../services/avatar.service.js';
import { MemoRelationService } from '../../services/memo-relation.service.js';
import { MemoService } from '../../services/memo.service.js';
import { UserService } from '../../services/user.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { CreateMemoDto, UpdateMemoDto, UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/memos')
export class MemoV1Controller {
  constructor(
    private memoService: MemoService,
    private memoRelationService: MemoRelationService,
    private userService: UserService,
    private avatarService: AvatarService
  ) {}

  @Get()
  async getMemos(
    @CurrentUser() user: UserInfoDto,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 10,
    @QueryParam('sortBy') sortBy: 'createdAt' | 'updatedAt' = 'createdAt',
    @QueryParam('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @QueryParam('search') search?: string,
    @QueryParam('categoryId') categoryId?: string,
    @QueryParam('tags') tags?: string[],
    @QueryParam('startDate') startDate?: string,
    @QueryParam('endDate') endDate?: string
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Convert string timestamps to Date objects
      // Frontend sends timestamps as numbers in query params (received as strings here)
      let startDateObject: Date | undefined;
      let endDateObject: Date | undefined;

      if (startDate) {
        const timestamp = Number.parseInt(startDate, 10);
        if (!isNaN(timestamp)) {
          startDateObject = new Date(timestamp);
        }
      }

      if (endDate) {
        const timestamp = Number.parseInt(endDate, 10);
        if (!isNaN(timestamp)) {
          endDateObject = new Date(timestamp);
        }
      }

      const result = await this.memoService.getMemos({
        uid: user.uid,
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        categoryId,
        tags,
        startDate: startDateObject,
        endDate: endDateObject,
      });

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Get memos error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/search/vector')
  async vectorSearch(
    @Body()
    body: {
      query: string;
      page?: number;
      limit?: number;
      categoryId?: string;
      startDate?: number;
      endDate?: number;
    },
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!body.query) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Query is required');
      }

      let startDateObject: Date | undefined;
      let endDateObject: Date | undefined;

      if (body.startDate !== undefined) {
        const timestamp = Number(body.startDate);
        if (!isNaN(timestamp)) {
          startDateObject = new Date(timestamp);
        }
      }

      if (body.endDate !== undefined) {
        const timestamp = Number(body.endDate);
        if (!isNaN(timestamp)) {
          endDateObject = new Date(timestamp);
        }
      }

      const result = await this.memoService.vectorSearch({
        uid: user.uid,
        query: body.query,
        page: body.page || 1,
        limit: body.limit || 20,
        categoryId: body.categoryId,
        startDate: startDateObject,
        endDate: endDateObject,
      });

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Vector search error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post()
  async createMemo(@Body() memoData: CreateMemoDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!memoData.content) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      const memo = await this.memoService.createMemo(
        user.uid,
        memoData.content,
        memoData.type,
        memoData.attachments,
        memoData.categoryId,
        memoData.relationIds,
        memoData.isPublic,
        memoData.createdAt,
        memoData.updatedAt,
        memoData.tags,
        memoData.tagIds,
        memoData.source
      );
      return ResponseUtility.success({
        message: 'Memo created successfully',
        memo,
      });
    } catch (error) {
      logger.error('Create memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:memoId')
  async getMemo(@Param('memoId') memoId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const memo = await this.memoService.getMemoById(memoId, user.uid);
      if (!memo) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success(memo);
    } catch (error) {
      logger.error('Get memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/:memoId')
  async updateMemo(
    @Param('memoId') memoId: string,
    @Body() memoData: UpdateMemoDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!memoData.content) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      const memo = await this.memoService.updateMemo(
        memoId,
        user.uid,
        memoData.content,
        memoData.type,
        memoData.attachments,
        memoData.categoryId,
        memoData.relationIds,
        memoData.isPublic,
        memoData.tags,
        memoData.tagIds,
        memoData.source
      );
      if (!memo) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Memo updated successfully',
        memo,
      });
    } catch (error) {
      logger.error('Update memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Put('/:memoId/tags')
  async updateMemoTags(
    @Param('memoId') memoId: string,
    @Body() body: { tags?: string[]; tagIds?: string[] },
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Support both tags (names) and tagIds
      if (body.tags && !Array.isArray(body.tags)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Tags must be an array');
      }

      if (body.tagIds && !Array.isArray(body.tagIds)) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'TagIds must be an array');
      }

      // Validate that all tags are strings
      const validTags = body.tags
        ? body.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
        : undefined;

      // Validate that all tagIds are strings
      const validTagIds = body.tagIds
        ? body.tagIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : undefined;

      const memo = await this.memoService.updateTags(memoId, user.uid, validTags, validTagIds);
      if (!memo) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Tags updated successfully',
        memo,
      });
    } catch (error: any) {
      logger.error('Update memo tags error:', error);
      if (error.message === 'Memo not found') {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:memoId')
  async deleteMemo(@Param('memoId') memoId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const success = await this.memoService.deleteMemo(memoId, user.uid);
      if (!success) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({ message: 'Memo deleted successfully' });
    } catch (error) {
      logger.error('Delete memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:memoId/related')
  async findRelatedMemos(
    @Param('memoId') memoId: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 10,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.memoService.findRelatedMemos(memoId, user.uid, page, limit);

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Find related memos error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:memoId/backlinks')
  async getBacklinks(
    @Param('memoId') memoId: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 20,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // First verify the memo exists and user has access
      const memo = await this.memoService.getMemoById(memoId, user.uid);
      if (!memo) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      // Get source memo IDs that link to this memo
      const backlinkIds = await this.memoRelationService.getBacklinks(user.uid, memoId);

      // Calculate pagination
      const total = backlinkIds.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paginatedIds = backlinkIds.slice(offset, offset + limit);

      // Fetch full memo details for the paginated IDs
      const items = await this.memoService.getMemosByIds(paginatedIds, user.uid);

      return ResponseUtility.success({
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      });
    } catch (error) {
      logger.error('Get backlinks error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Get public memos for a user (no authentication required)
   * This endpoint allows anyone to view public memos by user ID
   */
  @Get('/public/:uid')
  async getPublicMemos(
    @Param('uid') uid: string,
    @QueryParam('page') page: number = 1,
    @QueryParam('limit') limit: number = 20,
    @QueryParam('sortBy') sortBy: 'createdAt' | 'updatedAt' = 'createdAt',
    @QueryParam('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    try {
      if (!uid) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'User ID is required');
      }

      const result = await this.memoService.getPublicMemos(uid, page, limit, sortBy, sortOrder);

      return ResponseUtility.success(result);
    } catch (error) {
      logger.error('Get public memos error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Get a random public memo for a user (no authentication required)
   * Returns a single random memo from the user's public memos
   */
  @Get('/public/:uid/random')
  async getRandomPublicMemo(@Param('uid') uid: string) {
    try {
      if (!uid) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'User ID is required');
      }

      const memo = await this.memoService.getRandomPublicMemo(uid);

      if (!memo) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'No public memos found for this user');
      }

      return ResponseUtility.success(memo);
    } catch (error) {
      logger.error('Get random public memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Get a single public memo by ID (no authentication required)
   * Returns a memo if it exists and is marked as public
   */
  @Get('/public/memo/:memoId')
  async getPublicMemoById(@Param('memoId') memoId: string) {
    try {
      if (!memoId) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Memo ID is required');
      }

      const memo = await this.memoService.getPublicMemoById(memoId);

      if (!memo) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Public memo not found');
      }

      // Get user info
      const user = await this.userService.findUserByUid(memo.uid);

      if (!user) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'User not found');
      }

      const userInfo: UserInfoDto = {
        uid: user.uid,
        email: user.email,
        nickname: user.nickname,
        avatar: await this.avatarService.generateAvatarAccessUrl(user.avatar || ''),
      };

      return ResponseUtility.success({
        memo,
        user: userInfo,
      });
    } catch (error) {
      logger.error('Get public memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
