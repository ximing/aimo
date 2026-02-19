import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

// Vite Dev Server URL for the web app (when running in development)
const WEB_APP_DEV_URL = process.env.AIMO_WEB_DEV_URL ?? 'http://localhost:5173';

export default defineConfig({
  define: {
    // Inject the dev server URL at build time so it's available in the main process
    'process.env.VITE_DEV_SERVER_URL': JSON.stringify(WEB_APP_DEV_URL),
  },
  plugins: [
    electron({
      main: {
        entry: 'src/main/index.ts',
        onstart({ startup }) {
          process.env.VITE_DEV_SERVER_URL = WEB_APP_DEV_URL;
          startup();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    }),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  appType: 'custom',
});
