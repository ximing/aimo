import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router';
import { useEffect } from 'react';
import AuthPage from './pages/auth';
import HomePage from './pages/home';
import LandingPage from './pages/landing';
import SettingsPage from './pages/settings';
import { AccountSettings } from './pages/settings/components/account-settings';
import { ModelSettings } from './pages/settings/components/model-settings';
import { ImportData } from './pages/settings/components/import-data';
import { ExportData } from './pages/settings/components/export-data';
import { About } from './pages/settings/components/about';
import { PushRulesSettings } from './pages/settings/components/push-rule';
import { SpacedRepetitionSettings } from './pages/settings/components/spaced-repetition';
import { TagSettings } from './pages/settings/components/tag-settings';
import AIExplorePage from './pages/ai-explore';
import GalleryPage from './pages/gallery';
import SharePage from './pages/share';
import NotFoundPage from './pages/not-found';
import ReviewPage from './pages/review';
import { ProtectedRoute } from './components/protected-route';
import { ToastContainer } from './components/toast';
import { setNavigate } from './utils/navigation';
import { isElectron } from './electron/isElectron';
import { DraftService } from './services/draft.service';

// 内部组件，用于根据环境渲染根路由
function RootRoute() {
  if (isElectron()) {
    return <Navigate to="/home" replace />;
  }
  return <LandingPage />;
}

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
  const Router = isElectron() ? HashRouter : BrowserRouter;

  // 清除过期草稿（应用启动时执行一次）
  useEffect(() => {
    const draftService = new DraftService();
    draftService.clearExpiredDrafts();
  }, []);

  return (
    <Router>
      <AppContent />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<RootRoute />} />
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
          <Route path="push-rules" element={<PushRulesSettings />} />
          <Route path="models" element={<ModelSettings />} />
          <Route path="tags" element={<TagSettings />} />
          <Route path="import" element={<ImportData />} />
          <Route path="export" element={<ExportData />} />
          <Route path="spaced-repetition" element={<SpacedRepetitionSettings />} />
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
        <Route path="/share/:memoId" element={<SharePage />} />
        <Route
          path="/review"
          element={
            <ProtectedRoute>
              <ReviewPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
