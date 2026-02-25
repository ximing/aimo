import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { PushRuleDto, CreatePushRuleDto, UpdatePushRuleDto, PushChannelConfigDto } from '@aimo/dto';
import { createPushRule, updatePushRule } from '../../../api/push-rules';

interface PushRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRule?: PushRuleDto | null;
}

export const PushRuleFormModal = ({ isOpen, onClose, onSuccess, editRule }: PushRuleFormModalProps) => {
  const [name, setName] = useState('');
  const [pushTime, setPushTime] = useState(9);
  const [contentType, setContentType] = useState<'daily_pick' | 'daily_memos'>('daily_pick');
  const [nickname, setNickname] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editRule) {
      setName(editRule.name);
      setPushTime(editRule.pushTime);
      setContentType(editRule.contentType);
      setNickname(editRule.channels[0]?.nickname || '');
      setEnabled(editRule.enabled);
    } else {
      setName('');
      setPushTime(9);
      setContentType('daily_pick');
      setNickname('');
      setEnabled(true);
    }
    setError('');
  }, [editRule, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('请输入规则名称');
      return;
    }

    if (!nickname.trim()) {
      setError('请输入推送昵称');
      return;
    }

    const channels: PushChannelConfigDto[] = [
      {
        type: 'meow',
        nickname: nickname.trim(),
        msgType: 'html',
        htmlHeight: 500,
      },
    ];

    try {
      setLoading(true);
      setError('');

      if (editRule) {
        const data: UpdatePushRuleDto = {
          name: name.trim(),
          pushTime,
          contentType,
          channels,
          enabled,
        };
        await updatePushRule(editRule.id, data);
      } else {
        const data: CreatePushRuleDto = {
          name: name.trim(),
          pushTime,
          contentType,
          channels,
        };
        await createPushRule(data);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save push rule:', err);
      setError(editRule ? '更新失败' : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {editRule ? '编辑推送规则' : '添加推送规则'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              规则名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：早上推送"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              推送时间
            </label>
            <select
              value={pushTime}
              onChange={(e) => setPushTime(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              内容类型
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contentType"
                  value="daily_pick"
                  checked={contentType === 'daily_pick'}
                  onChange={() => setContentType('daily_pick')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">每日推荐</span>
                <span className="text-xs text-gray-500">(随机推荐一条备忘录)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="contentType"
                  value="daily_memos"
                  checked={contentType === 'daily_memos'}
                  onChange={() => setContentType('daily_memos')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">今日备忘录</span>
                <span className="text-xs text-gray-500">(今日所有备忘录)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              推送昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="你的昵称"
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {editRule && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">启用此规则</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
