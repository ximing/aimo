import { useState, useEffect, useCallback } from 'react';
import {
  getPendingItems,
  removePendingItem,
  updatePendingItem,
  clearPendingItems,
} from '../storage/index.js';
import { ContentItem } from './ContentItem.js';
import { downloadAndUploadImage } from '../api/aimo.js';
import type { PendingItem } from '../types/index.js';
import { ApiError } from '../types/index.js';

interface ContentListProps {
  isDarkMode: boolean;
}

export function ContentList({ isDarkMode }: ContentListProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());

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

  const handleUpload = async (id: string) => {
    // Prevent duplicate uploads
    if (uploadingItems.has(id)) return;

    const item = pendingItems.find((i) => i.id === id);
    if (!item || item.type !== 'image') return;

    setUploadingItems((prev) => new Set(prev).add(id));

    // Update status to uploading
    await updatePendingItem(id, {
      uploadStatus: 'uploading',
      uploadProgress: 0,
      uploadError: undefined,
    });

    // Update local state
    setPendingItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, uploadStatus: 'uploading', uploadProgress: 0, uploadError: undefined }
          : i
      )
    );

    try {
      // Download and upload the image with progress callback
      const attachmentId = await downloadAndUploadImage(
        item.content,
        (progress) => {
          // Update progress in storage and local state
          updatePendingItem(id, { uploadProgress: progress });
          setPendingItems((prev) =>
            prev.map((i) =>
              i.id === id ? { ...i, uploadProgress: progress } : i
            )
          );
        }
      );

      // Update status to uploaded with attachment ID
      await updatePendingItem(id, {
        uploadStatus: 'uploaded',
        uploadProgress: 100,
        attachmentId,
      });

      // Update local state
      setPendingItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, uploadStatus: 'uploaded', uploadProgress: 100, attachmentId }
            : i
        )
      );
    } catch (error) {
      console.error('Failed to upload image:', error);

      // Get error message
      let errorMessage = '上传失败，请重试';
      if (error instanceof ApiError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Update status to error
      await updatePendingItem(id, {
        uploadStatus: 'error',
        uploadError: errorMessage,
      });

      // Update local state
      setPendingItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, uploadStatus: 'error', uploadError: errorMessage }
            : i
        )
      );
    } finally {
      setUploadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleRetryUpload = async (id: string) => {
    // Reset error state and try again
    await updatePendingItem(id, {
      uploadStatus: 'pending',
      uploadError: undefined,
      uploadProgress: 0,
    });

    setPendingItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, uploadStatus: 'pending', uploadError: undefined, uploadProgress: 0 }
          : i
      )
    );

    // Start upload
    handleUpload(id);
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
            onUpload={handleUpload}
            onRetryUpload={handleRetryUpload}
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
