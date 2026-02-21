import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Home, AlertCircle } from 'lucide-react';

const COUNTDOWN_SECONDS = 5;

export default function NotFound() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gray-100 dark:bg-dark-800 rounded-full flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-50 mb-4">404</h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
          页面未找到
        </p>
        
        <p className="text-gray-500 dark:text-gray-500 mb-8">
          您访问的页面不存在或已被移除
        </p>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 
              dark:bg-primary-700 dark:hover:bg-primary-600 text-white rounded-lg 
              transition-colors duration-200 font-medium"
          >
            <Home className="w-5 h-5" />
            立即返回首页
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-500">
            将在 <span className="font-medium text-primary-600 dark:text-primary-500">{countdown}</span> 秒后自动跳转...
          </p>
        </div>
      </div>
    </div>
  );
}
