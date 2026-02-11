import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../../services/auth.service';

export const RegisterForm = view(() => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const authService = useService(AuthService);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const result = await authService.register({
      email,
      password,
      nickname: nickname || undefined,
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setNickname('');

      // Show success message for 2 seconds, then could auto-switch to login
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm animate-slide-up">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm animate-slide-up">
          Registration successful! You can now sign in.
        </div>
      )}

      <div>
        <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-500 dark:placeholder-dark-400"
          placeholder="you@example.com"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
          Nickname <span className="text-gray-400 dark:text-dark-500 text-xs">(optional)</span>
        </label>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-500 dark:placeholder-dark-400"
          placeholder="Your name"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-500 dark:placeholder-dark-400"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-dark-300 mb-2">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-500 dark:placeholder-dark-400"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  );
});
