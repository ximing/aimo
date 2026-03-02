import { useState, useEffect } from 'react';
import { ContentList } from './ContentList.js';
import { useTheme } from './App.js';
import type { Config } from '../types/index.js';

// AIMO brand colors - matching apps/web
const COLORS = {
  primary: '#22c55e', // primary-500
  primaryHover: '#16a34a', // primary-600
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
};

interface MainPageProps {
  config: Config;
  onOpenSettings: () => void;
  onAuthError?: () => void;
}

// Settings icon SVG component
function SettingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Sun icon for light mode
function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

// Moon icon for dark mode
function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

// Computer icon for system theme
function ComputerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function MainPage({ config, onOpenSettings, onAuthError }: MainPageProps) {
  const { isDarkMode, theme, setTheme } = useTheme();

  const handleThemeToggle = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '16px',
      width: '320px',
      minHeight: '400px',
      backgroundColor: isDarkMode ? COLORS.background.dark : COLORS.background.light,
      color: isDarkMode ? COLORS.text.dark : COLORS.text.light,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: `1px solid ${isDarkMode ? COLORS.border.dark : COLORS.border.light}`,
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    logo: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      backgroundColor: COLORS.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '16px',
    },
    title: {
      fontSize: '16px',
      fontWeight: 600,
      margin: 0,
      color: isDarkMode ? COLORS.text.dark : COLORS.text.light,
    },
    userInfo: {
      fontSize: '12px',
      color: isDarkMode ? COLORS.textSecondary.dark : COLORS.textSecondary.light,
    },
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    actionButton: {
      padding: '8px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      color: isDarkMode ? COLORS.textSecondary.dark : COLORS.textSecondary.light,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.15s, color 0.15s',
    },
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      default:
        return <ComputerIcon />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>A</div>
          <div>
            <h1 style={styles.title}>AIMO 知识库</h1>
            <div style={styles.userInfo}>{config.username || '已登录'}</div>
          </div>
        </div>
        <div style={styles.actions}>
          <button
            type="button"
            onClick={handleThemeToggle}
            style={styles.actionButton}
            title={`当前: ${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}`}
          >
            {getThemeIcon()}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            style={styles.actionButton}
            title="设置"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      <ContentList isDarkMode={isDarkMode} onAuthError={onAuthError} />
    </div>
  );
}
