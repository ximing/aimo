import request from '../utils/request';

export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  memoId: string | null;
  isRead: boolean;
  createdAt: string;
}

export const getNotifications = () =>
  request.get<unknown, { code: number; data: { notifications: Notification[] } }>(
    '/api/v1/notifications'
  );

export const getUnreadCount = () =>
  request.get<unknown, { code: number; data: { count: number } }>(
    '/api/v1/notifications/unread-count'
  );

export const markAsRead = (notificationId: string) =>
  request.post<unknown, { code: number; data: { message: string } }>(
    `/api/v1/notifications/${notificationId}/read`,
    {}
  );
