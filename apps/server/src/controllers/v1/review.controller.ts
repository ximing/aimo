import { JsonController, Post, Get, Put, Body, Param, CurrentUser, Delete } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { ReviewService } from '../../services/review.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil } from '../../utils/response.js';

import type { UserInfoDto, CreateReviewSessionDto, CreateReviewProfileDto, UpdateReviewProfileDto, SubmitAnswerDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/review')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post('/sessions')
  async createSession(@Body() dto: CreateReviewSessionDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const session = await this.reviewService.createSession(user.uid, dto);
      return ResponseUtil.success(session);
    } catch (error) {
      logger.error('Create review session error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR, (error as Error).message);
    }
  }

  @Get('/sessions/:id')
  async getSession(@Param('id') sessionId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const session = await this.reviewService.getSession(user.uid, sessionId);
      if (!session) return ResponseUtil.error(ErrorCode.NOT_FOUND);
      return ResponseUtil.success(session);
    } catch (error) {
      logger.error('Get review session error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }

  @Post('/sessions/:id/answer')
  async submitAnswer(
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const result = await this.reviewService.submitAnswer(user.uid, sessionId, dto);
      return ResponseUtil.success(result);
    } catch (error) {
      logger.error('Submit answer error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR, (error as Error).message);
    }
  }

  @Post('/sessions/:id/complete')
  async completeSession(@Param('id') sessionId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const result = await this.reviewService.completeSession(user.uid, sessionId);
      return ResponseUtil.success(result);
    } catch (error) {
      logger.error('Complete review session error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }

  @Get('/history')
  async getHistory(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const history = await this.reviewService.getHistory(user.uid);
      return ResponseUtil.success({ items: history, total: history.length });
    } catch (error) {
      logger.error('Get review history error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }

  // Profile CRUD endpoints
  @Get('/profiles')
  async getProfiles(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const profiles = await this.reviewService.getProfiles(user.uid);
      return ResponseUtil.success({ profiles });
    } catch (error) {
      logger.error('Get review profiles error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }

  @Post('/profiles')
  async createProfile(@Body() dto: CreateReviewProfileDto, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const profile = await this.reviewService.createProfile(user.uid, dto);
      return ResponseUtil.success(profile);
    } catch (error) {
      logger.error('Create review profile error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR, (error as Error).message);
    }
  }

  @Put('/profiles/:id')
  async updateProfile(
    @Param('id') profileId: string,
    @Body() dto: UpdateReviewProfileDto,
    @CurrentUser() user: UserInfoDto
  ) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const profile = await this.reviewService.updateProfile(user.uid, profileId, dto);
      if (!profile) return ResponseUtil.error(ErrorCode.NOT_FOUND);
      return ResponseUtil.success(profile);
    } catch (error) {
      logger.error('Update review profile error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR, (error as Error).message);
    }
  }

  @Delete('/profiles/:id')
  async deleteProfile(@Param('id') profileId: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      const deleted = await this.reviewService.deleteProfile(user.uid, profileId);
      if (!deleted) return ResponseUtil.error(ErrorCode.NOT_FOUND);
      return ResponseUtil.success({ success: true });
    } catch (error) {
      logger.error('Delete review profile error:', error);
      return ResponseUtil.error(ErrorCode.SYSTEM_ERROR);
    }
  }
}
