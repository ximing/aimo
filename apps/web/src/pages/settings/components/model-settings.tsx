import { view, useService } from '@rabjs/react';
import { useEffect, useState } from 'react';
import { UserModelService } from '../../../services/user-model.service';
import { ToastService } from '../../../services/toast.service';
import { userModelApi } from '../../../api/user-model';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Bot,
  Play,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { UserModelDto, CreateUserModelDto, UpdateUserModelDto, LLMProvider } from '@aimo/dto';

const providerOptions: { value: LLMProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'other', label: '其他 (OpenAI 兼容)' },
];

export const ModelSettings = view(() => {
  const modelService = useService(UserModelService);
  const toastService = useService(ToastService);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<UserModelDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateUserModelDto>({
    name: '',
    provider: 'openai',
    apiBaseUrl: '',
    apiKey: '',
    modelName: '',
    isDefault: false,
  });

  // Load models on mount
  useEffect(() => {
    modelService.loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open modal for creating new model
  const handleAdd = () => {
    setEditingModel(null);
    setFormData({
      name: '',
      provider: 'openai',
      apiBaseUrl: '',
      apiKey: '',
      modelName: '',
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  // Open modal for editing existing model
  const handleEdit = (model: UserModelDto) => {
    setEditingModel(model);
    setFormData({
      name: model.name,
      provider: model.provider,
      apiBaseUrl: model.apiBaseUrl || '',
      apiKey: model.apiKey || '',
      modelName: model.modelName,
      isDefault: model.isDefault,
    });
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingModel(null);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toastService.error('请输入模型名称');
      return;
    }
    if (!formData.apiKey.trim()) {
      toastService.error('请输入 API Key');
      return;
    }
    if (!formData.modelName.trim()) {
      toastService.error('请输入模型名称');
      return;
    }

    setIsSubmitting(true);

    try {
      let success: boolean;

      if (editingModel) {
        // Update existing model
        const updateData: UpdateUserModelDto = {
          name: formData.name,
          provider: formData.provider,
          apiBaseUrl: formData.apiBaseUrl || undefined,
          modelName: formData.modelName,
          isDefault: formData.isDefault,
        };
        // Only update apiKey if provided
        if (formData.apiKey) {
          updateData.apiKey = formData.apiKey;
        }
        success = await modelService.updateModel(editingModel.id, updateData);
      } else {
        // Create new model
        success = await modelService.createModel(formData);
      }

      if (success) {
        toastService.success(editingModel ? '更新成功' : '创建成功');
        handleCloseModal();
      } else {
        toastService.error(modelService.error || '操作失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle set default
  const handleSetDefault = async (id: string) => {
    const success = await modelService.setDefault(id);
    if (success) {
      toastService.success('已设为默认模型');
    } else {
      toastService.error('设置失败');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    setDeleteConfirmId(id);
    const success = await modelService.deleteModel(id);
    setDeleteConfirmId(null);

    if (success) {
      toastService.success('删除成功');
    } else {
      toastService.error('删除失败');
    }
  };

  // Handle test model
  const handleTestModel = async () => {
    if (!formData.apiKey.trim()) {
      toastService.error('请输入 API Key');
      return;
    }
    if (!formData.modelName.trim()) {
      toastService.error('请输入模型标识');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await userModelApi.testModel(formData);
      setTestResult({
        success: result.success,
        message: result.success ? result.response : result.message,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : '测试失败',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Get provider display name
  const getProviderName = (provider: string) => {
    const opt = providerOptions.find((p) => p.value === provider);
    return opt?.label || provider;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">大模型设置</h2>
          <p className="text-gray-600 dark:text-gray-400">
            管理您的大模型配置，支持 OpenAI、DeepSeek、OpenRouter 等
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          添加模型
        </button>
      </div>

      {/* Loading State */}
      {modelService.isLoading && modelService.models.length === 0 && (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md border border-gray-200 dark:border-dark-700 p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-dark-700 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!modelService.isLoading && modelService.models.length === 0 && (
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md border border-gray-200 dark:border-dark-700 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
            <Bot className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无模型配置</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            添加您的大模型配置，以便在任务中使用
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            添加模型
          </button>
        </div>
      )}

      {/* Model List */}
      {!modelService.isLoading && modelService.models.length > 0 && (
        <div className="space-y-3">
          {modelService.models.map((model) => (
            <div
              key={model.id}
              className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm border transition-colors ${
                model.isDefault
                  ? 'border-primary-300 dark:border-primary-700'
                  : 'border-gray-200 dark:border-dark-700'
              }`}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Provider Icon */}
                  <div className="w-12 h-12 bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>

                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {model.name}
                      </h3>
                      {model.isDefault && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full">
                          <Star className="w-3 h-3 fill-current" />
                          默认
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>{getProviderName(model.provider)}</span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="truncate">{model.modelName}</span>
                    </div>
                    {model.apiBaseUrl && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                        {model.apiBaseUrl}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {!model.isDefault && (
                    <button
                      onClick={() => handleSetDefault(model.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      title="设为默认"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(model)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(model.id)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirmId === model.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      确定要删除模型 "{model.name}" 吗？此操作无法撤销。
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(model.id)}
                        disabled={deleteConfirmId !== model.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                      >
                        确认删除
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <ModelFormModal
          formData={formData}
          setFormData={setFormData}
          isEditing={!!editingModel}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onClose={handleCloseModal}
          providerOptions={providerOptions}
          isTesting={isTesting}
          testResult={testResult}
          onTest={handleTestModel}
        />
      )}
    </div>
  );
});

interface ModelFormModalProps {
  formData: CreateUserModelDto;
  setFormData: React.Dispatch<React.SetStateAction<CreateUserModelDto>>;
  isEditing: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  providerOptions: { value: LLMProvider; label: string }[];
  isTesting: boolean;
  testResult: { success: boolean; message: string } | null;
  onTest: () => void;
}

const ModelFormModal = view(
  ({
    formData,
    setFormData,
    isEditing,
    isSubmitting,
    onSubmit,
    onClose,
    providerOptions,
    isTesting,
    testResult,
    onTest,
  }: ModelFormModalProps) => {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? '编辑模型' : '添加模型'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="p-4 space-y-4">
            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                模型名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：我的 GPT-4"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                模型提供方 *
              </label>
              <select
                value={formData.provider}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    provider: e.target.value as LLMProvider,
                    apiBaseUrl: '',
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              >
                {providerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* API Base URL */}
            {formData.provider === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Base URL *
                </label>
                <input
                  type="text"
                  value={formData.apiBaseUrl}
                  onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                  placeholder="https://your-api.com/v1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key {isEditing ? '(留空保持不变)' : '*'}
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder={isEditing ? '••••••••' : 'sk-xxx...'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Model Name (actual) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                模型标识 *
              </label>
              <input
                type="text"
                value={formData.modelName}
                onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                placeholder="例如：gpt-4, gpt-4o, deepseek-chat"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                填写实际的模型标识，如 gpt-4、gpt-4o、deepseek-chat 等
              </p>
            </div>

            {/* Test Button and Result */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={onTest}
                disabled={isTesting || !formData.apiKey || !formData.modelName}
                className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                测试连接
              </button>
              {testResult && (
                <div
                  className={`flex-1 p-3 rounded-lg ${
                    testResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm ${
                        testResult.success
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}
                    >
                      {testResult.success ? '连接成功' : '连接失败'}
                    </span>
                  </div>
                  {!testResult.success && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {testResult.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Set as Default */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-300">
                设为默认模型
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditing ? '保存更改' : '添加模型'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
);
