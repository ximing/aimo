import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bindServices, register, resolve, RSRoot, RSStrict } from '@rabjs/react';
import './index.css';
import App from './App.tsx';
import { AuthService } from './services/auth.service';
import { MemoService } from './services/memo.service.ts';
import { ThemeService } from './services/theme.service';
import { AttachmentService } from './services/attachment.service';
import { CategoryService } from './services/category.service';
/**
 * Register services globally
 * These are accessible throughout the entire application
 */
const AppWithServices = bindServices(App, []);
register(AttachmentService);
register(AuthService);
register(MemoService);
register(ThemeService);
register(CategoryService)
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
