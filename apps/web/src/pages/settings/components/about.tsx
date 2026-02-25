import { useState, useEffect } from 'react';
import { view } from '@rabjs/react';
import { getVersion } from '../../../api/system';
import { Info } from 'lucide-react';

export const About = view(() => {
  const [version, setVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if running in Electron
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        // If running in Electron, use electronAPI to get version
        if (isElectron) {
          const electronVersion = window.electronAPI?.getVersion();
          setVersion(electronVersion || '');
        } else {
          // Otherwise, fetch from server API
          const response = await getVersion();
          if (response.code === 0 && response.data) {
            setVersion(response.data.version);
          } else {
            setError('获取版本信息失败');
          }
        }
      } catch (err) {
        setError('获取版本信息失败');
        console.error('Failed to fetch version:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVersion();
  }, [isElectron]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">关于</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">关于 AIMO 知识管理工具</p>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Info className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">AIMO</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered 知识管理工具</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-dark-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">版本号</span>
            {loading ? (
              <div className="h-5 w-20 bg-gray-200 dark:bg-dark-700 animate-pulse rounded"></div>
            ) : error ? (
              <span className="text-sm text-red-500">{error}</span>
            ) : (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                {`${version}` || '未知'}
              </span>
            )}
          </div>

          <div className="py-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AIMO 是一个 AI 驱动的笔记和知识管理系统，帮助你高效管理和探索知识。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
