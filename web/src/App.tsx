import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ConfigProvider } from 'antd'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Notes from '@/pages/Notes'
import Settings from '@/pages/Settings'
import { useAuthStore } from '@/stores/authStore'
import Admin from '@/pages/Admin'
import Tags from '@/pages/Tags'
import { themeConfig } from '@/config/theme'
import { useThemeStore } from '@/stores/themeStore'
import { I18nProvider } from '@/components/I18nProvider'
import { useI18nStore } from '@/stores/i18nStore'
import zhCN from 'antd/lib/locale/zh_CN'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})

interface PrivateRouteProps {
  children: React.ReactNode
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" />
  }
  
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(state => state.user)
  
  if (user?.role !== 'admin') {
    return <Navigate to="/notes" />
  }
  
  return <>{children}</>
}

export function App() {
  const theme = useThemeStore(state => state.theme)
  const language = useI18nStore(state => state.language)

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
                <Route index element={<Navigate to="/notes" />} />
                <Route path="notes" element={<Notes />} />
                <Route path="tags" element={<Tags />} />
                <Route path="settings" element={<Settings />} />
                <Route
                  path="admin"
                  element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </I18nProvider>
      </ConfigProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}