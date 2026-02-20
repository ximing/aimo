import { Outlet } from 'react-router';
import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { SettingsMenu } from './components/settings-menu';

export type SettingsTab = 'account' | 'import' | 'export' | 'about';

export const SettingsPage = view(() => {
  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-[1200px] h-full flex">
          {/* Left Sidebar Menu */}
          <SettingsMenu />

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900">
            <div className="px-12 py-8">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});
