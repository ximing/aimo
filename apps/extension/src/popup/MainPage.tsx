import { useState, useEffect } from 'react';
import { getPendingItems, clearPendingItems } from '../storage/index.js';
import type { Config, PendingItem } from '../types/index.js';

interface MainPageProps {
  config: Config;
  onOpenSettings: () => void;
}

export function MainPage({ config, onOpenSettings }: MainPageProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load pending items
  const loadPendingItems = async () => {
    try {
      const items = await getPendingItems();
      setPendingItems(items);
    } catch (error) {
      console.error('Failed to load pending items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingItems();

    // Listen for storage changes
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'session' && changes.aimo_pending_items) {
        setPendingItems(changes.aimo_pending_items.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有待保存内容吗？')) {
      await clearPendingItems();
      setPendingItems([]);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      padding: '16px',
      width: '320px',
      minHeight: '400px',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
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
      backgroundColor: '#3b82f6',
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
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
    },
    userInfo: {
      fontSize: '12px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    },
    settingsButton: {
      padding: '8px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 500,
      marginBottom: '12px',
      color: isDarkMode ? '#d1d5db' : '#374151',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    itemCount: {
      fontSize: '12px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      fontWeight: 'normal',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '12px',
    },
    emptyTitle: {
      fontSize: '14px',
      fontWeight: 500,
      marginBottom: '4px',
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
    emptyText: {
      fontSize: '12px',
      lineHeight: 1.5,
    },
    itemList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxHeight: '280px',
      overflowY: 'auto' as const,
    },
    itemCard: {
      padding: '12px',
      backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    },
    itemIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      flexShrink: 0,
    },
    itemContent: {
      flex: 1,
      minWidth: 0,
    },
    itemText: {
      fontSize: '13px',
      color: isDarkMode ? '#d1d5db' : '#374151',
      lineHeight: 1.4,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
    },
    itemSource: {
      fontSize: '11px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      marginTop: '4px',
    },
    footer: {
      marginTop: '16px',
      paddingTop: '12px',
      borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
      display: 'flex',
      gap: '8px',
    },
    primaryButton: {
      flex: 1,
      padding: '10px 16px',
      fontSize: '13px',
      fontWeight: 500,
      color: '#ffffff',
      backgroundColor: '#3b82f6',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    },
    secondaryButton: {
      flex: 1,
      padding: '10px 16px',
      fontSize: '13px',
      fontWeight: 500,
      color: isDarkMode ? '#d1d5db' : '#374151',
      backgroundColor: isDarkMode ? '#4b5563' : '#f3f4f6',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    },
  };

  // Settings icon SVG
  const SettingsIcon = () => (
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>A</div>
          <div>
            <h1 style={styles.title}>AIMO 知识库</h1>
            <div style={styles.userInfo}>
              {config.username || '已登录'}
            </div>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          style={styles.settingsButton}
          title="设置"
        >
          <SettingsIcon />
        </button>
      </div>

      <div style={styles.sectionTitle}>
        <span>待保存内容</span>
        <span style={styles.itemCount}>
          {pendingItems.length} 项
        </span>
      </div>

      {isLoading ? (
        <div style={styles.emptyState}>加载中...</div>
      ) : pendingItems.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📄</div>
          <div style={styles.emptyTitle}>暂无待保存内容</div>
          <div style={styles.emptyText}>
            在网页上选中文本或点击图片
            <br />
            即可保存到 AIMO
          </div>
        </div>
      ) : (
        <div style={styles.itemList}>
          {pendingItems.map((item) => (
            <div key={item.id} style={styles.itemCard}>
              <div style={styles.itemIcon}>
                {item.type === 'image' ? '🖼️' : '📝'}
              </div>
              <div style={styles.itemContent}>
                <div style={styles.itemText}>
                  {item.type === 'image'
                    ? `[图片] ${truncateText(item.content, 50)}`
                    : truncateText(item.content, 80)}
                </div>
                <div style={styles.itemSource}>
                  {truncateText(item.sourceTitle, 25)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingItems.length > 0 && (
        <div style={styles.footer}>
          <button
            style={styles.primaryButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            保存到 AIMO
          </button>
          <button
            style={styles.secondaryButton}
            onClick={handleClearAll}
          >
            清空
          </button>
        </div>
      )}
    </div>
  );
}
