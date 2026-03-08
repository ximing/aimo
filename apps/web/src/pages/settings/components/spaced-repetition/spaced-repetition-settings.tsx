import { useEffect, useRef, useState } from 'react';
import { bindServices, useService } from '@rabjs/react';
import { BrainCircuit, Plus, Trash2 } from 'lucide-react';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { toast } from '../../../../services/toast.service';

export const SpacedRepetitionSettings = bindServices(() => {
  const srService = useService(SpacedRepetitionService);
  const { settings, rules, loading, savingSettings } = srService;
  const dailyLimitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add rule form state
  const [newRuleMode, setNewRuleMode] = useState<'include' | 'exclude'>('include');
  const [newRuleFilterType, setNewRuleFilterType] = useState<'category' | 'tag'>('tag');
  const [newRuleFilterValue, setNewRuleFilterValue] = useState('');
  const [addingRule, setAddingRule] = useState(false);

  useEffect(() => {
    srService.fetchSettings();
    srService.fetchRules();
  }, [srService]);

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
    const value = newRuleFilterValue.trim();
    if (!value) {
      toast.error('请输入过滤值');
      return;
    }
    setAddingRule(true);
    const result = await srService.createRule({
      mode: newRuleMode,
      filterType: newRuleFilterType,
      filterValue: value,
    });
    setAddingRule(false);
    if (result.success) {
      setNewRuleFilterValue('');
      toast.success('规则已添加');
    } else {
      toast.error('添加规则失败');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('确定要删除这条过滤规则吗？')) {
      return;
    }
    const result = await srService.deleteRule(ruleId);
    if (!result.success) {
      toast.error('删除规则失败');
    }
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
              onChange={(e) => setNewRuleFilterType(e.target.value as 'category' | 'tag')}
              className="px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="tag">标签</option>
              <option value="category">分类</option>
            </select>
            <input
              type="text"
              value={newRuleFilterValue}
              onChange={(e) => setNewRuleFilterValue(e.target.value)}
              placeholder="输入具体值"
              className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={addingRule}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}, [SpacedRepetitionService]);
