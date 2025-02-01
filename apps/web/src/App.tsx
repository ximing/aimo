import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import Login from '@/pages/Login';
import Notes from '@/pages/Notes';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/stores/authStore';
import { themeConfig } from '@/config/theme';
import { useThemeStore } from '@/stores/themeStore';
import { I18nProvider } from '@/components/I18nProvider';
import { useI18nStore } from '@/stores/i18nStore';
import zhCN from 'antd/lib/locale/zh_CN';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" />;
}

export function App() {
  const theme = useThemeStore((state) => state.theme);
  const language = useI18nStore((state) => state.language);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={themeConfig[theme]}
        locale={language === 'zh' ? zhCN : undefined}
      >
        <I18nProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route index element={<Navigate to="/notes" replace />} />
                <Route path="notes" element={<Notes />} />
                <Route
                  path="daily"
                  element={<div>每日回顾功能开发中...</div>}
                />
                <Route
                  path="search"
                  element={<div>高级搜索功能开发中...</div>}
                />
                <Route path="settings" element={<Settings />} />
                <Route
                  path="admin"
                  element={
                    <PrivateRoute>
                      <Admin />
                    </PrivateRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </I18nProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
