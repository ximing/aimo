import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { view, useService } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { LoginForm } from './components/login-form';
import { RegisterForm } from './components/register-form';
import logoLight from '../../assets/logo.png';
import logoDark from '../../assets/logo-dark.png';

export const AuthPage = view(() => {
  const [searchParams] = useSearchParams();
  const authService = useService(AuthService);
  const navigate = useNavigate();
  const isLogin = searchParams.get('mode') !== 'register';

  // Redirect to home if already authenticated
  useEffect(() => {
    if (authService.isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [authService.isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-dark-950 dark:to-dark-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl dark:shadow-2xl p-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-6">
            <img src={logoLight} alt="Aimo Logo" className="h-12 w-12 mx-auto dark:hidden" />
            <img src={logoDark} alt="Aimo Logo" className="h-12 w-12 mx-auto hidden dark:block" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-600 dark:text-dark-400">
              {isLogin ? 'Sign in to continue to Aimo' : 'Sign up to get started with Aimo'}
            </p>
          </div>

          {/* Forms */}
          {isLogin ? <LoginForm /> : <RegisterForm />}

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                const nextMode = isLogin ? 'register' : 'login';
                navigate(`/auth?mode=${nextMode}`, { replace: true });
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 dark:text-dark-400 mt-8">
          Aimo - Your personal memo assistant
        </p>
      </div>
    </div>
  );
});
