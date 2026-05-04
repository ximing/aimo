import { useNavigate } from 'react-router';
import { useService } from '@rabjs/react';
import { NotificationService } from '../../services/notification.service';
import type { Notification } from '../../api/notification';

interface NotificationCardProps {
  notification: Notification;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getNotificationIcon = (_type: string) => {
  // Placeholder - can be enhanced with type-specific icons
  return '🔔';
};

const getNotificationPath = (notification: Notification): string => {
  if (notification.type === 'memo_mention' || notification.type === 'memo_comment') {
    return notification.memoId ? `/home?memo=${encodeURIComponent(notification.memoId)}` : '/home';
  }
  if (notification.type === 'ai_recommendation') {
    return '/ai-explore';
  }
  if (notification.type === 'system') {
    return '/settings';
  }
  return '/home';
};

export const NotificationCard = ({ notification }: NotificationCardProps) => {
  const navigate = useNavigate();
  const notificationService = useService(NotificationService);

  const handleClick = async () => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification.notificationId);
    }
    const path = getNotificationPath(notification);
    navigate(path);
  };

  const timeStr = new Date(notification.createdAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 ${
        notification.isRead
          ? 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 opacity-60'
          : 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
            {notification.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
            {notification.body}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{timeStr}</p>
        </div>
        {!notification.isRead && (
          <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
        )}
      </div>
    </button>
  );
};
