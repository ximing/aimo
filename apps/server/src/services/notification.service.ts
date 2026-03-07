import { Service } from 'typedi';
import { eq, and, desc, sql } from 'drizzle-orm';

import { getDatabase } from '../db/connection.js';
import { inAppNotifications } from '../db/schema/in-app-notifications.js';
import { generateTypeId } from '../utils/id.js';
import { OBJECT_TYPE } from '../models/constant/type.js';

import type { InAppNotification, NewInAppNotification } from '../db/schema/in-app-notifications.js';

export type CreateNotificationParams = Omit<NewInAppNotification, 'notificationId' | 'createdAt' | 'isRead'>;

@Service()
export class NotificationService {
  /**
   * Get the most recent 50 notifications for a user, sorted by createdAt desc
   */
  async getNotifications(userId: string): Promise<InAppNotification[]> {
    const db = getDatabase();
    return db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, userId))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(50);
  }

  /**
   * Mark a notification as read. Returns false if the notification doesn't exist or doesn't belong to the user.
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const db = getDatabase();

    // Verify ownership first
    const existing = await db
      .select({ notificationId: inAppNotifications.notificationId })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.notificationId, notificationId),
          eq(inAppNotifications.userId, userId)
        )
      )
      .limit(1);

    if (!existing.length) {
      return false;
    }

    await db
      .update(inAppNotifications)
      .set({ isRead: true })
      .where(eq(inAppNotifications.notificationId, notificationId));

    return true;
  }

  /**
   * Get the count of unread notifications for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const db = getDatabase();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.isRead, false)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  /**
   * Create a new in-app notification
   */
  async createNotification(params: CreateNotificationParams): Promise<InAppNotification> {
    const db = getDatabase();
    const notificationId = generateTypeId(OBJECT_TYPE.NOTIFICATION);

    await db.insert(inAppNotifications).values({
      notificationId,
      ...params,
    });

    const created = await db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.notificationId, notificationId))
      .limit(1);

    return created[0];
  }
}
