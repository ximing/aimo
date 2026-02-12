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
import type { CreateMemoDto, UpdateMemoDto, UserInfoDto } from '@aimo/dto';
import { MemoService } from '../../services/memo.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';

@Service()
@JsonController('/api/v1/memos')
export class MemoV1Controller {
  constructor(private memoService: MemoService) {}

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
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.memoService.getMemos({
        uid: user.uid,
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        categoryId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return ResponseUtil.success(result);
    } catch (error) {
      console.error('Get memos error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:memoId')
  async getMemo(@Param('memoId') memoId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const memo = await this.memoService.getMemoById(memoId, user.uid);
      if (!memo) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtil.success(memo);
    } catch (error) {
      console.error('Get memo error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Post()
  async createMemo(@Body() memoData: CreateMemoDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!memoData.content) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      const memo = await this.memoService.createMemo(user.uid, memoData.content, memoData.attachments, memoData.categoryId, memoData.relationIds, memoData.createdAt, memoData.updatedAt);
      return ResponseUtil.success({
        message: 'Memo created successfully',
        memo,
      });
    } catch (error) {
      console.error('Create memo error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
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
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!memoData.content) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      const memo = await this.memoService.updateMemo(memoId, user.uid, memoData.content, memoData.attachments, memoData.categoryId, memoData.relationIds);
      if (!memo) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtil.success({
        message: 'Memo updated successfully',
        memo,
      });
    } catch (error) {
      console.error('Update memo error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:memoId')
  async deleteMemo(@Param('memoId') memoId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const success = await this.memoService.deleteMemo(memoId, user.uid);
      if (!success) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND);
      }

      return ResponseUtil.success({ message: 'Memo deleted successfully' });
    } catch (error) {
      console.error('Delete memo error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/search/vector')
  async vectorSearch(
    @Body() body: { query: string; page?: number; limit?: number; threshold?: number },
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      if (!body.query) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Query is required');
      }

      const result = await this.memoService.vectorSearch({
        uid: user.uid,
        query: body.query,
        page: body.page || 1,
        limit: body.limit || 20,
        threshold: body.threshold || 0.5,
      });

      return ResponseUtil.success(result);
    } catch (error) {
      console.error('Vector search error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Get('/:memoId/related')
  async findRelatedMemos(
    @Param('memoId') memoId: string,
    @QueryParam('limit') limit: number = 10,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const results = await this.memoService.findRelatedMemos(memoId, user.uid, limit);

      return ResponseUtil.success({
        items: results,
        count: results.length,
      });
    } catch (error) {
      console.error('Find related memos error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}