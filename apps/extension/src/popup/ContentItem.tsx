import { useState } from 'react';
import type { PendingItem } from '../types/index.js';

interface ContentItemProps {
  item: PendingItem;
  isDarkMode: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newContent: string) => void;
  onUpload?: (id: string) => void;
  onRetryUpload?: (id: string) => void;
}

// Delete icon SVG component
function DeleteIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// Upload icon SVG component
function UploadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// Retry icon SVG component
function RetryIcon() {
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
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

// Check icon SVG component
function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ContentItem({
  item,
  isDarkMode,
  onDelete,
  onUpdate,
  onUpload,
  onRetryUpload,
}: ContentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedContent, setEditedContent] = useState(item.content);

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() !== item.content) {
      onUpdate(item.id, editedContent.trim());
    }
    setIsExpanded(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(item.content);
    setIsExpanded(false);
  };

  const handleUpload = () => {
    if (item.type === 'image' && onUpload && !item.attachmentId) {
      onUpload(item.id);
    }
  };

  const handleRetry = () => {
    if (item.type === 'image' && onRetryUpload) {
      onRetryUpload(item.id);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    itemCard: {
      padding: '12px',
      backgroundColor: isDarkMode ? '#374151' : '#f9fafb',
      borderRadius: '8px',
      border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    itemHeader: {
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
      cursor: item.type === 'text' ? 'pointer' : 'default',
    },
    itemTextExpanded: {
      fontSize: '13px',
      color: isDarkMode ? '#d1d5db' : '#374151',
      lineHeight: 1.4,
    },
    itemSource: {
      fontSize: '11px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      marginTop: '4px',
    },
    imagePreview: {
      width: '100%',
      maxHeight: '120px',
      objectFit: 'cover' as const,
      borderRadius: '6px',
      cursor: 'pointer',
    },
    imageUrl: {
      fontSize: '11px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    deleteButton: {
      padding: '4px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    editContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    editTextarea: {
      width: '100%',
      minHeight: '80px',
      padding: '8px',
      fontSize: '13px',
      lineHeight: 1.4,
      border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
      borderRadius: '6px',
      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
      color: isDarkMode ? '#f3f4f6' : '#1f2937',
      resize: 'vertical' as const,
      fontFamily: 'inherit',
    },
    editActions: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
    },
    saveButton: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: 500,
      color: '#ffffff',
      backgroundColor: '#22c55e',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    cancelButton: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: 500,
      color: isDarkMode ? '#d1d5db' : '#374151',
      backgroundColor: isDarkMode ? '#4b5563' : '#f3f4f6',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    editHint: {
      fontSize: '11px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
      fontStyle: 'italic',
    },
    // Upload-related styles
    uploadContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '4px',
    },
    uploadButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '8px 12px',
      fontSize: '12px',
      fontWeight: 500,
      color: '#ffffff',
      backgroundColor: '#22c55e',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    },
    uploadButtonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
    },
    progressBarContainer: {
      width: '100%',
      height: '6px',
      backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb',
      borderRadius: '3px',
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: '#22c55e',
      borderRadius: '3px',
      transition: 'width 0.2s ease',
    },
    progressBarComplete: {
      backgroundColor: '#10b981',
    },
    progressBarError: {
      backgroundColor: '#ef4444',
    },
    uploadStatus: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '11px',
      color: isDarkMode ? '#9ca3af' : '#6b7280',
    },
    uploadStatusComplete: {
      color: '#10b981',
    },
    uploadStatusError: {
      color: '#ef4444',
    },
    retryButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      fontSize: '11px',
      fontWeight: 500,
      color: '#ef4444',
      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
      border: `1px solid ${isDarkMode ? '#ef4444' : '#fecaca'}`,
      borderRadius: '4px',
      cursor: 'pointer',
    },
    errorMessage: {
      fontSize: '11px',
      color: '#ef4444',
      marginTop: '4px',
    },
    uploadedBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: '#10b981',
    },
  };

  // Render upload UI for images
  const renderUploadUI = () => {
    const status = item.uploadStatus || 'pending';
    const progress = item.uploadProgress || 0;

    // Uploaded state
    if (item.attachmentId || status === 'uploaded') {
      return (
        <div style={styles.uploadContainer}>
          <div style={styles.uploadStatus}>
            <span style={styles.uploadedBadge}>
              <CheckIcon />
              已上传
            </span>
          </div>
        </div>
      );
    }

    // Error state
    if (status === 'error') {
      return (
        <div style={styles.uploadContainer}>
          <div style={styles.progressBarContainer}>
            <div style={{ ...styles.progressBar, ...styles.progressBarError, width: '100%' }} />
          </div>
          <div style={{ ...styles.uploadStatus, ...styles.uploadStatusError }}>
            <span>上传失败</span>
            <button style={styles.retryButton} onClick={handleRetry}>
              <RetryIcon />
              重试
            </button>
          </div>
          {item.uploadError && <div style={styles.errorMessage}>{item.uploadError}</div>}
        </div>
      );
    }

    // Uploading state
    if (status === 'uploading') {
      return (
        <div style={styles.uploadContainer}>
          <div style={styles.progressBarContainer}>
            <div
              style={{
                ...styles.progressBar,
                ...(progress >= 100 ? styles.progressBarComplete : {}),
                width: `${progress}%`,
              }}
            />
          </div>
          <div style={styles.uploadStatus}>
            <span>{progress >= 100 ? '处理中...' : `上传中 ${Math.round(progress)}%`}</span>
          </div>
        </div>
      );
    }

    // Pending state - show upload button
    return (
      <div style={styles.uploadContainer}>
        <button
          style={styles.uploadButton}
          onClick={handleUpload}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#16a34a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#22c55e';
          }}
        >
          <UploadIcon />
          上传图片到服务器
        </button>
      </div>
    );
  };

  if (item.type === 'image') {
    return (
      <div style={styles.itemCard}>
        <div style={styles.itemHeader}>
          <div style={styles.itemIcon}>🖼️</div>
          <div style={styles.itemContent}>
            <div style={styles.imageUrl}>{truncateText(item.content, 50)}</div>
            <div style={styles.itemSource}>{truncateText(item.sourceTitle, 25)}</div>
          </div>
          <button style={styles.deleteButton} onClick={() => onDelete(item.id)} title="删除">
            <DeleteIcon />
          </button>
        </div>
        <img
          src={item.content}
          alt="预览"
          style={styles.imagePreview}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {renderUploadUI()}
      </div>
    );
  }

  // Text item
  if (isExpanded) {
    return (
      <div style={styles.itemCard}>
        <div style={styles.editContainer}>
          <textarea
            style={styles.editTextarea}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            autoFocus
          />
          <div style={styles.editHint}>编辑内容，点击保存或取消</div>
          <div style={styles.editActions}>
            <button style={styles.cancelButton} onClick={handleCancelEdit}>
              取消
            </button>
            <button style={styles.saveButton} onClick={handleSaveEdit}>
              保存
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.itemCard}>
      <div style={styles.itemHeader}>
        <div style={styles.itemIcon}>📝</div>
        <div style={styles.itemContent}>
          <div style={styles.itemText} onClick={() => setIsExpanded(true)} title="点击编辑">
            {truncateText(item.content, 80)}
          </div>
          <div style={styles.itemSource}>{truncateText(item.sourceTitle, 25)}</div>
        </div>
        <button style={styles.deleteButton} onClick={() => onDelete(item.id)} title="删除">
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}
