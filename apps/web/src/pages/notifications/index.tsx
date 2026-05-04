import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { view, useService, bindServices } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { NotificationService } from '../../services/notification.service';
import { NotificationTabs, type NotificationTab } from './NotificationTabs';
import { NotificationGroup } from './NotificationGroup';
import { toast } from '../../services/toast.service';
import { Loader2 } from 'lucide-react';
import type { Notification } from '../../api/notification';

const groupNotificationsByTime = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { title: string; notifications: Notification[] }[] = [
    { title: '今天', notifications: [] },
    { title: '昨天', notifications: [] },
    { title: '本周', notifications: [] },
    { title: '更早', notifications: [] },
  ];

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt);
    if (date >= today) {
      groups[0].notifications.push(notification);
    } else if (date >= yesterday) {
      groups[1].notifications.push(notification);
    } else if (date >= thisWeek) {
      groups[2].notifications.push(notification);
    } else {
      groups[3].notifications.push(notification);
    }
  });

  return groups.filter((g) => g.notifications.length > 0);
};

export const NotificationPage = bindServices(() => {
  const navigate = useNavigate();
  const notificationService = useService(NotificationService);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    const loadAndMarkAsRead = async () => {
      await notificationService.fetchNotifications();
      await notificationService.markAllAsRead();
    };
    loadAndMarkAsRead();
  }, [notificationService]);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notificationService.notifications.filter((n) => !n.isRead);
      case 'read':
        return notificationService.notifications.filter((n) => n.isRead);
      default:
        return notificationService.notifications;
    }
  }, [notificationService.notifications, activeTab]);

  const groupedNotifications = useMemo(
    () => groupNotificationsByTime(filteredNotifications),
    [filteredNotifications]
  );

  const hasUnreadInCurrentTab = activeTab !== 'read' && notificationService.unreadCount > 0;

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const success = await notificationService.markAllAsRead();
      if (success) {
        toast.success('已全部标记为已读');
      } else {
        toast.error('操作失败，请重试');
      }
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-[720px] h-full flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">通知中心</h1>
              </div>
              {activeTab !== 'read' && hasUnreadInCurrentTab && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 flex items-center gap-1"
                >
                  {markingAllRead && <Loader2 className="w-4 h-4 animate-spin" />}
                  全部已读
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-4">
              <NotificationTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900 px-6 py-6">
            {notificationService.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">暂无通知</p>
              </div>
            ) : (
              groupedNotifications.map((group) => (
                <NotificationGroup
                  key={group.title}
                  title={group.title}
                  notifications={group.notifications}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}, [NotificationService]);

export default NotificationPage;
