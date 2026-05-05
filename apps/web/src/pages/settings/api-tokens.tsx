import { useState, useEffect } from 'react';
import { view } from '@rabjs/react';
import { Key, Plus, Trash2, X, Copy, Check } from 'lucide-react';
import { getTokens, createToken, revokeToken } from '@/api/user';
import { toast } from '@/services/toast.service';

const EXPIRY_OPTIONS = [
  { label: '7 天', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 天', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 天', value: 90 * 24 * 60 * 60 * 1000 },
  { label: '365 天', value: 365 * 24 * 60 * 60 * 1000 },
  { label: '永不过期', value: 0 },
];

interface Token {
  id: string;
  name: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  isExpired?: boolean;
  revokedAt?: number;
}

export const ApiTokensPage = view(() => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', expiresAt: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const res = await getTokens();
      setTokens(res.data.tokens);
    } catch {
      toast.error('加载 Token 失败');
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.warning('请输入 Token 名称');
      return;
    }
    setLoading(true);
    try {
      const res = await createToken({
        name: form.name,
        expiresAt: form.expiresAt,
      });
      setNewToken(res.data.token);
      setShowModal(false);
      setForm({ name: '', expiresAt: 0 });
      loadTokens();
      toast.success('Token 创建成功');
    } catch {
      toast.error('创建 Token 失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeToken(id);
      loadTokens();
      toast.success('Token 已失效');
    } catch {
      toast.error('失效 Token 失败');
    }
  };

  const handleCopy = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseNewToken = () => {
    setNewToken(null);
  };

  if (!showModal && !newToken) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">API Token</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            创建个人 API Token，用于接口鉴权
          </p>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">我的 Token</h2>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建 Token
            </button>
          </div>

          <div className="space-y-3">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex justify-between items-center p-4 border border-gray-200 dark:border-dark-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                    <Key className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-50">{token.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      创建于 {new Date(token.createdAt).toLocaleDateString()}
                      {token.expiresAt > 0
                        ? ` · 过期于 ${new Date(token.expiresAt).toLocaleDateString()}`
                        : ' · 永不过期'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium ${
                      token.isActive
                        ? token.isExpired
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {token.isActive ? (token.isExpired ? '已过期' : '有效') : '已失效'}
                  </span>
                  {token.isActive && (
                    <button
                      onClick={() => handleRevoke(token.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="失效"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {tokens.length === 0 && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                暂无 Token，点击上方按钮创建
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (newToken) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">API Token</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            创建个人 API Token，用于接口鉴权
          </p>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Key className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                  Token 已创建，请妥善保管
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  关闭后将无法再次查看完整 Token 值，请复制并妥善保存
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 block bg-white dark:bg-dark-900 p-3 rounded border border-yellow-200 dark:border-yellow-700 font-mono text-sm text-gray-800 dark:text-gray-300 break-all">
                    {newToken}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                    title="复制"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleCloseNewToken}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">API Token</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          创建个人 API Token，用于接口鉴权
        </p>
      </div>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/40"
        onClick={() => setShowModal(false)}
      >
        <div
          className="bg-white dark:bg-dark-800 rounded-lg shadow-xl w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              创建 API Token
            </h2>
            <button
              onClick={() => setShowModal(false)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label
                htmlFor="tokenName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                名称
              </label>
              <input
                type="text"
                id="tokenName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
                placeholder="例如: My API Token"
              />
            </div>

            <div>
              <label
                htmlFor="tokenExpiry"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                有效期
              </label>
              <select
                id="tokenExpiry"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-dark-700">
            <button
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 border border-gray-200 dark:border-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!form.name.trim() || loading}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
