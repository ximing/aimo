import { Service } from '@rabjs/react';
import * as notificationApi from '../api/notification';
import type { Notification } from '../api/notification';

export class NotificationService extends Service {
  notifications: Notification[] = [];
  unreadCount = 0;
  loading = false;

  // Interval ID for polling
  private pollIntervalId: ReturnType<typeof setInterval> | null = null;

  async fetchUnreadCount(): Promise<void> {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.code === 0) {
        this.unreadCount = res.data.count;
      }
    } catch (e) {
      console.error('Fetch unread count error:', e);
    }
  }

  async fetchNotifications(): Promise<void> {
    this.loading = true;
    try {
      const res = await notificationApi.getNotifications();
      if (res.code === 0 && res.data) {
        this.notifications = res.data.notifications || [];
      }
    } catch (e) {
      console.error('Fetch notifications error:', e);
    } finally {
      this.loading = false;
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const res = await notificationApi.markAsRead(notificationId);
      if (res.code === 0) {
        // Update local state
        const notification = this.notifications.find((n) => n.notificationId === notificationId);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Mark as read error:', e);
      return false;
    }
  }

  startPolling(intervalMs = 60000): void {
    this.stopPolling();
    this.pollIntervalId = setInterval(() => {
      this.fetchUnreadCount();
    }, intervalMs);

    // Also fetch on visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.fetchUnreadCount();
    }
  };
}
