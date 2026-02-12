import { useState } from 'react';
import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { SettingsMenu } from './components/settings-menu';
import { AccountSettings } from './components/account-settings';
import { ImportData } from './components/import-data';

export type SettingsTab = 'account' | 'import';

export const SettingsPage = view(() => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex justify-center w-full">
        <div className="w-full max-w-[1200px] h-full flex">
          {/* Left Sidebar Menu */}
          <SettingsMenu activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900">
            <div className="px-12 py-8">
              {activeTab === 'account' && <AccountSettings />}
              {activeTab === 'import' && <ImportData />}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});
