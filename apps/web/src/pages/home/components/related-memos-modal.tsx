import { useEffect, useState, useCallback, useRef } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { Fragment } from 'react';
import { X, ArrowRight, Link2, GitBranch, Network, Sparkles } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import InfiniteScroll from 'react-infinite-scroll-component';
import type { MemoListItemDto, MemoListItemWithScoreDto } from '@aimo/dto';
import { MemoService } from '../../../services/memo.service';
import { RelationGraph } from './relation-graph';

interface RelatedMemosModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: MemoListItemDto | null;
  onMemoClick?: (memoId: string) => void;
}

type TabType = 'semantic' | 'forward' | 'backlinks' | 'graph';

const SEMANTIC_PAGE_SIZE = 10;

interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TabData {
  items: MemoListItemWithScoreDto[];
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

const getRelevanceScore = (relevanceScore?: number): number | null => {
  if (typeof relevanceScore !== 'number' || Number.isNaN(relevanceScore)) {
    return null;
  }

  return Math.max(0, Math.min(5, relevanceScore * 5));
};

const RelevanceIndicator = ({ score }: { score: number }) => {
  const normalized = Math.max(0, Math.min(1, score / 5));

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
      <span className="shrink-0">相关度</span>
      <div className="relative h-1.5 w-16 rounded-full bg-gray-200 dark:bg-dark-700">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary-500 dark:bg-primary-400"
          style={{ width: `${normalized * 100}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
        {score.toFixed(1)}
      </span>
    </div>
  );
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
  memo: MemoListItemWithScoreDto;
  index?: number;
  onClick: () => void;
}) => {
  const relevanceScore = getRelevanceScore(memo.relevanceScore);

  return (
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
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(memo.createdAt)}</p>
            {relevanceScore !== null && <RelevanceIndicator score={relevanceScore} />}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
};

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
  const [semanticPagination, setSemanticPagination] = useState<PaginationState>({
    total: 0,
    page: 1,
    limit: SEMANTIC_PAGE_SIZE,
    totalPages: 1,
  });
  const [semanticHasMore, setSemanticHasMore] = useState(false);
  const [forwardData, setForwardData] = useState<TabData>({ items: [], loading: false });
  const [backlinksData, setBacklinksData] = useState<TabData>({ items: [], loading: false });

  // Track which tabs have loaded data to prevent infinite requests when server returns empty
  const loadedTabsRef = useRef<Set<TabType>>(new Set());

  // Load semantic data from API
  const loadSemanticData = useCallback(
    async (page: number = 1) => {
      if (!memo) return;
      setSemanticData((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const result = await memoService.findRelatedMemos(memo.memoId, page, SEMANTIC_PAGE_SIZE);
        if (result.success) {
          const items = result.items || [];
          setSemanticData((prev) => ({
            items: page === 1 ? items : [...prev.items, ...items],
            loading: false,
            error: undefined,
          }));
          const pagination = result.pagination || {
            total: items.length,
            page,
            limit: SEMANTIC_PAGE_SIZE,
            totalPages: 1,
          };
          setSemanticPagination(pagination);
          setSemanticHasMore(pagination.page < pagination.totalPages);
        } else {
          setSemanticData((prev) => ({
            items: page === 1 ? [] : prev.items,
            loading: false,
            error: result.message,
          }));
          setSemanticHasMore(false);
        }
      } catch {
        setSemanticData((prev) => ({
          ...prev,
          loading: false,
          error: '加载失败',
        }));
        setSemanticHasMore(false);
      }
    },
    [memo, memoService]
  );

  const loadMoreSemanticData = useCallback(() => {
    if (semanticData.loading || !semanticHasMore) return;
    loadSemanticData(semanticPagination.page + 1);
  }, [semanticData.loading, semanticHasMore, semanticPagination.page, loadSemanticData]);

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
      setSemanticPagination({
        total: 0,
        page: 1,
        limit: SEMANTIC_PAGE_SIZE,
        totalPages: 1,
      });
      setSemanticHasMore(false);
      setForwardData({ items: [], loading: false });
      setBacklinksData({ items: [], loading: false });
      // Reset loaded tabs tracking
      loadedTabsRef.current.clear();
      loadedTabsRef.current.add('semantic');
      // Load semantic data immediately
      loadSemanticData(1);
    }
  }, [isOpen, memo, loadSemanticData]);

  // Load data when tab changes
  useEffect(() => {
    if (!isOpen || !memo) return;

    // Prevent duplicate requests using ref tracking (handles empty server responses)
    if (loadedTabsRef.current.has(activeTab)) return;

    switch (activeTab) {
      case 'semantic':
        if (!semanticData.loading) {
          loadedTabsRef.current.add('semantic');
          loadSemanticData(1);
        }
        break;
      case 'forward':
        if (!forwardData.loading) {
          loadedTabsRef.current.add('forward');
          loadForwardData();
        }
        break;
      case 'backlinks':
        if (!backlinksData.loading) {
          loadedTabsRef.current.add('backlinks');
          loadBacklinksData();
        }
        break;
    }
  }, [
    activeTab,
    isOpen,
    memo,
    semanticData.loading,
    forwardData.loading,
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

  const semanticTotal = semanticPagination.total || semanticData.items.length;

  const tabs = [
    { id: 'semantic' as TabType, label: '语义相关', icon: Sparkles, count: semanticTotal },
    { id: 'forward' as TabType, label: '关联了', icon: Link2, count: forwardData.items.length },
    { id: 'backlinks' as TabType, label: '被关联', icon: GitBranch, count: backlinksData.items.length },
    { id: 'graph' as TabType, label: '关联图谱', icon: Network, count: undefined },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'semantic':
        if (semanticData.loading && semanticData.items.length === 0) return <LoadingState />;
        if (semanticData.error && semanticData.items.length === 0) {
          return <EmptyState message={semanticData.error} icon={Sparkles} />;
        }
        if (semanticData.items.length === 0) {
          return <EmptyState message="暂无语义相关的笔记" icon={Sparkles} />;
        }
        return (
          <InfiniteScroll
            dataLength={semanticData.items.length}
            next={loadMoreSemanticData}
            hasMore={semanticHasMore}
            loader={
              <div className="pt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  已加载 {semanticData.items.length}/{semanticPagination.total || semanticData.items.length}
                </p>
              </div>
            }
            endMessage={
              semanticPagination.total > 0 && (
                <div className="pt-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    已全部加载 ({semanticPagination.total} 条)
                  </p>
                </div>
              )
            }
            scrollableTarget="related-memos-scroll"
          >
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
          </InfiniteScroll>
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
        if (!memo) return null;
        return (
          <div className="h-[400px] w-full">
            <RelationGraph
              centerMemo={memo}
              forwardMemos={forwardData.items}
              backlinkMemos={backlinksData.items}
              onNodeClick={handleMemoClick}
            />
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
                    <div
                      id="related-memos-scroll"
                      className="min-h-[300px] max-h-[50vh] overflow-y-auto"
                    >
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
