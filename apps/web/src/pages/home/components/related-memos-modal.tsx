import { useEffect, useState, useCallback } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment } from 'react';
import { X, ArrowRight, Link2, GitBranch, Network, Sparkles } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import type { MemoListItemDto } from '@aimo/dto';
import { MemoService } from '../../../services/memo.service';

interface RelatedMemosModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: MemoListItemDto | null;
  onMemoClick?: (memoId: string) => void;
}

type TabType = 'semantic' | 'forward' | 'backlinks' | 'graph';

interface TabData {
  items: MemoListItemDto[];
  loading: boolean;
  error?: string;
}

// Extract plain text without markdown syntax
const extractPlainText = (content: string, maxLength = 100): string => {
  const withoutImages = content.replace(/!\[.*?\]\((.*?)\)/g, '');
  const withoutLinks = withoutImages.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  const plainText = withoutLinks
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1');

  return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText;
};

const formatDate = (timestamp: number) => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  const d = new Date(timestamp);
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EmptyState = ({ message, icon: Icon }: { message: string; icon: React.ElementType }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
  </div>
);

const MemoListItem = ({
  memo,
  index,
  onClick,
}: {
  memo: MemoListItemDto;
  index?: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-700/50 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-gray-50 dark:hover:bg-dark-700 transition-all duration-200 cursor-pointer group"
  >
    <div className="flex items-start gap-3">
      {index !== undefined && (
        <div className="flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5 w-5">
          {index + 1}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-relaxed line-clamp-3">
          {extractPlainText(memo.content, 200)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {formatDate(memo.createdAt)}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </button>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-3"></div>
    <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
  </div>
);

export const RelatedMemosModal = view(({ isOpen, onClose, memo, onMemoClick }: RelatedMemosModalProps) => {
  const memoService = useService(MemoService);
  const [activeTab, setActiveTab] = useState<TabType>('semantic');

  const [semanticData, setSemanticData] = useState<TabData>({ items: [], loading: false });
  const [forwardData, setForwardData] = useState<TabData>({ items: [], loading: false });
  const [backlinksData, setBacklinksData] = useState<TabData>({ items: [], loading: false });

  // Load semantic data from API
  const loadSemanticData = useCallback(async () => {
    if (!memo) return;
    setSemanticData((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const result = await memoService.findRelatedMemos(memo.memoId, 10);
      if (result.success) {
        setSemanticData({ items: result.items || [], loading: false });
      } else {
        setSemanticData({ items: [], loading: false, error: result.message });
      }
    } catch {
      setSemanticData({ items: [], loading: false, error: '加载失败' });
    }
  }, [memo, memoService]);

  // Load forward relations from memo.relations
  const loadForwardData = useCallback(async () => {
    if (!memo) return;
    setForwardData((prev) => ({ ...prev, loading: true, error: undefined }));
    // Forward relations are already in memo.relations
    const relations = memo.relations || [];
    // Simulate a small delay for consistent UX
    await new Promise((resolve) => setTimeout(resolve, 100));
    setForwardData({ items: relations, loading: false });
  }, [memo]);

  // Load backlinks from API
  const loadBacklinksData = useCallback(async () => {
    if (!memo) return;
    setBacklinksData((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const result = await memoService.getBacklinks(memo.memoId, 1, 20);
      if (result.success) {
        setBacklinksData({ items: result.items || [], loading: false });
      } else {
        setBacklinksData({ items: [], loading: false, error: result.message });
      }
    } catch {
      setBacklinksData({ items: [], loading: false, error: '加载失败' });
    }
  }, [memo, memoService]);

  // Reset data when modal opens/closes
  useEffect(() => {
    if (isOpen && memo) {
      setActiveTab('semantic');
      setSemanticData({ items: [], loading: false });
      setForwardData({ items: [], loading: false });
      setBacklinksData({ items: [], loading: false });
      // Load semantic data immediately
      loadSemanticData();
    }
  }, [isOpen, memo, loadSemanticData]);

  // Load data when tab changes
  useEffect(() => {
    if (!isOpen || !memo) return;

    switch (activeTab) {
      case 'semantic':
        if (semanticData.items.length === 0 && !semanticData.loading) {
          loadSemanticData();
        }
        break;
      case 'forward':
        if (forwardData.items.length === 0 && !forwardData.loading) {
          loadForwardData();
        }
        break;
      case 'backlinks':
        if (backlinksData.items.length === 0 && !backlinksData.loading) {
          loadBacklinksData();
        }
        break;
    }
  }, [
    activeTab,
    isOpen,
    memo,
    semanticData.items.length,
    semanticData.loading,
    forwardData.items.length,
    forwardData.loading,
    backlinksData.items.length,
    backlinksData.loading,
    loadSemanticData,
    loadForwardData,
    loadBacklinksData,
  ]);

  const handleMemoClick = (memoId: string) => {
    if (onMemoClick) {
      onMemoClick(memoId);
      onClose();
    }
  };

  const tabs = [
    { id: 'semantic' as TabType, label: '语义相关', icon: Sparkles, count: semanticData.items.length },
    { id: 'forward' as TabType, label: '关联了', icon: Link2, count: forwardData.items.length },
    { id: 'backlinks' as TabType, label: '被关联', icon: GitBranch, count: backlinksData.items.length },
    { id: 'graph' as TabType, label: '关联图谱', icon: Network, count: undefined },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'semantic':
        if (semanticData.loading) return <LoadingState />;
        if (semanticData.items.length === 0) {
          return <EmptyState message="暂无语义相关的笔记" icon={Sparkles} />;
        }
        return (
          <div className="space-y-2">
            {semanticData.items.map((item, index) => (
              <MemoListItem
                key={item.memoId}
                memo={item}
                index={index}
                onClick={() => handleMemoClick(item.memoId)}
              />
            ))}
          </div>
        );

      case 'forward':
        if (forwardData.loading) return <LoadingState />;
        if (forwardData.items.length === 0) {
          return <EmptyState message="此笔记没有主动关联其他笔记" icon={Link2} />;
        }
        return (
          <div className="space-y-2">
            {forwardData.items.map((item) => (
              <MemoListItem key={item.memoId} memo={item} onClick={() => handleMemoClick(item.memoId)} />
            ))}
          </div>
        );

      case 'backlinks':
        if (backlinksData.loading) return <LoadingState />;
        if (backlinksData.items.length === 0) {
          return <EmptyState message="暂无笔记引用此笔记" icon={GitBranch} />;
        }
        return (
          <div className="space-y-2">
            {backlinksData.items.map((item) => (
              <MemoListItem key={item.memoId} memo={item} onClick={() => handleMemoClick(item.memoId)} />
            ))}
          </div>
        );

      case 'graph':
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
              <Network className="w-8 h-8 text-primary-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">关联图谱</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              可视化展示笔记间的关联关系
              <br />
              <span className="text-xs text-gray-400">（即将推出）</span>
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-40" />
        </Transition.Child>

        {/* Modal content */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-white dark:bg-dark-800 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-white">
                      笔记关联
                    </Dialog.Title>
                    {memo && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {extractPlainText(memo.content, 60)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <Tab.Group selectedIndex={tabs.findIndex((t) => t.id === activeTab)} onChange={(index) => setActiveTab(tabs[index].id)}>
                  <Tab.List className="flex border-b border-gray-200 dark:border-dark-700 px-6">
                    {tabs.map((tab) => (
                      <Tab
                        key={tab.id}
                        className={({ selected }) =>
                          `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                            selected
                              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`
                        }
                      >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && tab.count > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300">
                            {tab.count}
                          </span>
                        )}
                      </Tab>
                    ))}
                  </Tab.List>

                  <Tab.Panels className="p-6">
                    <div className="min-h-[300px] max-h-[50vh] overflow-y-auto">
                      {renderTabContent()}
                    </div>
                  </Tab.Panels>
                </Tab.Group>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-dark-700 px-6 py-3 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  >
                    关闭
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
});
