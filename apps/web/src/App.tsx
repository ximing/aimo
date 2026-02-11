import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import AuthPage from './pages/auth';
import HomePage from './pages/home';
import { ProtectedRoute } from './components/protected-route';

function App() {
  return (
    <BrowserRouter>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
