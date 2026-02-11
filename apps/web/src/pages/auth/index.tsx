import { bindServices } from '@rabjs/react';
import { AuthPage } from './auth';

/**
 * Auth page entry - registers AuthService at page level
 * Note: AuthService is also registered globally in main.tsx
 */
const AuthPageWithServices = bindServices(AuthPage, []);
export default AuthPageWithServices;
