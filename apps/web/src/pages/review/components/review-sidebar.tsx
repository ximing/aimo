import { observer, useService } from '@rabjs/react';
import { BrainCircuit, Plus, Play, Trash2, Clock } from 'lucide-react';
import { ReviewService } from '../review.service';
import { formatRelativeTime } from './utils';


const ReviewSidebarContent = () => {
  const service = useService(ReviewService);

  const scopeLabels: Record<string, string> = {
    all: '全部笔记',
    category: '按分类',
    tag: '按标签',
    recent: '最近 N 天',
  };

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 flex flex-col overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50">回顾模式</h1>
          </div>
          <button
            onClick={() => service.openNewProfile()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            title="新建模式"
          >
            <Plus className="w-4 h-4" />
            <span>新建模式</span>
          </button>
        </div>
      </div>

      {/* Profile List */}
      <div className="overflow-y-auto border-b border-gray-200 dark:border-dark-700">
        {service.profiles.length === 0 ? (
          <div className="p-8 text-center">
            <BrainCircuit className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无保存的模式</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">点击上方 + 创建回顾模式</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {service.profiles.map((profile) => (
              <div
                key={profile.profileId}
                className={`relative group rounded-lg transition-colors cursor-pointer ${
                  service.detailMode === profile.profileId
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-700 border border-transparent'
                }`}
                onClick={() => service.openProfile(profile)}
              >
                <div className="p-3">
                  <p
                    className={`text-sm font-medium truncate ${
                      service.detailMode === profile.profileId
                        ? 'text-primary-700 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {profile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {profile.filterRules?.length > 0
                      ? `${profile.filterRules.length}条规则`
                      : '全部笔记'}{' '}
                    · {profile.questionCount}题
                  </p>
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      service.startWithProfile(profile.profileId);
                    }}
                    className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded"
                    title="开始"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      service.deleteProfile(profile.profileId);
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-dark-700">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {service.historyLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 dark:bg-dark-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : service.history.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无回顾历史</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">开始一次回顾来创建记录</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {service.history.map((item) => (
              <div
                key={item.sessionId}
                className={`relative group rounded-lg transition-colors cursor-pointer ${
                  service.selectedHistorySession === item.sessionId
                    ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-700 border border-transparent'
                }`}
                onClick={() => service.selectHistorySession(item.sessionId)}
              >
                <div className="p-3">
                  <p
                    className={`text-sm font-medium truncate ${
                      service.selectedHistorySession === item.sessionId
                        ? 'text-primary-700 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {scopeLabels[item.scope]}
                    {item.scopeValue ? ` - ${item.scopeValue}` : ''}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    {item.score !== undefined && (
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        {item.score}分
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export const ReviewSidebar = observer(ReviewSidebarContent);
