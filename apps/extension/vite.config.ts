import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep the directory structure for content and background scripts
          if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
            return '[name]/index.js';
          }
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.html')) {
            return '[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
    // Don't minify in development mode for easier debugging
    minify: true,
    sourcemap: true,
  },
  // Configure public directory for static assets
  publicDir: 'public',
});
