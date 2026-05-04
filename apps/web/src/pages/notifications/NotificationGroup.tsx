import { NotificationCard } from './NotificationCard';
import type { Notification } from '../../api/notification';

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
}

export const NotificationGroup = ({ title, notifications }: NotificationGroupProps) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-1">
        {title}
      </h2>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationCard key={notification.notificationId} notification={notification} />
        ))}
      </div>
    </div>
  );
};
