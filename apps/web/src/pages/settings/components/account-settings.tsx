import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../../services/auth.service';
import { Save } from 'lucide-react';

export const AccountSettings = view(() => {
  const authService = useService(AuthService);
  const user = authService.user;

  // User info form state
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateUserInfo = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement user info update API call
    console.log('Update user info:', { nickname, email });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('新密码和确认密码不匹配');
      return;
    }
    // TODO: Implement password update API call
    console.log('Update password');
    // Clear password fields after submission
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">账户设置</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          管理你的个人信息和密码
        </p>
      </div>

      {/* User Information Form */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">个人信息</h2>
        <form onSubmit={handleUpdateUserInfo} className="space-y-4">
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              昵称
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
              placeholder="请输入昵称"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              邮箱
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
              placeholder="请输入邮箱"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>保存更改</span>
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Form */}
      <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">修改密码</h2>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label
              htmlFor="oldPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              当前密码
            </label>
            <input
              type="password"
              id="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
              placeholder="请输入当前密码"
              required
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              新密码
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
              placeholder="请输入新密码"
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              确认新密码
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-white dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors"
              placeholder="请再次输入新密码"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>更新密码</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
