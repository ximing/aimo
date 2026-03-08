import { useEffect, useRef, useState } from 'react';
import { bindServices, useService } from '@rabjs/react';
import { BrainCircuit, Plus, Trash2, Upload, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { toast } from '../../../../services/toast.service';
import { getCategories } from '../../../../api/category';
import { getTags } from '../../../../api/tag';
import type { CategoryDto } from '@aimo/dto';
import type { TagDto } from '@aimo/dto';

interface Option {
  value: string;
  label: string;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

export const SpacedRepetitionSettings = bindServices(() => {
  const srService = useService(SpacedRepetitionService);
  const { settings, rules, loading, savingSettings, importing } = srService;
  const dailyLimitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false }));
  };

  // Categories and tags for dropdown
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [tags, setTags] = useState<TagDto[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Add rule form state
  const [newRuleMode, setNewRuleMode] = useState<'include' | 'exclude'>('include');
  const [newRuleFilterType, setNewRuleFilterType] = useState<'category' | 'tag'>('tag');
  const [selectedValues, setSelectedValues] = useState<Option[]>([]);

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);
  const [addingRule, setAddingRule] = useState(false);

  // Fetch categories and tags
  const fetchOptions = async () => {
    setLoadingOptions(true);
    try {
      const [catRes, tagRes] = await Promise.all([getCategories(), getTags()]);
      if (catRes.code === 0 && catRes.data?.categories) {
        setCategories(catRes.data.categories);
      }
      if (tagRes.code === 0 && tagRes.data?.tags) {
        setTags(tagRes.data.tags);
      }
    } catch (e) {
      console.error('Fetch options error:', e);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    srService.fetchSettings();
    srService.fetchRules();
    fetchOptions();
  }, [srService]);

  // Get options based on filter type
  const getOptions = (): Option[] => {
    if (newRuleFilterType === 'category') {
      return categories.map((c) => ({ value: c.categoryId, label: c.name }));
    }
    return tags.map((t) => ({ value: t.name, label: t.name }));
  };

  // Handle checkbox toggle
  const handleToggleOption = (option: Option) => {
    const exists = selectedValues.some((v) => v.value === option.value);
    if (exists) {
      setSelectedValues(selectedValues.filter((v) => v.value !== option.value));
    } else {
      setSelectedValues([...selectedValues, option]);
    }
  };

  // Filter type change - reset selected values
  const handleFilterTypeChange = (type: 'category' | 'tag') => {
    setNewRuleFilterType(type);
    setSelectedValues([]);
  };

  const handleToggle = async () => {
    const result = await srService.updateSettings({ srEnabled: !settings.srEnabled });
    if (!result.success) {
      toast.error('保存失败');
    }
  };

  const handleDailyLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    const value = isNaN(raw) ? 1 : Math.min(20, Math.max(1, raw));
    // Optimistically update local state
    srService.settings = { ...settings, srDailyLimit: value };

    if (dailyLimitDebounceRef.current) {
      clearTimeout(dailyLimitDebounceRef.current);
    }
    dailyLimitDebounceRef.current = setTimeout(async () => {
      const result = await srService.updateSettings({ srDailyLimit: value });
      if (!result.success) {
        toast.error('保存失败');
      }
    }, 500);
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedValues.length === 0) {
      toast.error('请至少选择一个过滤值');
      return;
    }
    setAddingRule(true);
    let successCount = 0;

    // Batch create rules for each selected value
    for (const option of selectedValues) {
      const result = await srService.createRule({
        mode: newRuleMode,
        filterType: newRuleFilterType,
        filterValue: option.value,
      });
      if (result.success) {
        successCount++;
      }
    }

    setAddingRule(false);
    setSelectedValues([]);
    if (successCount > 0) {
      toast.success(`已添加 ${successCount} 条规则`);
    } else {
      toast.error('添加规则失败');
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    showConfirm('删除过滤规则', '确定要删除这条过滤规则吗？', async () => {
      const result = await srService.deleteRule(ruleId);
      if (!result.success) {
        toast.error('删除规则失败');
      }
    });
  };

  const handleImportExisting = () => {
    showConfirm(
      '导入历史笔记',
      '将把所有符合过滤规则的现有笔记加入复习池，已在复习池中的笔记不受影响，确认导入？',
      async () => {
        const result = await srService.importExistingMemos();
        if (result.success) {
          toast.success(`已导入 ${result.imported} 条笔记，跳过 ${result.skipped} 条（已在复习池或被规则排除）`);
        } else {
          toast.error('导入失败');
        }
      }
    );
  };

  const modeLabel = (mode: 'include' | 'exclude') => (mode === 'include' ? '包含' : '排除');
  const filterTypeLabel = (type: 'category' | 'tag') => (type === 'category' ? '分类' : '标签');

  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">间隔重复</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            基于 SM-2 算法，在最容易遗忘的时间点推送笔记提醒
          </p>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 dark:bg-dark-700 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">间隔重复</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          基于 SM-2 算法，在最容易遗忘的时间点推送笔记提醒
        </p>
      </div>

      {/* Main Settings Block */}
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <BrainCircuit className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">基本设置</h2>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">开启间隔重复</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              每日 08:00 推送待复习笔记
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={savingSettings}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 ${
              settings.srEnabled
                ? 'bg-primary-600'
                : 'bg-gray-200 dark:bg-dark-600'
            }`}
            aria-pressed={settings.srEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.srEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Daily Limit Input */}
        <div className={settings.srEnabled ? '' : 'opacity-50 pointer-events-none'}>
          <label
            htmlFor="srDailyLimit"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            每日最大推送数量
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            每天最多推送的待复习笔记数量（1–20）
          </p>
          <input
            type="number"
            id="srDailyLimit"
            min={1}
            max={20}
            value={settings.srDailyLimit}
            onChange={handleDailyLimitChange}
            disabled={!settings.srEnabled || savingSettings}
            className="w-32 px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* Import Existing Button */}
        <div className={settings.srEnabled ? '' : 'opacity-50 pointer-events-none'}>
          <button
            type="button"
            onClick={handleImportExisting}
            disabled={!settings.srEnabled || importing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {importing ? '导入中...' : '导入历史笔记'}
          </button>
        </div>
      </div>

      {/* Filter Rules Block */}
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">过滤规则</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4">
          配置哪些笔记参与间隔重复。无规则时所有笔记均参与；排除规则优先于包含规则。
        </p>

        {/* Existing Rules List */}
        {rules.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">暂无过滤规则</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.ruleId}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                      rule.mode === 'include'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {modeLabel(rule.mode)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 mr-1">
                    {filterTypeLabel(rule.filterType)}:
                  </span>
                  {rule.filterValue}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.ruleId)}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded transition-colors"
                  title="删除规则"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Rule Form */}
        <form onSubmit={handleAddRule} className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">添加规则</p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={newRuleMode}
              onChange={(e) => setNewRuleMode(e.target.value as 'include' | 'exclude')}
              className="px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="include">包含</option>
              <option value="exclude">排除</option>
            </select>
            <select
              value={newRuleFilterType}
              onChange={(e) => handleFilterTypeChange(e.target.value as 'category' | 'tag')}
              className="px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="tag">标签</option>
              <option value="category">分类</option>
            </select>

            {/* Multi-select dropdown */}
            <div ref={dropdownRef} className="relative flex-1 min-w-[200px]">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={loadingOptions}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:opacity-60"
              >
                <span className="truncate">
                  {selectedValues.length === 0
                    ? `选择${newRuleFilterType === 'category' ? '分类' : '标签'}...`
                    : `已选 ${selectedValues.length} 项`}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingOptions ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">加载中...</div>
                  ) : getOptions().length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      暂无{newRuleFilterType === 'category' ? '分类' : '标签'}
                    </div>
                  ) : (
                    getOptions().map((option) => {
                      const isSelected = selectedValues.some((v) => v.value === option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleToggleOption(option)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-primary-600 border-primary-600'
                                : 'border-gray-300 dark:border-dark-500'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="truncate">{option.label}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={addingRule || selectedValues.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>

          {/* Selected values preview */}
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedValues.map((v) => (
                <span
                  key={v.value}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs"
                >
                  {v.label}
                  <button
                    type="button"
                    onClick={() => handleToggleOption(v)}
                    className="hover:text-primary-900 dark:hover:text-primary-100"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeConfirm} />
          <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {confirmDialog.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {confirmDialog.message}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeConfirm}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-dark-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  closeConfirm();
                  confirmDialog.onConfirm();
                }}
                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, [SpacedRepetitionService]);
