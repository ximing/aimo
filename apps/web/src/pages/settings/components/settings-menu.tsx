import { User, Import } from 'lucide-react';
import type { SettingsTab } from '../settings';

interface SettingsMenuProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export const SettingsMenu = ({ activeTab, onTabChange }: SettingsMenuProps) => {
  const menuItems: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'account',
      label: '账户设置',
      icon: <User className="w-5 h-5" />,
    },
    {
      id: 'import',
      label: '数据导入',
      icon: <Import className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-[240px] flex-shrink-0 border-r border-gray-200 dark:border-dark-800 bg-gray-50 dark:bg-dark-800/50 px-4 py-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-6 px-3">设置</h2>
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};
