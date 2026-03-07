import { JsonController, Get, Post, Param, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { NotificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type { UserInfoDto } from '@aimo/dto';

@Service()
@JsonController('/api/v1/notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * GET /api/v1/notifications
   * Returns the most recent 50 notifications for the current user, sorted by createdAt desc
   */
  @Get('/')
  async getNotifications(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const notifications = await this.notificationService.getNotifications(user.uid);
      return ResponseUtility.success({ notifications });
    } catch (error) {
      logger.error('Get notifications error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get notifications');
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Returns the count of unread notifications for the current user
   */
  @Get('/unread-count')
  async getUnreadCount(@CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const count = await this.notificationService.getUnreadCount(user.uid);
      return ResponseUtility.success({ count });
    } catch (error) {
      logger.error('Get unread count error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to get unread count');
    }
  }

  /**
   * POST /api/v1/notifications/:id/read
   * Marks a notification as read; returns 404 if not owned by current user
   */
  @Post('/:id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: UserInfoDto) {
    try {
      if (!user?.uid) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!id) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Notification ID is required');
      }

      const success = await this.notificationService.markAsRead(id, user.uid);
      if (!success) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Notification not found');
      }

      return ResponseUtility.success({ message: 'Notification marked as read' });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR, 'Failed to mark notification as read');
    }
  }
}
