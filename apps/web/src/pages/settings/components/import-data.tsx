import { useState, useEffect } from 'react';
import { useService, bindServices } from '@rabjs/react';
import { FileUp, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { ImportService } from '../../../services/import.service';

export const ImportData = bindServices(() => {
  const importService = useService(ImportService);

  const [isImporting, setIsImporting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  // 强制刷新进度显示
  const [progressRefresh, setProgressRefresh] = useState(0);

  // 定时更新进度显示
  useEffect(() => {
    if (!showProgress || isImporting === false) {
      return;
    }

    const interval = setInterval(() => {
      setProgressRefresh(prev => prev + 1);
    }, 500); // 每500ms更新一次

    return () => clearInterval(interval);
  }, [showProgress, isImporting]);

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setShowProgress(true);  // 立即显示进度
      setImportResult(null);
      importService.resetProgress();

      const result = await importService.import();

      if (result.success) {
        setImportResult({
          success: true,
          message: `成功导入 ${result.stats.successfulMemos} 个备忘录${
            result.stats.failedMemos > 0 ? `，失败 ${result.stats.failedMemos} 个` : ''
          }`,
        });
      } else {
        // 只在真正导入失败时显示失败消息，不包括用户取消的情况
        if (result.stats.status === 'error') {
          setImportResult({
            success: false,
            message: result.stats.errorMessage || '导入失败，请检查文件格式是否正确',
          });
        }
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : '导入过程出错',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // 读取进度（通过 progressRefresh 强制重新计算）
  const progress = importService.importProgress;
  // 通过使用 progressRefresh 确保每次都重新计算
  void progressRefresh;
  const progressPercent =
    progress.totalMemos > 0
      ? Math.round(
          ((progress.processedMemos + progress.successfulMemos) / (progress.totalMemos * 2)) * 100
        )
      : 0;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">数据导入</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          从 Memos 导出的文件夹中导入你的笔记和数据
        </p>
      </div>

      {!showProgress ? (
        // Import Button Section
        <div className="bg-white dark:bg-dark-800 rounded-lg p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-full flex items-center justify-center">
              <FileUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                导入 Memos 笔记
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                选择 Memos 导出的文件夹，包含 memos_export.json
                和相关附件，我们将为你导入所有笔记和附件。
              </p>
            </div>

            <button
              onClick={handleImport}
              disabled={isImporting}
              className="mt-6 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  导入中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FileUp className="w-4 h-4" />
                  选择文件夹开始导入
                </span>
              )}
            </button>

            <div className="mt-6 flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">导入说明</p>
                <ul className="mt-2 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• 在 Memos 应用中导出笔记数据</li>
                  <li>• 选择包含 memos_export.json 的文件夹</li>
                  <li>• 支持笔记内容、附件和笔记关联的导入</li>
                  <li>• 自动跳过重复的笔记内容</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Progress Section
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bg-white dark:bg-dark-800 rounded-lg p-8">
            {/* Status Indicator */}
            <div className="flex items-center gap-3 mb-6">
              {progress.status === 'completed' ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : progress.status === 'error' ? (
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              ) : (
                <Loader className="w-6 h-6 text-primary-600 dark:text-primary-400 animate-spin" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                  {progress.status === 'reading'
                    ? '正在读取文件...'
                    : progress.status === 'importing'
                      ? '正在导入笔记...'
                      : progress.status === 'creating-relations'
                        ? '正在建立关联...'
                        : progress.status === 'completed'
                          ? '导入完成'
                          : '导入失败'}
                </h3>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {progress.status === 'importing'
                    ? `已处理: ${progress.processedMemos}/${progress.totalMemos}`
                    : progress.status === 'creating-relations'
                      ? `已建立关联: ${progress.processedMemos}`
                      : progress.status === 'completed'
                        ? `完成: ${progress.successfulMemos}/${progress.totalMemos}`
                        : '进度'}
                </span>
                <span className="text-gray-600 dark:text-gray-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Current Status */}
            {progress.currentMemoContent && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-500 mb-1">
                  当前处理
                </p>
                <p className="truncate text-gray-700 dark:text-gray-300">
                  {progress.currentMemoContent}...
                </p>
              </div>
            )}

            {/* Stats */}
            {(progress.successfulMemos > 0 || progress.failedMemos > 0) && (
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-200 dark:border-dark-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {progress.successfulMemos}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">成功</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {progress.failedMemos}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">失败</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {progress.totalMemos}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">总数</p>
                </div>
              </div>
            )}
          </div>

          {/* Result Message */}
          {importResult && (
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                importResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={
                  importResult.success
                    ? 'text-sm text-green-900 dark:text-green-200'
                    : 'text-sm text-red-900 dark:text-red-200'
                }
              >
                {importResult.message}
              </p>
            </div>
          )}

          {/* Errors List */}
          {progress.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                导入过程中的错误：
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {progress.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-dark-700 rounded border border-gray-200 dark:border-dark-600"
                  >
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {err.memoContent}...
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{err.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {progress.status === 'completed' && (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowProgress(false);
                  setImportResult(null);
                  importService.resetProgress();
                }}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                继续导入
              </button>
              <button
                onClick={() => {
                  // Navigate to home or memos list
                  window.location.href = '/';
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-dark-700 dark:hover:bg-dark-600 text-gray-900 dark:text-gray-50 rounded-lg font-medium transition-colors"
              >
                查看笔记
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, [ImportService]);
