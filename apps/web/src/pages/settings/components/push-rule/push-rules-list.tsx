import { useEffect } from 'react';
import { useService,view } from '@rabjs/react';
import { Bell, Plus, Pencil, Trash2 } from 'lucide-react';
import type { PushRuleDto, PushChannelConfigDto } from '@aimo/dto';
import { PushRuleService } from './push-rule.service';

interface PushRulesListProps {
  onAddRule: () => void;
  onEditRule: (rule: PushRuleDto) => void;
}

export const PushRulesList = view(({ onAddRule, onEditRule }: PushRulesListProps) => {
  const pushRuleService = useService(PushRuleService);

  useEffect(() => {
    pushRuleService.fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (ruleId: string) => {
    if (!confirm('确定要删除这条推送规则吗？')) {
      return;
    }

    await pushRuleService.deleteRule(ruleId);
  };

  if (pushRuleService.loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const validRules = pushRuleService.rules.filter((rule): rule is PushRuleDto => Boolean(rule));

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

      {validRules.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>暂无推送规则</p>
          <p className="text-sm mt-1">点击上方按钮创建第一条推送规则</p>
        </div>
      ) : (
        <div className="space-y-4">
          {validRules.map((rule) => (
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
                    <span>推送时间: {pushRuleService.formatTime(rule.pushTime)}</span>
                    <span>内容类型: {pushRuleService.formatContentType(rule.contentType)}</span>
                    <span>
                      渠道:{' '}
                      {(rule.channels || [])
                        .filter((c): c is PushChannelConfigDto => Boolean(c))
                        .map((c) => c.nickname || c.type)
                        .join(', ') || '-'}
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
});
