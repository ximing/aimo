import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useEffect } from 'react';
import AuthPage from './pages/auth';
import HomePage from './pages/home';
import LandingPage from './pages/landing';
import SettingsPage from './pages/settings';
import { AccountSettings } from './pages/settings/components/account-settings';
import { ImportData } from './pages/settings/components/import-data';
import { ExportData } from './pages/settings/components/export-data';
import { About } from './pages/settings/components/about';
import AIExplorePage from './pages/ai-explore';
import GalleryPage from './pages/gallery';
import NotFoundPage from './pages/not-found';
import { ProtectedRoute } from './components/protected-route';
import { ToastContainer } from './components/toast';
import { setNavigate } from './utils/navigation';

// 内部组件，用于初始化 navigate 函数
function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    // 在组件挂载时设置 navigate 函数
    setNavigate(navigate);
  }, [navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/settings/account" replace />} />
          <Route path="account" element={<AccountSettings />} />
          <Route path="import" element={<ImportData />} />
          <Route path="export" element={<ExportData />} />
          <Route path="about" element={<About />} />
        </Route>
        <Route
          path="/ai-explore"
          element={
            <ProtectedRoute>
              <AIExplorePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gallery"
          element={
            <ProtectedRoute>
              <GalleryPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
