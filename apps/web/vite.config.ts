import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Determine output directory based on build target
const isElectron = process.env.ELECTRON === 'true';
const outDir = isElectron
  ? path.resolve(__dirname, '../client/dist/web')
  : '../server/public';

// https://vite.dev/config/
export default defineConfig({
  base: isElectron ? './' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output to different locations based on target (Electron vs server)
    outDir,
    emptyOutDir: true,

    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor libraries
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('@headlessui')) {
              return 'vendor-ui';
            }
            if (id.includes('axios') || id.includes('@rabjs')) {
              return 'vendor-libs';
            }
            return 'vendor-other';
          }

          // Separate page chunks
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/(\w+)\//);
            if (match) {
              return `page-${match[1]}`;
            }
          }

          // Services
          if (id.includes('/services/')) {
            return 'services';
          }

          // Components
          if (id.includes('/components/')) {
            return 'components';
          }
        },
      },
    },

    // Minimize
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

    // Inline small static imports
    assetsInlineLimit: 4096,

    // CSS code splitting
    cssCodeSplit: true,

    // Source map for production debugging
    sourcemap: false,

    // Optimize chunk size threshold
    chunkSizeWarningLimit: 1000,

    // Report compressed size
    reportCompressedSize: false,
  },
});
