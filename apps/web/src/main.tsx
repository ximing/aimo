import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bindServices, register, resolve, RSRoot, RSStrict } from '@rabjs/react';
import './index.css';
import App from './App.tsx';

import { AttachmentService } from './services/attachment.service';
import { AuthService } from './services/auth.service';
import { CategoryService } from './services/category.service';
import { ExploreService } from './services/explore.service';
import { MemoService } from './services/memo.service.ts';
import { ThemeService } from './services/theme.service';
import { ToastService } from './services/toast.service';
/**
 * Register services globally
 * These are accessible throughout the entire application
 */
const AppWithServices = bindServices(App, []);
register(AttachmentService);
register(AuthService);
register(CategoryService);
register(ExploreService);
register(MemoService);
register(ThemeService);
register(ToastService);
// Initialize theme before rendering
resolve(ThemeService).loadTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RSRoot>
      <RSStrict>
        <AppWithServices />
      </RSStrict>
    </RSRoot>
  </StrictMode>
);
