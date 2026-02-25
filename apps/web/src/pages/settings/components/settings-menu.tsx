import { NavLink } from 'react-router';
import { User, Import, Download, Info, Bell } from 'lucide-react';

export const SettingsMenu = () => {
  const menuItems: Array<{ id: string; label: string; icon: React.ReactNode; to: string }> = [
    {
      id: 'account',
      label: '账户设置',
      icon: <User className="w-5 h-5" />,
      to: '/settings/account',
    },
    {
      id: 'push-rules',
      label: '推送规则',
      icon: <Bell className="w-5 h-5" />,
      to: '/settings/push-rules',
    },
    {
      id: 'import',
      label: '数据导入',
      icon: <Import className="w-5 h-5" />,
      to: '/settings/import',
    },
    {
      id: 'export',
      label: '数据导出',
      icon: <Download className="w-5 h-5" />,
      to: '/settings/export',
    },
    {
      id: 'about',
      label: '关于',
      icon: <Info className="w-5 h-5" />,
      to: '/settings/about',
    },
  ];

  return (
    <aside className="w-[240px] flex-shrink-0 px-4 py-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-6 px-3">设置</h2>
      <nav className="space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
