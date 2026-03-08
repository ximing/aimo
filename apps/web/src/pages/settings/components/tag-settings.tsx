import { view, useService } from '@rabjs/react';
import { useEffect, useState } from 'react';
import { UserModelService } from '../../../services/user-model.service';
import { ToastService } from '../../../services/toast.service';
import { getTagModelConfig, updateTagModelConfig } from '../../../api/user-feature-config';
import { Loader2, Tag, Bot } from 'lucide-react';

export const TagSettings = view(() => {
  const modelService = useService(UserModelService);
  const toastService = useService(ToastService);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Load models and config on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Load user models
        await modelService.loadModels();

        // Load current tag model config
        const config = await getTagModelConfig();
        setSelectedModelId(config.userModelId);
      } catch (error) {
        console.error('Failed to load tag settings:', error);
        toastService.error('加载设置失败');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle model selection change
  const handleModelChange = async (modelId: string | null) => {
    setIsSaving(true);
    try {
      await updateTagModelConfig(modelId);
      setSelectedModelId(modelId);
      toastService.success('设置已保存');
    } catch (error) {
      console.error('Failed to save tag model config:', error);
      toastService.error('保存设置失败');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-dark-700 rounded w-1/3" />
          <div className="h-20 bg-gray-200 dark:bg-dark-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">标签设置</h2>
        <p className="text-gray-600 dark:text-gray-400">
          配置智能生成标签时使用的大模型
        </p>
      </div>

      {/* Tag Model Selection */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Tag className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">智能生成 Tag 模型</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              选择生成标签时使用的大模型，未选择时使用系统默认模型
            </p>

            {/* Model Dropdown */}
            <div className="flex items-center gap-3">
              <Bot className="w-4 h-4 text-gray-400" />
              <select
                value={selectedModelId ?? ''}
                onChange={(e) => handleModelChange(e.target.value || null)}
                disabled={isSaving}
                className="flex-1 max-w-xs bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option value="">系统默认</option>
                {modelService.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>

            {modelService.models.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                请先在「大模型设置」中添加自定义模型
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>提示：</strong>智能生成标签功能会根据笔记内容自动生成相关标签。
          选择不同的大模型可能会影响生成标签的质量和风格。
        </p>
      </div>
    </div>
  );
});
