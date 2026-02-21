import { useState, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../../services/auth.service';
import { Save, Camera, User as UserIcon } from 'lucide-react';
import { toast } from '../../../services/toast.service';

export const AccountSettings = view(() => {
  const authService = useService(AuthService);
  const user = authService.user;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User info form state
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.warning('请选择图片文件');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('图片大小不能超过 5MB');
      return;
    }

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Upload to server
    setIsUploadingAvatar(true);
    try {
      const result = await authService.updateAvatar(file);
      if (result.success) {
        // Update successful, use the new avatar URL from server
        setAvatarPreview(result.avatar);
      } else {
        // Revert to old avatar on failure
        setAvatarPreview(user?.avatar);
        toast.error(result.message || '头像上传失败');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setAvatarPreview(user?.avatar);
      toast.error('头像上传失败');
    } finally {
      setIsUploadingAvatar(false);
      // Clean up preview URL
      if (avatarPreview !== user?.avatar) {
        URL.revokeObjectURL(previewUrl);
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateUserInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authService.user) {
      toast.warning('用户信息未加载');
      return;
    }

    const trimmedNickname = nickname.trim();
    const result = await authService.updateUserInfo({ nickname: trimmedNickname });

    if (result.success) {
      setNickname(result.user?.nickname ?? trimmedNickname);
      setEmail(result.user?.email ?? email);
      toast.success(result.message || '保存成功');
      return;
    }

    toast.error(result.message || '保存失败');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.warning('请填写完整信息');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning('新密码和确认密码不匹配');
      return;
    }

    if (newPassword.length < 6) {
      toast.warning('新密码长度至少6位');
      return;
    }

    const result = await authService.changePassword({
      oldPassword,
      newPassword,
    });

    if (result.success) {
      toast.success(result.message || '密码修改成功');
      // Clear password fields after submission
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return;
    }

    toast.error(result.message || '密码修改失败');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">账户设置</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">管理你的个人信息和密码</p>
      </div>

      {/* User Information Form */}
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">个人信息</h2>

        {/* Avatar Section */}
        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200 dark:border-dark-700">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="用户头像"
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            {/* Upload overlay */}
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer disabled:opacity-60"
              aria-label="更换头像"
            >
              {isUploadingAvatar ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-50">头像</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              点击头像更换图片
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              支持 JPG、PNG、GIF、WebP，最大 5MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

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
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
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
