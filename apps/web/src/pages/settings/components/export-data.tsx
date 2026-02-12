import { useState, useEffect } from 'react';
import { useService, bindServices } from '@rabjs/react';
import { Download, FileArchive, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { ExportService } from '../../../services/export.service';

export const ExportData = bindServices(() => {
  const exportService = useService(ExportService);

  const [isExporting, setIsExporting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  // 强制刷新进度显示
  const [progressRefresh, setProgressRefresh] = useState(0);

  // 定时更新进度显示
  useEffect(() => {
    if (!showProgress || isExporting === false) {
      return;
    }

    const interval = setInterval(() => {
      setProgressRefresh(prev => prev + 1);
    }, 500); // 每500ms更新一次

    return () => clearInterval(interval);
  }, [showProgress, isExporting]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setShowProgress(true);  // 立即显示进度
      setExportResult(null);
      exportService.resetProgress();

      const result = await exportService.export();

      if (result.success) {
        setExportResult({
          success: true,
          message: `成功导出 ${result.stats.totalMemos} 个备忘录${
            result.stats.totalAttachments > 0
              ? ` 和 ${result.stats.totalAttachments} 个附件`
              : ''
          }${
            result.stats.errors.length > 0
              ? `，${result.stats.errors.length} 个附件下载失败`
              : ''
          }`,
        });
      } else {
        setExportResult({
          success: false,
          message: result.stats.errorMessage || '导出失败，请稍后重试',
        });
      }
    } catch (error) {
      setExportResult({
        success: false,
        message: error instanceof Error ? error.message : '导出过程出错',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 读取进度（通过 progressRefresh 强制重新计算）
  const progress = exportService.exportProgress;
  // 通过使用 progressRefresh 确保每次都重新计算
  void progressRefresh;

  // 计算进度百分比
  const progressPercent = (() => {
    if (progress.status === 'fetching-memos') {
      return progress.totalMemos > 0
        ? Math.round((progress.processedMemos / progress.totalMemos) * 30) // 0-30%
        : 0;
    } else if (progress.status === 'downloading-attachments') {
      const basePercent = 30;
      const downloadPercent =
        progress.totalAttachments > 0
          ? Math.round((progress.downloadedAttachments / progress.totalAttachments) * 50) // 30-80%
          : 0;
      return basePercent + downloadPercent;
    } else if (progress.status === 'creating-zip') {
      return 90; // 90%
    } else if (progress.status === 'completed') {
      return 100;
    }
    return 0;
  })();

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">数据导出</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          导出你的所有笔记和附件为 ZIP 压缩包
        </p>
      </div>

      {!showProgress ? (
        // Export Button Section
        <div className="bg-white dark:bg-dark-800 rounded-lg p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 dark:bg-dark-700 rounded-full flex items-center justify-center">
              <FileArchive className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                导出笔记数据
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                将所有笔记和附件打包下载，包含 memos_export.json
                和相关附件文件，导出的数据可通过数据导入功能还原。
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="mt-6 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {isExporting ? (
                <span className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  导出中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  开始导出
                </span>
              )}
            </button>

            <div className="mt-6 flex items-start gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">导出说明</p>
                <ul className="mt-2 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• 导出包含所有笔记内容和附件</li>
                  <li>• 导出格式与 Memos 兼容，可通过导入功能还原</li>
                  <li>• 压缩由浏览器完成，不占用服务器资源</li>
                  <li>• 大量数据可能需要较长时间，请耐心等待</li>
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
                  {progress.status === 'fetching-memos'
                    ? '正在获取笔记...'
                    : progress.status === 'downloading-attachments'
                      ? '正在下载附件...'
                      : progress.status === 'creating-zip'
                        ? '正在打包压缩...'
                        : progress.status === 'completed'
                          ? '导出完成'
                          : '导出失败'}
                </h3>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {progress.status === 'fetching-memos'
                    ? `已获取: ${progress.processedMemos}/${progress.totalMemos}`
                    : progress.status === 'downloading-attachments'
                      ? `已下载附件: ${progress.downloadedAttachments}/${progress.totalAttachments}`
                      : progress.status === 'creating-zip'
                        ? '正在压缩文件...'
                        : progress.status === 'completed'
                          ? `完成: ${progress.totalMemos} 个笔记`
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
            {(progress.totalMemos > 0 || progress.totalAttachments > 0) && (
              <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-200 dark:border-dark-700">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {progress.totalMemos}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">笔记</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {progress.totalAttachments}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">附件</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {progress.errors.length}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">错误</p>
                </div>
              </div>
            )}
          </div>

          {/* Result Message */}
          {exportResult && (
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                exportResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              {exportResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <p
                className={
                  exportResult.success
                    ? 'text-sm text-green-900 dark:text-green-200'
                    : 'text-sm text-red-900 dark:text-red-200'
                }
              >
                {exportResult.message}
              </p>
            </div>
          )}

          {/* Errors List */}
          {progress.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
                附件下载错误：
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {progress.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-dark-700 rounded border border-gray-200 dark:border-dark-600"
                  >
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      附件 ID: {err.attachmentId}
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
                  setExportResult(null);
                  exportService.resetProgress();
                }}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                再次导出
              </button>
              <button
                onClick={() => {
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
}, [ExportService]);
