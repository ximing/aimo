import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/auth';
import HomePage from './pages/home';
import SettingsPage from './pages/settings';
import AIExplorePage from './pages/ai-explore';
import GalleryPage from './pages/gallery';
import { ProtectedRoute } from './components/protected-route';
import { ToastContainer } from './components/toast';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
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
        />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
