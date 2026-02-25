import { useState, useEffect } from 'react';
import { Bell, Plus, Pencil, Trash2 } from 'lucide-react';
import type { PushRuleDto } from '@aimo/dto';
import { getPushRules, deletePushRule } from '../../../api/push-rules';

interface PushRulesListProps {
  onAddRule: () => void;
  onEditRule: (rule: PushRuleDto) => void;
}

export const PushRulesList = ({ onAddRule, onEditRule }: PushRulesListProps) => {
  const [rules, setRules] = useState<PushRuleDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    try {
      const response = await getPushRules();
      if (response.code === 0) {
        setRules(response.data.rules);
      }
    } catch (error) {
      console.error('Failed to fetch push rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDelete = async (ruleId: string) => {
    if (!confirm('确定要删除这条推送规则吗？')) {
      return;
    }

    try {
      const response = await deletePushRule(ruleId);
      if (response.code === 0) {
        setRules(rules.filter((r) => r.id !== ruleId));
      }
    } catch (error) {
      console.error('Failed to delete push rule:', error);
    }
  };

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const formatContentType = (type: string) => {
    switch (type) {
      case 'daily_pick':
        return '每日推荐';
      case 'daily_memos':
        return '今日备忘录';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">推送规则</h2>
        <button
          onClick={onAddRule}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          添加规则
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>暂无推送规则</p>
          <p className="text-sm mt-1">点击上方按钮创建第一条推送规则</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900 dark:text-gray-50">{rule.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        rule.enabled
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-400'
                      }`}
                    >
                      {rule.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>推送时间: {formatTime(rule.pushTime)}</span>
                    <span>内容类型: {formatContentType(rule.contentType)}</span>
                    <span>
                      渠道: {rule.channels.map((c) => c.nickname || c.type).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditRule(rule)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
