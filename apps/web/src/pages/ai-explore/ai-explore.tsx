import { useRef, useEffect, useState, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { ExploreService } from '../../services/explore.service';
import {
  Sparkles,
  Send,
  Loader2,
  Plus,
  AlertCircle,
  MessageSquare,
  BookOpen,
  GitBranch,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  SourceCard,
  MarkdownWithCitations,
  MemoDetailModal,
  RelationshipGraph,
} from './components';

/**
 * Format relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
};

/**
 * AI Explore Page - Chat interface for AI-powered knowledge exploration
 * Features:
 * - Left sidebar with conversation history
 * - Scrollable message history
 * - Floating multi-line text input
 * - Markdown rendering for AI responses
 * - Source citations and suggested questions
 * - Empty state with helpful prompts
 */
export const AIExplorePage = view(() => {
  const exploreService = useService(ExploreService);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // State for memo detail modal
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State for relationship graph
  const [showRelationshipGraph, setShowRelationshipGraph] = useState(false);

  // State for conversation management
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exploreService.messages, exploreService.loading]);

  // Auto-focus input on mount when a conversation is selected
  useEffect(() => {
    if (exploreService.currentConversationId) {
      inputRef.current?.focus();
    }
  }, [exploreService.currentConversationId]);

  // Handle input submission
  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || exploreService.loading) return;

    setInputValue('');
    await exploreService.sendQuery(trimmed);
  }, [inputValue, exploreService]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Handle suggested question click
  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      setInputValue(question);
      inputRef.current?.focus();
    },
    [setInputValue]
  );

  // Handle source memo click - opens detail modal
  const handleSourceClick = useCallback((memoId: string) => {
    setSelectedMemoId(memoId);
    setIsDetailModalOpen(true);
  }, []);

  // Handle showing relationship graph for a source
  const handleShowGraph = useCallback(
    async (memoId: string) => {
      setShowRelationshipGraph(true);
      await exploreService.loadRelationshipGraph(memoId);
    },
    [exploreService]
  );

  // Handle closing relationship graph
  const handleCloseGraph = useCallback(() => {
    setShowRelationshipGraph(false);
    exploreService.clearRelationshipGraph();
  }, [exploreService]);

  // Handle explore related topic
  const handleExploreRelated = useCallback(
    (topic: string) => {
      setInputValue(topic);
      handleCloseGraph();
      inputRef.current?.focus();
    },
    [handleCloseGraph]
  );

  // Close detail modal
  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setSelectedMemoId(null);
  }, []);

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    const newId = await exploreService.newConversation();
    if (newId) {
      setInputValue('');
      inputRef.current?.focus();
    } else if (exploreService.error) {
      // Show error toast or alert when conversation creation fails
      console.error('Failed to create conversation:', exploreService.error);
    }
  }, [exploreService]);

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      await exploreService.selectConversation(conversationId);
    },
    [exploreService]
  );

  // Handle opening rename modal
  const handleOpenRename = useCallback((conversationId: string, currentTitle: string) => {
    setEditingConversationId(conversationId);
    setEditingTitle(currentTitle);
    setIsRenameModalOpen(true);
    setActiveMenuId(null);
  }, []);

  // Handle rename submission
  const handleRenameSubmit = useCallback(async () => {
    if (!editingConversationId || !editingTitle.trim()) return;

    const success = await exploreService.renameConversation(
      editingConversationId,
      editingTitle.trim()
    );

    if (success) {
      setIsRenameModalOpen(false);
      setEditingConversationId(null);
      setEditingTitle('');
    }
  }, [editingConversationId, editingTitle, exploreService]);

  // Handle opening delete modal
  const handleOpenDelete = useCallback((conversationId: string) => {
    setEditingConversationId(conversationId);
    setIsDeleteModalOpen(true);
    setActiveMenuId(null);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!editingConversationId) return;

    const success = await exploreService.deleteConversation(editingConversationId);

    if (success) {
      setIsDeleteModalOpen(false);
      setEditingConversationId(null);
    }
  }, [editingConversationId, exploreService]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Empty state suggestions
  const emptySuggestions = [
    '总结一下我最近记录的重点内容',
    '帮我找一下关于项目的笔记',
    '上周我记录了哪些重要事项？',
    '我有哪些笔记提到了会议？',
  ];

  return (
    <Layout>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Sidebar - 280px fixed width */}
        <aside
          ref={sidebarRef}
          className="w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 flex flex-col"
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            {/* Title and New Topic Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50">AI 探索</h1>
              </div>
              <button
                onClick={handleNewConversation}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                title="新建话题"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {exploreService.conversationsLoading ? (
              /* Loading State */
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 dark:bg-dark-700 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : exploreService.conversations.length === 0 ? (
              /* Empty State */
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无对话</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  点击上方 + 按钮开始新对话
                </p>
              </div>
            ) : (
              /* Conversation Items */
              <div className="p-2 space-y-1">
                {exploreService.conversations.map((conversation) => (
                  <div
                    key={conversation.conversationId}
                    className={`relative group rounded-lg transition-colors ${
                      exploreService.currentConversationId === conversation.conversationId
                        ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                        : 'hover:bg-gray-100 dark:hover:bg-dark-700 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectConversation(conversation.conversationId)}
                      className="w-full text-left p-3"
                    >
                      <p
                        className={`text-sm font-medium truncate ${
                          exploreService.currentConversationId === conversation.conversationId
                            ? 'text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {conversation.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(conversation.updatedAt)}
                        </span>
                      </div>
                    </button>

                    {/* Hover Menu Button */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(
                              activeMenuId === conversation.conversationId
                                ? null
                                : conversation.conversationId
                            );
                          }}
                          className="p-1.5 rounded-md hover:bg-white dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === conversation.conversationId && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 py-1 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRename(conversation.conversationId, conversation.title);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                                重命名
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDelete(conversation.conversationId);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                删除
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-dark-900">
          {exploreService.currentConversationId ? (
            <>
              {/* Messages Area - scrollable */}
              <div className="flex-1 overflow-y-auto pb-32">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                  {exploreService.messages.length === 0 ? (
                    /* Welcome State for New Conversation */
                    <div className="h-full flex flex-col items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">
                          新对话
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          输入你的问题开始探索笔记
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Message List */
                    <>
                      {exploreService.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-4 ${
                            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          {/* Avatar */}
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                              message.role === 'user'
                                ? 'bg-primary-100 dark:bg-primary-900/30'
                                : 'bg-gradient-to-br from-primary-500 to-primary-600'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                                我
                              </span>
                            ) : (
                              <Sparkles className="w-4 h-4 text-white" />
                            )}
                          </div>

                          {/* Content */}
                          <div
                            className={`flex-1 max-w-[85%] ${
                              message.role === 'user' ? 'text-right' : 'text-left'
                            }`}
                          >
                            {/* Message Bubble */}
                            <div
                              className={`inline-block text-left px-4 py-3 rounded-2xl ${
                                message.role === 'user'
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-900 dark:text-gray-50'
                              }`}
                            >
                              {message.role === 'user' ? (
                                <p className="whitespace-pre-wrap">{message.content}</p>
                              ) : (
                                <MarkdownWithCitations
                                  content={message.content}
                                  sources={message.sources || []}
                                  onCitationClick={handleSourceClick}
                                />
                              )}
                            </div>

                            {/* Metadata */}
                            <div className="mt-1 px-1">
                              <span className="text-xs text-gray-400 dark:text-gray-600">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>

                            {/* Sources (AI messages only) */}
                            {message.role === 'assistant' && (
                              <div className="mt-4">
                                {message.sources && message.sources.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        引用来源
                                      </p>
                                      <button
                                        onClick={() =>
                                          handleShowGraph(message.sources?.[0]?.memoId || '')
                                        }
                                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                                      >
                                        <GitBranch className="w-3 h-3" />
                                        查看关系图谱
                                      </button>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                      {message.sources.map((source, index) => (
                                        <SourceCard
                                          key={source.memoId}
                                          source={source}
                                          index={index}
                                          onClick={handleSourceClick}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="px-1">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                      未找到相关笔记
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Suggested Questions (AI messages only) */}
                            {message.role === 'assistant' &&
                              message.suggestedQuestions &&
                              message.suggestedQuestions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {message.suggestedQuestions.map((question, index) => (
                                    <button
                                      key={index}
                                      onClick={() => handleSuggestedQuestion(question)}
                                      className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                                    >
                                      {question}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      ))}

                      {/* Loading Indicator */}
                      {exploreService.loading && (
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">AI 正在思考...</span>
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {exploreService.error && (
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <div className="inline-block px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-400 text-sm">
                              {exploreService.error}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Conversation Limit Warning */}
                      {exploreService.isConversationLimitReached && (
                        <div className="flex justify-center">
                          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                            已达到对话轮数上限，请
                            <button
                              onClick={handleNewConversation}
                              className="underline hover:no-underline ml-1"
                            >
                              新建话题
                            </button>
                            继续
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Floating Input Area - Fixed at bottom */}
              <div className="fixed bottom-0 right-0 left-[350px] p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-dark-900 dark:via-dark-900 dark:to-transparent">
                <div className="max-w-3xl mx-auto">
                  <div
                    className={`relative flex items-end gap-2 p-3 rounded-2xl border shadow-lg transition-all bg-white dark:bg-dark-800 ${
                      isInputFocused
                        ? 'border-primary-500 ring-2 ring-primary-500/20'
                        : 'border-gray-200 dark:border-dark-600'
                    }`}
                  >
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder={
                        exploreService.isConversationLimitReached
                          ? '已达到对话轮数上限，请新建话题'
                          : '输入你的问题，按 Enter 发送，Shift+Enter 换行...'
                      }
                      disabled={exploreService.loading || exploreService.isConversationLimitReached}
                      rows={Math.min(5, Math.max(1, inputValue.split('\n').length))}
                      className="flex-1 px-3 py-2 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-gray-900 dark:text-gray-50 placeholder:text-gray-400 dark:placeholder:text-gray-600 disabled:opacity-50"
                      style={{ minHeight: '24px', maxHeight: '120px' }}
                    />

                    <button
                      onClick={handleSubmit}
                      disabled={
                        !inputValue.trim() ||
                        exploreService.loading ||
                        exploreService.isConversationLimitReached
                      }
                      className="flex-shrink-0 p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="发送"
                    >
                      {exploreService.loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Input hints */}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-600 px-1">
                    <span>AI 基于你的笔记内容回答</span>
                    <span>{inputValue.length > 0 && `${inputValue.length} 字符`}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* No Conversation Selected - Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
              <div className="max-w-2xl w-full text-center space-y-8">
                {/* Welcome */}
                <div className="space-y-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                    有什么可以帮你的？
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    基于你的笔记内容，AI 可以帮你总结、搜索和发现知识关联
                  </p>
                </div>

                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {emptySuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        handleNewConversation().then(() => {
                          setTimeout(() => handleSuggestedQuestion(suggestion), 100);
                        });
                      }}
                      className="p-4 text-left bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</p>
                    </button>
                  ))}
                </div>

                {/* Tips */}
                <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-500">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>基于你的笔记</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>支持多轮对话</span>
                  </div>
                </div>

                {/* New Conversation Button */}
                <button
                  onClick={handleNewConversation}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>开始新对话</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Relationship Graph Modal */}
      {showRelationshipGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full">
            {exploreService.relationshipGraphLoading ? (
              <div className="bg-white dark:bg-dark-800 rounded-xl p-8 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">加载关系图谱...</p>
              </div>
            ) : exploreService.relationshipGraphError ? (
              <div className="bg-white dark:bg-dark-800 rounded-xl p-8 text-center">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                <p className="text-gray-900 dark:text-gray-50 mb-2">加载失败</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {exploreService.relationshipGraphError}
                </p>
                <button
                  onClick={handleCloseGraph}
                  className="px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                >
                  关闭
                </button>
              </div>
            ) : exploreService.relationshipGraph ? (
              <RelationshipGraph
                graph={exploreService.relationshipGraph}
                onNodeClick={handleSourceClick}
                onExploreRelated={handleExploreRelated}
                onClose={handleCloseGraph}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Memo Detail Modal */}
      <MemoDetailModal
        memoId={selectedMemoId}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-200 dark:border-dark-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">重命名对话</h3>
              <button
                onClick={() => {
                  setIsRenameModalOpen(false);
                  setEditingConversationId(null);
                  setEditingTitle('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                } else if (e.key === 'Escape') {
                  setIsRenameModalOpen(false);
                  setEditingConversationId(null);
                  setEditingTitle('');
                }
              }}
              placeholder="输入新标题"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-lg text-gray-900 dark:text-gray-50 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              autoFocus
            />

            {exploreService.error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{exploreService.error}</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsRenameModalOpen(false);
                  setEditingConversationId(null);
                  setEditingTitle('');
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRenameSubmit}
                disabled={exploreService.loading || !editingTitle.trim()}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {exploreService.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-dark-800 rounded-xl shadow-lg border border-gray-200 dark:border-dark-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">删除对话</h3>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              确定要删除这个对话吗？此操作不可恢复。
            </p>

            {exploreService.error && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400">{exploreService.error}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setEditingConversationId(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={exploreService.loading}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {exploreService.loading && <Loader2 className="w-4 h-4 animate-spin" />}
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
});
