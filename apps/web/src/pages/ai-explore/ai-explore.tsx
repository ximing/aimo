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
} from 'lucide-react';
import {
  SourceCard,
  MarkdownWithCitations,
  MemoDetailModal,
  RelationshipGraph,
} from './components';

/**
 * AI Explore Page - Chat interface for AI-powered knowledge exploration
 * Features:
 * - Scrollable message history
 * - Multi-line text input with Enter to send
 * - Markdown rendering for AI responses
 * - Source citations and suggested questions
 * - Empty state with helpful prompts
 */
export const AIExplorePage = view(() => {
  const exploreService = useService(ExploreService);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // State for memo detail modal
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // State for relationship graph
  const [showRelationshipGraph, setShowRelationshipGraph] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [exploreService.messages, exploreService.loading]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
  const handleNewConversation = useCallback(() => {
    if (confirm('确定要新建话题吗？当前对话历史将被清空。')) {
      exploreService.newConversation();
      setInputValue('');
      inputRef.current?.focus();
    }
  }, [exploreService]);

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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                AI 探索
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                基于你的笔记智能回答
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Conversation info */}
            {exploreService.messages.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                第 {exploreService.currentRound}/10 轮
              </span>
            )}

            {/* New conversation button */}
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              title="新建话题"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建话题</span>
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900">
          {exploreService.messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center px-6 py-12">
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
                      onClick={() => handleSuggestedQuestion(suggestion)}
                      className="p-4 text-left bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {suggestion}
                      </p>
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
              </div>
            </div>
          ) : (
            /* Message List */
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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
                              {/* Show graph button for sources */}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div
              className={`relative flex items-end gap-2 p-2 rounded-2xl border transition-all ${
                isInputFocused
                  ? 'border-primary-500 ring-2 ring-primary-500/20'
                  : 'border-gray-300 dark:border-dark-600'
              } bg-white dark:bg-dark-900`}
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
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400 dark:text-gray-600">
              <span>AI 基于你的笔记内容回答</span>
              <span>{inputValue.length > 0 && `${inputValue.length} 字符`}</span>
            </div>
          </div>
        </div>
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
    </Layout>
  );
});
