import { useState, useEffect, createContext, useContext } from 'react';
import { ConfigPage } from './ConfigPage.js';
import { MainPage } from './MainPage.js';
import { getConfig, getSettings } from '../storage/index.js';
import type { Config } from '../types/index.js';

type ViewState = 'loading' | 'config' | 'main';

// Theme context
interface ThemeContextType {
  isDarkMode: boolean;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  theme: 'system',
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// AIMO brand colors - matching apps/web
const COLORS = {
  primary: '#22c55e', // primary-500
  primaryHover: '#16a34a', // primary-600
  primaryActive: '#15803d', // primary-700
  background: {
    light: '#ffffff',
    dark: '#1a1a1a', // dark-900
  },
  surface: {
    light: '#f9fafb',
    dark: '#2a2a2a', // dark-800
  },
  text: {
    light: '#1f2937',
    dark: '#f3f4f6',
  },
  textSecondary: {
    light: '#6b7280',
    dark: '#9ca3af',
  },
  border: {
    light: '#e5e7eb',
    dark: '#374151',
  },
  shadow: {
    light: '0 4px 12px rgba(0, 0, 0, 0.1)',
    dark: '0 4px 12px rgba(0, 0, 0, 0.4)',
  },
};

function App() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [config, setConfigState] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configErrorMessage, setConfigErrorMessage] = useState<string | undefined>(undefined);

  // Theme state
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Calculate actual dark mode based on theme setting
  const isDarkMode =
    theme === 'dark' || (theme === 'system' && systemPrefersDark);

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from settings
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await getSettings();
        if (settings.theme) {
          setThemeState(settings.theme);
        }
      } catch (err) {
        console.error('Failed to load theme settings:', err);
      }
    };
    loadTheme();
  }, []);

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

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    try {
      const settings = await getSettings();
      await import('../storage/index.js').then((storage) =>
        storage.setSettings({ ...settings, theme: newTheme })
      );
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  };

  // Common styles
  const containerStyle: React.CSSProperties = {
    backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light,
    color: isDarkMode ? COLORS.text.dark : COLORS.text.light,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minHeight: '400px',
    width: '320px',
  };

  const themeContextValue: ThemeContextType = {
    isDarkMode,
    theme,
    setTheme: handleThemeChange,
  };

  // Loading state
  if (viewState === 'loading') {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <div style={{ ...containerStyle, padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: COLORS.textSecondary.light }}>
            加载中...
          </div>
          {error && (
            <div
              style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </ThemeContext.Provider>
    );
  }

  // Config/login view
  if (viewState === 'config') {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <ConfigPage
          onConfigSaved={handleConfigSaved}
          initialErrorMessage={configErrorMessage}
        />
      </ThemeContext.Provider>
    );
  }

  // Main view with content list
  if (viewState === 'main' && config) {
    return (
      <ThemeContext.Provider value={themeContextValue}>
        <MainPage
          config={config}
          onOpenSettings={handleOpenSettings}
          onAuthError={() => {
            setConfigErrorMessage('登录已过期，请重新登录');
            setViewState('config');
          }}
        />
      </ThemeContext.Provider>
    );
  }

  // Fallback - should not happen
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <div style={{ ...containerStyle, padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#ef4444' }}>
          发生错误，请刷新重试
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export default App;
