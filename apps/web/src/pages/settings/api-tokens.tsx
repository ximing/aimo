import { useState, useEffect } from 'react';
import { getTokens, createToken, revokeToken } from '@/api/user';

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
}

export function ApiTokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', expiresAt: 0 });

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    const res = await getTokens();
    setTokens(res.data.tokens);
  };

  const handleCreate = async () => {
    const res = await createToken({
      name: form.name,
      expiresAt: form.expiresAt,
    });
    setNewToken(res.data.token);
    setShowModal(false);
    loadTokens();
  };

  const handleRevoke = async (id: string) => {
    await revokeToken(id);
    loadTokens();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">API Token</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          创建 Token
        </button>
      </div>

      {newToken && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">
            Token 已创建，请妥善保管，关闭后无法再次查看：
          </p>
          <code className="block bg-white p-2 rounded border font-mono text-sm break-all">
            {newToken}
          </code>
          <button
            onClick={() => setNewToken(null)}
            className="mt-2 text-sm text-yellow-600 hover:underline"
          >
            关闭
          </button>
        </div>
      )}

      <div className="space-y-3">
        {tokens.map((token) => (
          <div key={token.id} className="p-4 border rounded flex justify-between items-center">
            <div>
              <div className="font-medium">{token.name}</div>
              <div className="text-sm text-gray-500">
                创建于 {new Date(token.createdAt).toLocaleDateString()}
                {token.expiresAt > 0 ? ` · 过期于 ${new Date(token.expiresAt).toLocaleDateString()}` : ' · 永不过期'}
              </div>
              <div className="text-sm">
                状态: <span className={token.isActive ? 'text-green-600' : 'text-red-600'}>
                  {token.isActive ? (token.isExpired ? '已过期' : '有效') : '已失效'}
                </span>
              </div>
            </div>
            {token.isActive && (
              <button
                onClick={() => handleRevoke(token.id)}
                className="px-3 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50"
              >
                失效
              </button>
            )}
          </div>
        ))}
        {tokens.length === 0 && (
          <div className="text-center text-gray-500 py-8">暂无 Token</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-lg font-semibold mb-4">创建 API Token</h2>
            <div className="mb-4">
              <label className="block text-sm mb-1">名称</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="例如: My API Token"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm mb-1">有效期</label>
              <select
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: Number(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}