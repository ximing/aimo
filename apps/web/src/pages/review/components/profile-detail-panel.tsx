import { useState } from 'react';
import { observer, useService } from '@rabjs/react';
import type { ProfileFilterRule } from '@aimo/dto';
import { ReviewService } from '../review.service';
import { Loader2, Plus, Trash2, X, Tag, FolderOpen, CalendarDays, Calendar } from 'lucide-react';

type RuleType = ProfileFilterRule['type'];
type RuleOperator = ProfileFilterRule['operator'];

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  category: '分类',
  tag: '标签',
  recent_days: '最近 N 天',
  date_range: '日期范围',
};

const RULE_TYPE_ICONS: Record<RuleType, React.ReactNode> = {
  category: <FolderOpen className="w-3.5 h-3.5" />,
  tag: <Tag className="w-3.5 h-3.5" />,
  recent_days: <CalendarDays className="w-3.5 h-3.5" />,
  date_range: <Calendar className="w-3.5 h-3.5" />,
};

const ProfileDetailPanelContent = () => {
  const service = useService(ReviewService);

  const [addingType, setAddingType] = useState<RuleType>('category');
  const [addingOperator, setAddingOperator] = useState<RuleOperator>('include');
  const [addingValue, setAddingValue] = useState('');
  const [addingDateStart, setAddingDateStart] = useState('');
  const [addingDateEnd, setAddingDateEnd] = useState('');
  const [addingRecentDays, setAddingRecentDays] = useState('7');

  if (service.detailMode === 'none') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-24">
        <svg
          className="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p className="text-gray-400 dark:text-gray-500 text-sm">从左侧选择一个回顾模式</p>
        <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">或点击「新建模式」创建一个</p>
      </div>
    );
  }

  const isNew = service.detailMode === 'new';

  const handleAddRule = () => {
    let value = '';
    let label = '';
    if (addingType === 'category') {
      value = addingValue;
      label = service.categories.find((c) => c.id === addingValue)?.name ?? addingValue;
    } else if (addingType === 'tag') {
      value = addingValue;
      label = service.tags.find((t) => t.id === addingValue)?.name ?? addingValue;
    } else if (addingType === 'recent_days') {
      value = addingRecentDays;
      label = `${addingRecentDays}天内`;
    } else if (addingType === 'date_range') {
      value = `${addingDateStart},${addingDateEnd}`;
      label = `${addingDateStart} ~ ${addingDateEnd}`;
    }
    if (!value) return;
    service.updateDetailRules([...service.detailRules, { type: addingType, operator: addingOperator, value, label }]);
    setAddingValue('');
    setAddingDateStart('');
    setAddingDateEnd('');
    setAddingRecentDays('7');
  };

  const handleRemoveRule = (idx: number) => {
    service.updateDetailRules(service.detailRules.filter((_, i) => i !== idx));
  };

  const operatorLabel = (op: RuleOperator) => (op === 'include' ? '包含' : '排除');
  const operatorColor = (op: RuleOperator) =>
    op === 'include'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';

  return (
    <div className="max-w-xl mx-auto px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
          {isNew ? '新建回顾模式' : '编辑回顾模式'}
        </h2>
        {!isNew && (
          <button
            onClick={() => service.deleteProfile(service.detailMode)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="删除模式"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          模式名称
        </label>
        <input
          type="text"
          value={service.detailName}
          onChange={(e) => service.updateDetailName(e.target.value)}
          placeholder="例如：工作笔记每日复习"
          className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoFocus={isNew}
        />
      </div>

      {/* Filter Rules */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          过滤规则
        </label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          多条规则为 AND 关系，笔记需同时满足所有规则
        </p>

        {service.detailRules.length > 0 && (
          <div className="space-y-2 mb-3">
            {service.detailRules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-gray-50 dark:bg-dark-700 rounded-lg px-3 py-2"
              >
                <span className="text-gray-400">{RULE_TYPE_ICONS[rule.type]}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {RULE_TYPE_LABELS[rule.type]}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${operatorColor(rule.operator)}`}
                >
                  {operatorLabel(rule.operator)}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">
                  {rule.label ?? rule.value}
                </span>
                <button
                  onClick={() => handleRemoveRule(idx)}
                  className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border border-dashed border-gray-300 dark:border-dark-600 rounded-lg p-3 space-y-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">添加规则</p>

          <div className="flex gap-2">
            <select
              value={addingType}
              onChange={(e) => {
                setAddingType(e.target.value as RuleType);
                setAddingValue('');
              }}
              className="flex-1 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {(Object.keys(RULE_TYPE_LABELS) as RuleType[]).map((t) => (
                <option key={t} value={t}>
                  {RULE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {(addingType === 'category' || addingType === 'tag') && (
              <select
                value={addingOperator}
                onChange={(e) => setAddingOperator(e.target.value as RuleOperator)}
                className="w-20 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="include">包含</option>
                <option value="exclude">排除</option>
              </select>
            )}
          </div>

          {addingType === 'category' && (
            <select
              value={addingValue}
              onChange={(e) => setAddingValue(e.target.value)}
              className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">选择分类...</option>
              {service.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {addingType === 'tag' && (
            <select
              value={addingValue}
              onChange={(e) => setAddingValue(e.target.value)}
              className="w-full bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">选择标签...</option>
              {service.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {addingType === 'recent_days' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={addingRecentDays}
                onChange={(e) => setAddingRecentDays(e.target.value)}
                className="w-24 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">天内创建的笔记</span>
            </div>
          )}
          {addingType === 'date_range' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={addingDateStart}
                onChange={(e) => setAddingDateStart(e.target.value)}
                className="flex-1 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-400">至</span>
              <input
                type="date"
                value={addingDateEnd}
                onChange={(e) => setAddingDateEnd(e.target.value)}
                className="flex-1 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}

          <button
            onClick={handleAddRule}
            disabled={
              (addingType === 'category' && !addingValue) ||
              (addingType === 'tag' && !addingValue) ||
              (addingType === 'date_range' && (!addingDateStart || !addingDateEnd))
            }
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-sm text-primary-600 dark:text-primary-400 border border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            添加此规则
          </button>
        </div>
      </div>

      {/* Question Count */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          题目数量：
          <span className="text-primary-600 dark:text-primary-400 font-semibold">
            {service.detailQuestionCount}
          </span>
        </label>
        <input
          type="range"
          min={5}
          max={20}
          value={service.detailQuestionCount}
          onChange={(e) => service.updateDetailQuestionCount(parseInt(e.target.value, 10))}
          className="w-full accent-primary-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>5</span>
          <span>20</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => service.saveDetail()}
          disabled={service.detailSaving || !service.detailName.trim()}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {service.detailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {service.detailDirty ? '保存修改' : '已保存'}
        </button>
        <button
          onClick={() => service.startWithDetail()}
          disabled={service.loading || service.detailSaving || !service.detailName.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {service.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {service.loading ? '准备中...' : '开始回顾'}
        </button>
      </div>
    </div>
  );
};

export const ProfileDetailPanel = observer(ProfileDetailPanelContent);
