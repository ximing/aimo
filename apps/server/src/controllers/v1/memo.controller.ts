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
import { MemoRelationService } from '../../services/memo-relation.service.js';
import { MemoService } from '../../services/memo.service.js';
import { RecommendationService } from '../../services/recommendation.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { CreateMemoDto, UpdateMemoDto, UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/memos')
export class MemoV1Controller {
  constructor(
    private memoService: MemoService,
    private memoRelationService: MemoRelationService,
    private recommendationService: RecommendationService
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
        startDate: startDateObject,
        endDate: endDateObject,
      });

      return ResponseUtility.success(result);
    } catch (error) {
      console.error('Get memos error:', error);
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
      console.error('Get memo error:', error);
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
        memoData.createdAt,
        memoData.updatedAt
      );
      return ResponseUtility.success({
        message: 'Memo created successfully',
        memo,
      });
    } catch (error) {
      console.error('Create memo error:', error);
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
        memoData.relationIds
      );
      if (!memo) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtility.success({
        message: 'Memo updated successfully',
        memo,
      });
    } catch (error) {
      console.error('Update memo error:', error);
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
      console.error('Delete memo error:', error);
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
      console.error('Vector search error:', error);
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
      console.error('Find related memos error:', error);
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
      console.error('Get backlinks error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/stats/activity')
  async getActivityStats(
    @QueryParam('days') days: number = 90,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate days parameter
      const validDays = Math.min(Math.max(days, 1), 365);

      const stats = await this.memoService.getActivityStats(user.uid, validDays);

      return ResponseUtility.success(stats);
    } catch (error) {
      console.error('Get activity stats error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/on-this-day')
  async getOnThisDayMemos(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.memoService.getOnThisDayMemos(user.uid);

      return ResponseUtility.success(result);
    } catch (error) {
      console.error('Get on this day memos error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/daily-recommendations')
  async getDailyRecommendations(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const memos = await this.recommendationService.generateDailyRecommendations(user.uid);

      return ResponseUtility.success({
        items: memos,
        total: memos.length,
      });
    } catch (error) {
      console.error('Get daily recommendations error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
