import { useService } from '@rabjs/react';
import { NotificationService } from '../../services/notification.service';

export type NotificationTab = 'all' | 'unread' | 'read';

interface NotificationTabsProps {
  activeTab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
}

export const NotificationTabs = ({ activeTab, onTabChange }: NotificationTabsProps) => {
  const notificationService = useService(NotificationService);

  const tabs: { key: NotificationTab; label: string; count?: number }[] = [
    { key: 'all', label: '全部' },
    { key: 'unread', label: '未读', count: notificationService.unreadCount },
    { key: 'read', label: '已读' },
  ];

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-dark-700 p-1 rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
