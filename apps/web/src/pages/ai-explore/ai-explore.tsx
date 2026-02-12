import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { Sparkles, Lightbulb } from 'lucide-react';

export const AIExplorePage = view(() => {
  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex items-center justify-center w-full">
        <div className="max-w-2xl px-8 text-center">
          <div className="flex flex-col items-center gap-6">
            {/* Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                AI 探索
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                智能助手即将上线，让 AI 帮你更好地管理和发现知识
              </p>
            </div>

            {/* Features Preview */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-6 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">
                      智能问答
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      基于你的笔记内容，AI 可以回答相关问题
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-6 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1">
                      内容生成
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      帮助你扩展想法，生成更丰富的内容
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-primary-600 dark:bg-primary-500 rounded-full animate-pulse" />
                功能开发中
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});
