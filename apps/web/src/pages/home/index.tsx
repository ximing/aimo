import { bindServices } from '@rabjs/react';
import { HomePage } from './home';

/**
 * Home page entry
 * All services (AuthService, MemoService, ThemeService) are already registered globally at app root
 * No need to register again at page level
 */
const HomePageWithServices = bindServices(HomePage, []);
export default HomePageWithServices;
