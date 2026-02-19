import { useState, useEffect, useCallback } from 'react';
import {
  getPendingItems,
  removePendingItem,
  updatePendingItem,
  clearPendingItems,
} from '../storage/index.js';
import { ContentItem } from './ContentItem.js';
import type { PendingItem } from '../types/index.js';

interface ContentListProps {
  isDarkMode: boolean;
}

export function ContentList({ isDarkMode }: ContentListProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load pending items
  const loadPendingItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await getPendingItems();
      setPendingItems(items);
    } catch (error) {
      console.error('Failed to load pending items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load pending items on mount
  useEffect(() => {
    loadPendingItems();

    // Listen for storage changes
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'session' && changes.aimo_pending_items) {
        const newItems = changes.aimo_pending_items.newValue || [];
        setPendingItems(newItems);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [loadPendingItems]);

  const handleDelete = async (id: string) => {
    try {
      await removePendingItem(id);
      const updatedItems = pendingItems.filter((item) => item.id !== id);
      setPendingItems(updatedItems);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleUpdate = async (id: string, newContent: string) => {
    try {
      const updatedItem = await updatePendingItem(id, { content: newContent });
      if (updatedItem) {
        const updatedItems = pendingItems.map((item) =>
          item.id === id ? updatedItem : item
        );
        setPendingItems(updatedItems);
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleClearAll = async () => {
    if (confirm('确定要清空所有待保存内容吗？')) {
      try {
        await clearPendingItems();
        setPendingItems([]);
      } catch (error) {
        console.error('Failed to clear items:', error);
      }
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 500,
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
    itemCount: {
      fontSize: '12px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    },
    itemList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxHeight: '280px',
      overflowY: 'auto' as const,
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
      marginBottom: '8px',
      color: isDarkMode ? '#d1d5db' : '#374151',
    },
    emptyText: {
      fontSize: '12px',
      lineHeight: 1.5,
      marginBottom: '16px',
    },
    hintBox: {
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      borderRadius: '8px',
      padding: '12px',
      textAlign: 'left' as const,
    },
    hintTitle: {
      fontSize: '12px',
      fontWeight: 500,
      color: isDarkMode ? '#d1d5db' : '#374151',
      marginBottom: '8px',
    },
    hintList: {
      fontSize: '11px',
      lineHeight: 1.6,
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      margin: 0,
      paddingLeft: '16px',
    },
    hintItem: {
      marginBottom: '4px',
    },
    loadingState: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      fontSize: '14px',
    },
    footer: {
      marginTop: '12px',
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

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>加载中...</div>
      </div>
    );
  }

  if (pendingItems.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>待保存内容</span>
          <span style={styles.itemCount}>0 项</span>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📄</div>
          <div style={styles.emptyTitle}>暂无待保存内容</div>
          <div style={styles.emptyText}>
            在网页上选中文本或点击图片
            <br />
            即可保存到 AIMO
          </div>
          <div style={styles.hintBox}>
            <div style={styles.hintTitle}>快捷操作指引</div>
            <ul style={styles.hintList}>
              <li style={styles.hintItem}>选中网页文本 → 点击浮动工具栏保存</li>
              <li style={styles.hintItem}>点击图片 → 点击浮动工具栏保存</li>
              <li style={styles.hintItem}>在弹窗中可编辑文本、预览图片</li>
              <li style={styles.hintItem}>点击「保存到 AIMO」批量提交</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>待保存内容</span>
        <span style={styles.itemCount}>{pendingItems.length} 项</span>
      </div>

      <div style={styles.itemList}>
        {pendingItems.map((item) => (
          <ContentItem
            key={item.id}
            item={item}
            isDarkMode={isDarkMode}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

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
        <button style={styles.secondaryButton} onClick={handleClearAll}>
          清空
        </button>
      </div>
    </div>
  );
}
