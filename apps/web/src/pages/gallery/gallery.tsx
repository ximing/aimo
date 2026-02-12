import { view } from '@rabjs/react';
import { Layout } from '../../components/layout';
import { Images, Image as ImageIcon, Video, FileText } from 'lucide-react';

export const GalleryPage = view(() => {
  return (
    <Layout>
      <div className="flex-1 overflow-hidden flex items-center justify-center w-full">
        <div className="max-w-2xl px-8 text-center">
          <div className="flex flex-col items-center gap-6">
            {/* Icon */}
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Images className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                图廊
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                集中管理你的图片、视频和附件资源
              </p>
            </div>

            {/* Features Preview */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-sm">
                    图片管理
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    浏览和管理所有图片资源
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-sm">
                    视频库
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    集中查看视频内容
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-sm">
                    文档附件
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    管理各类文档附件
                  </p>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-purple-600 dark:bg-purple-500 rounded-full animate-pulse" />
                功能开发中
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
});
