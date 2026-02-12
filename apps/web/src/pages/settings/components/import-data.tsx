import { FileUp, AlertCircle } from 'lucide-react';

export const ImportData = () => {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">数据导入</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          从其他平台导入你的笔记和数据
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-full flex items-center justify-center">
            <FileUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              功能开发中
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              数据导入功能即将上线，敬请期待。届时你将能够从多个平台导入笔记数据。
            </p>
          </div>

          <div className="mt-6 flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                即将支持的格式
              </p>
              <ul className="mt-1 text-xs text-blue-800 dark:text-blue-300 space-y-0.5">
                <li>• Markdown 文件 (.md)</li>
                <li>• JSON 格式数据</li>
                <li>• 其他笔记应用导出格式</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
