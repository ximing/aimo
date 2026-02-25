import { useState, useEffect, useCallback } from 'react';
import {
  getPendingItems,
  removePendingItem,
  updatePendingItem,
  clearPendingItems,
} from '../storage/index.js';
import { ContentItem } from './ContentItem.js';
import { downloadAndUploadImage, createMemo } from '../api/aimo.js';
import type { PendingItem } from '../types/index.js';
import { ApiError } from '../types/index.js';

interface ContentListProps {
  isDarkMode: boolean;
  onAuthError?: () => void;
}

export function ContentList({ isDarkMode, onAuthError }: ContentListProps) {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ completed: 0, total: 0 });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

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
        const updatedItems = pendingItems.map((item) => (item.id === id ? updatedItem : item));
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
      const attachmentId = await downloadAndUploadImage(item.content, (progress) => {
        // Update progress in storage and local state
        updatePendingItem(id, { uploadProgress: progress });
        setPendingItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, uploadProgress: progress } : i))
        );
      });

      // Update status to uploaded with attachment ID
      await updatePendingItem(id, {
        uploadStatus: 'uploaded',
        uploadProgress: 100,
        attachmentId,
      });

      // Update local state
      setPendingItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, uploadStatus: 'uploaded', uploadProgress: 100, attachmentId } : i
        )
      );
    } catch (error) {
      console.error('Failed to upload image:', error);

      // Handle token expiration - redirect to login
      if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
        onAuthError?.();
        return;
      }

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
          i.id === id ? { ...i, uploadStatus: 'error', uploadError: errorMessage } : i
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

  const handleRetrySave = () => {
    setSaveError(null);
    handleSaveToAIMO();
  };

  const handleSaveToAIMO = async () => {
    if (pendingItems.length === 0) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveProgress({ completed: 0, total: pendingItems.length });

    const failedItems: PendingItem[] = [];
    let completedCount = 0;

    try {
      for (const item of pendingItems) {
        try {
          // For images, ensure they are uploaded first
          let attachmentIds: string[] | undefined;
          if (item.type === 'image') {
            if (item.attachmentId) {
              // Already uploaded
              attachmentIds = [item.attachmentId];
            } else if (item.uploadStatus === 'error') {
              // Skip items with upload errors
              throw new Error('图片上传失败，请先重试上传');
            } else {
              // Need to upload first
              const newAttachmentId = await downloadAndUploadImage(item.content, (progress) => {
                setPendingItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, uploadProgress: progress } : i))
                );
              });
              attachmentIds = [newAttachmentId];

              // Update the item with the attachment ID
              await updatePendingItem(item.id, {
                attachmentId: newAttachmentId,
                uploadStatus: 'uploaded',
                uploadProgress: 100,
              });
            }
          }

          // Create memo
          await createMemo(item.content, item.sourceUrl, attachmentIds);

          // Remove successfully saved item from storage
          await removePendingItem(item.id);
          completedCount++;
          setSaveProgress({ completed: completedCount, total: pendingItems.length });
        } catch (error) {
          console.error(`Failed to save item ${item.id}:`, error);

          // Handle token expiration - redirect to login
          if (error instanceof ApiError && error.code === 'TOKEN_EXPIRED') {
            setSaveError('登录已过期，请重新登录');
            setIsSaving(false);
            // Call onAuthError to redirect to config page
            onAuthError?.();
            return;
          }

          // Handle config missing
          if (error instanceof ApiError && error.code === 'CONFIG_MISSING') {
            setSaveError('请先配置服务器地址');
            setIsSaving(false);
            onAuthError?.();
            return;
          }

          // Handle token missing
          if (error instanceof ApiError && error.code === 'TOKEN_MISSING') {
            setSaveError('请先登录');
            setIsSaving(false);
            onAuthError?.();
            return;
          }

          // Add to failed items list
          failedItems.push(item);

          // Update item with error status if it's an image
          if (item.type === 'image') {
            await updatePendingItem(item.id, {
              uploadStatus: 'error',
              uploadError: error instanceof ApiError ? error.message : '保存失败',
            });
          }
        }
      }

      // Update local state with remaining (failed) items
      setPendingItems(failedItems);

      if (failedItems.length === 0) {
        // All items saved successfully
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else if (failedItems.length < pendingItems.length) {
        // Partial success
        setSaveError(`部分保存失败：${failedItems.length} 项未能保存`);
      } else {
        // All failed
        setSaveError('保存失败，请检查网络连接后重试');
      }
    } catch (error) {
      console.error('Save to AIMO failed:', error);
      setSaveError('保存过程中发生错误，请重试');
    } finally {
      setIsSaving(false);
      // Notify background to update badge
      chrome.runtime.sendMessage({ type: 'UPDATE_BADGE' });
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
    progressContainer: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
      borderRadius: '8px',
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '8px',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#3b82f6',
      borderRadius: '4px',
      transition: 'width 0.3s ease',
    },
    progressText: {
      fontSize: '12px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      textAlign: 'center' as const,
    },
    errorMessage: {
      marginTop: '12px',
      padding: '10px 12px',
      backgroundColor: isDarkMode ? '#7f1d1d' : '#fef2f2',
      color: isDarkMode ? '#fca5a5' : '#dc2626',
      borderRadius: '6px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
    },
    errorMessageContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flex: 1,
    },
    retryButton: {
      padding: '4px 10px',
      fontSize: '12px',
      fontWeight: 500,
      color: isDarkMode ? '#fca5a5' : '#dc2626',
      backgroundColor: isDarkMode ? '#991b1b' : '#fee2e2',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    successMessage: {
      marginTop: '12px',
      padding: '10px 12px',
      backgroundColor: isDarkMode ? '#14532d' : '#f0fdf4',
      color: isDarkMode ? '#86efac' : '#16a34a',
      borderRadius: '6px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    disabledButton: {
      opacity: 0.6,
      cursor: 'not-allowed',
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
          style={{
            ...styles.primaryButton,
            ...(isSaving ? styles.disabledButton : {}),
          }}
          onClick={handleSaveToAIMO}
          disabled={isSaving}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          {isSaving ? '保存中...' : '保存到 AIMO'}
        </button>
        <button
          style={{
            ...styles.secondaryButton,
            ...(isSaving ? styles.disabledButton : {}),
          }}
          onClick={handleClearAll}
          disabled={isSaving}
        >
          取消
        </button>
      </div>

      {isSaving && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${(saveProgress.completed / saveProgress.total) * 100}%`,
              }}
            />
          </div>
          <div style={styles.progressText}>
            {saveProgress.completed}/{saveProgress.total} 已完成
          </div>
        </div>
      )}

      {saveError && (
        <div style={styles.errorMessage}>
          <div style={styles.errorMessageContent}>
            <span>⚠️</span>
            <span>{saveError}</span>
          </div>
          {!isSaving && (
            <button
              onClick={handleRetrySave}
              style={styles.retryButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#b91c1c' : '#fecaca';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#991b1b' : '#fee2e2';
              }}
            >
              重试
            </button>
          )}
        </div>
      )}

      {showSuccess && (
        <div style={styles.successMessage}>
          <span>✓</span>
          <span>保存成功！所有内容已添加到 AIMO</span>
        </div>
      )}
    </div>
  );
}
