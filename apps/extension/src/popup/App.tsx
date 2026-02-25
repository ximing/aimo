import { useState, useEffect } from 'react';
import { ConfigPage } from './ConfigPage.js';
import { MainPage } from './MainPage.js';
import { getConfig } from '../storage/index.js';
import type { Config } from '../types/index.js';

type ViewState = 'loading' | 'config' | 'main';

function App() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [config, setConfigState] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configErrorMessage, setConfigErrorMessage] = useState<string | undefined>(undefined);

  // Check if user is already configured on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const savedConfig = await getConfig();
        if (savedConfig?.url && savedConfig?.token) {
          setConfigState(savedConfig);
          setViewState('main');
        } else if (savedConfig?.url && !savedConfig?.token) {
          // Has URL but no token - token expired or logged out
          setConfigErrorMessage('登录已过期，请重新登录');
          setViewState('config');
        } else {
          // No config at all
          setConfigErrorMessage('请先配置服务器地址和登录信息');
          setViewState('config');
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        setError('加载配置失败，请刷新重试');
        setConfigErrorMessage('加载配置失败，请刷新重试');
        setViewState('config');
      }
    };

    checkConfig();
  }, []);

  const handleOpenSettings = () => {
    setConfigErrorMessage(undefined);
    setViewState('config');
  };

  const handleConfigSaved = (newConfig: Config) => {
    setConfigState(newConfig);
    setConfigErrorMessage(undefined);
    setViewState('main');
  };

  // Loading state
  if (viewState === 'loading') {
    return (
      <div
        style={{
          padding: '40px',
          width: '320px',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ fontSize: '14px', color: '#6b7280' }}>加载中...</div>
        {error && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#ef4444' }}>{error}</div>
        )}
      </div>
    );
  }

  // Config/login view
  if (viewState === 'config') {
    return (
      <ConfigPage onConfigSaved={handleConfigSaved} initialErrorMessage={configErrorMessage} />
    );
  }

  // Main view with content list
  if (viewState === 'main' && config) {
    return (
      <MainPage
        config={config}
        onOpenSettings={handleOpenSettings}
        onAuthError={() => {
          setConfigErrorMessage('登录已过期，请重新登录');
          setViewState('config');
        }}
      />
    );
  }

  // Fallback - should not happen
  return (
    <div
      style={{
        padding: '40px',
        width: '320px',
        textAlign: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ fontSize: '14px', color: '#ef4444' }}>发生错误，请刷新重试</div>
    </div>
  );
}

export default App;
