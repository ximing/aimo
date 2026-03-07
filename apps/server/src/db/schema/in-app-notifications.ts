import { mysqlTable, varchar, text, boolean, timestamp, index } from 'drizzle-orm/mysql-core';

/**
 * In-App Notifications table - stores in-app notifications for users (e.g., spaced repetition reminders)
 */
export const inAppNotifications = mysqlTable(
  'in_app_notifications',
  {
    notificationId: varchar('notification_id', { length: 191 }).primaryKey().notNull(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    memoId: varchar('memo_id', { length: 191 }),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('ian_user_id_idx').on(table.userId),
    userCreatedAtIdx: index('ian_user_created_at_idx').on(table.userId, table.createdAt),
  })
);

export type InAppNotification = typeof inAppNotifications.$inferSelect;
export type NewInAppNotification = typeof inAppNotifications.$inferInsert;
