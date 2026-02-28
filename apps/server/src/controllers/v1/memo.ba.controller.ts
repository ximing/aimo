import { JsonController, Post, QueryParam, Body, UseBefore } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { MemoService } from '../../services/memo.service.js';
import { UserService } from '../../services/user.service.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { baAuthInterceptor } from '../../middlewares/ba-auth.interceptor.js';

import type { CreateMemoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/memos/ba')
export class MemoBAController {
  constructor(
    private memoService: MemoService,
    private userService: UserService
  ) {}

  /**
   * Create a memo via BA authentication (no JWT required)
   * User ID is passed as a query parameter
   * Requires BA_AUTH_TOKEN in environment variable
   */
  @Post('/create')
  @UseBefore(baAuthInterceptor)
  async createMemoByBA(@QueryParam('uid') uid: string, @Body() memoData: CreateMemoDto) {
    try {
      if (!uid) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'User ID (uid) is required');
      }

      // Verify user exists
      const user = await this.userService.findUserByUid(uid);
      if (!user) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'User not found');
      }

      if (!memoData.content) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Content is required');
      }

      const memo = await this.memoService.createMemo(
        uid,
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
        message: 'Memo created successfully via BA authentication',
        memo,
      });
    } catch (error) {
      console.error('Create memo by BA error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
