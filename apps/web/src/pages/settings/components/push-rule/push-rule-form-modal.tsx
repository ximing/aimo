import { useState, useEffect } from 'react';
import { useService, view } from '@rabjs/react';
import { X } from 'lucide-react';
import type {
  PushRuleDto,
  CreatePushRuleDto,
  UpdatePushRuleDto,
  PushChannelConfigDto,
  PushChannelType,
} from '@aimo/dto';
import { PushRuleService } from './push-rule.service';

interface PushRuleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editRule?: PushRuleDto | null;
}

export const PushRuleFormModal = view(
  ({ isOpen, onClose, onSuccess, editRule }: PushRuleFormModalProps) => {
    const pushRuleService = useService(PushRuleService);

    const [name, setName] = useState('');
    const [pushTime, setPushTime] = useState(9);
    const [contentType, setContentType] = useState<'daily_pick' | 'daily_memos'>('daily_pick');
    const [channelType, setChannelType] = useState<PushChannelType>('meow');
    const [nickname, setNickname] = useState('');
    const [msgType, setMsgType] = useState<'text' | 'html'>('html');
    const [htmlHeight, setHtmlHeight] = useState(500);
    // Feishu specific
    const [webhookUrl, setWebhookUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [error, setError] = useState('');
    const [testMessage, setTestMessage] = useState('');

    useEffect(() => {
      if (editRule) {
        setName(editRule.name);
        setPushTime(editRule.pushTime);
        setContentType(editRule.contentType);
        const channel = editRule.channels[0];
        if (channel) {
          setChannelType(channel.type);
          setNickname(channel.nickname || '');
          setMsgType(channel.msgType || 'html');
          setHtmlHeight(channel.htmlHeight || 500);
          setWebhookUrl(channel.webhookUrl || '');
          setSecret(channel.secret || '');
        }
        setEnabled(editRule.enabled);
      } else {
        setName('');
        setPushTime(9);
        setContentType('daily_pick');
        setChannelType('meow');
        setNickname('');
        setMsgType('html');
        setHtmlHeight(500);
        setWebhookUrl('');
        setSecret('');
        setEnabled(true);
      }
      setError('');
    }, [editRule, isOpen]);

    const handleTest = async () => {
      if (!editRule) {
        setTestMessage('请先保存规则后再测试');
        return;
      }

      try {
        setTesting(true);
        setTestMessage('');

        const result = await pushRuleService.testPush(editRule.id);

        if (result.success) {
          setTestMessage('测试消息已发送，请检查是否收到');
        } else {
          setTestMessage(result.message || '测试失败');
        }
      } catch (err) {
        console.error('Test push error:', err);
        setTestMessage('测试失败，请检查配置');
      } finally {
        setTesting(false);
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setError('请输入规则名称');
        return;
      }

      if (channelType === 'meow') {
        if (!nickname.trim()) {
          setError('请输入推送昵称');
          return;
        }
      } else if (channelType === 'feishu') {
        if (!webhookUrl.trim()) {
          setError('请输入飞书 webhook 地址');
          return;
        }
      }

      const channels: PushChannelConfigDto[] = [];

      if (channelType === 'meow') {
        channels.push({
          type: 'meow',
          nickname: nickname.trim(),
          msgType,
          htmlHeight: msgType === 'html' ? htmlHeight : undefined,
        });
      } else if (channelType === 'feishu') {
        channels.push({
          type: 'feishu',
          webhookUrl: webhookUrl.trim(),
          secret: secret.trim() || undefined,
        });
      }

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
          await pushRuleService.updateRule(editRule.id, data);
        } else {
          const data: CreatePushRuleDto = {
            name: name.trim(),
            pushTime,
            contentType,
            channels,
          };
          await pushRuleService.createRule(data);
        }

        onSuccess();
        onClose();
      } catch (err: unknown) {
        console.error('Failed to save push rule:', err);
        const errorMessage =
          err && typeof err === 'object' && 'msg' in err
            ? (err as { msg?: string }).msg
            : err && typeof err === 'object' && 'message' in err
              ? (err as { message?: string }).message
              : null;
        setError(errorMessage || (editRule ? '更新失败' : '创建失败'));
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
                  <span className="text-xs text-gray-500">(随机推荐三条memo)</span>
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">今日memo</span>
                  <span className="text-xs text-gray-500">(回顾今日memo)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                推送渠道
              </label>
              <select
                value={channelType}
                onChange={(e) => setChannelType(e.target.value as PushChannelType)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="meow">MeoW</option>
                <option value="feishu">飞书群</option>
              </select>
            </div>

            {channelType === 'meow' && (
              <>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    消息类型
                  </label>
                  <select
                    value={msgType}
                    onChange={(e) => setMsgType(e.target.value as 'text' | 'html')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="html">HTML</option>
                    <option value="text">纯文本</option>
                  </select>
                </div>

                {msgType === 'html' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      HTML 高度
                    </label>
                    <input
                      type="number"
                      value={htmlHeight}
                      onChange={(e) => setHtmlHeight(Number(e.target.value))}
                      min={100}
                      max={1000}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
              </>
            )}

            {channelType === 'feishu' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Webhook 地址 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    签名密钥 <span className="text-xs text-gray-500">(可选)</span>
                  </label>
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="飞书机器人签名密钥"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    如在飞书机器人设置了签名校验，请填写密钥
                  </p>
                </div>
              </>
            )}

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

            {testMessage && (
              <div
                className={`p-3 text-sm rounded-lg ${
                  testMessage.includes('成功') || testMessage.includes('已发送')
                    ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'text-red-600 bg-red-50 dark:bg-red-900/20'
                }`}
              >
                {testMessage}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <div>
                {editRule && (
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testing ? '发送中...' : '发送测试'}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
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
            </div>
          </form>
        </div>
      </div>
    );
  }
);
