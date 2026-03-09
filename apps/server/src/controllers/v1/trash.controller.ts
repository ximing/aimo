import {
  JsonController,
  Get,
  Post,
  Delete,
  Param,
  QueryParam,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { MemoService } from '../../services/memo.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/trash')
export class TrashController {
  constructor(private memoService: MemoService) {}

  @Get()
  async getTrashMemos(
    @CurrentUser() user: UserInfoDto,
    @QueryParam('page') page: number = 1,
    @QueryParam('pageSize') pageSize: number = 20,
    @QueryParam('keyword') keyword?: string,
    @QueryParam('sortBy') sortBy: 'deletedAt_desc' | 'deletedAt_asc' = 'deletedAt_desc',
    @QueryParam('startDate') startDate?: string,
    @QueryParam('endDate') endDate?: string
  ) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Convert string timestamps to Date objects
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

      const result = await this.memoService.getTrashMemos({
        uid: user.uid,
        page,
        limit: pageSize,
        sortBy,
        keyword,
        startDate: startDateObject,
        endDate: endDateObject,
      });

      return ResponseUtility.success({
        list: result.list,
        total: result.pagination.total,
        page: result.pagination.page,
        pageSize: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      });
    } catch (error) {
      logger.error('Get trash memos error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/:memoId/restore')
  async restoreMemo(@Param('memoId') memoId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.memoService.restoreMemo(memoId, user.uid);

      if (result === 'not_found') {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      if (result === 'not_deleted') {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Memo is not in trash');
      }

      return ResponseUtility.success({ message: 'Memo restored successfully' });
    } catch (error) {
      logger.error('Restore memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  @Delete('/:memoId')
  async permanentlyDeleteMemo(@Param('memoId') memoId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const result = await this.memoService.permanentlyDeleteMemo(memoId, user.uid);

      if (result === 'not_found') {
        return ResponseUtility.error(ErrorCode.NOT_FOUND);
      }

      if (result === 'not_deleted') {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Memo is not in trash');
      }

      return ResponseUtility.success({ message: 'Memo permanently deleted' });
    } catch (error) {
      logger.error('Permanently delete memo error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
