import { Navigate } from 'react-router';
import { useService } from '@rabjs/react';
import { AuthService } from '../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Component
 * Redirects to /auth if user is not authenticated
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const authService = useService(AuthService);

  if (!authService.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
