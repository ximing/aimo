import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useService, view } from '@rabjs/react';
import { AuthService } from '../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Waits for the session cookie before redirecting.
 * An OIDC callback sets the cookie and lands on /home with an empty local profile.
 */
export const ProtectedRoute = view(({ children }: ProtectedRouteProps) => {
  const authService = useService(AuthService);
  const [checked, setChecked] = useState(authService.isAuthenticated);

  useEffect(() => {
    if (authService.isAuthenticated) {
      setChecked(true);
      return;
    }
    let active = true;
    authService.checkAuth().finally(() => {
      if (active) setChecked(true);
    });
    return () => {
      active = false;
    };
  }, [authService]);

  if (!checked && !authService.isAuthenticated) {
    return null;
  }

  if (!authService.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
});
