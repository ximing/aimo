import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync, createWriteStream, readdirSync } from 'fs';
import archiver from 'archiver';

// Custom plugin to fix manifest.json paths and create zip
function chromeExtensionPlugin() {
  const isWatch = process.argv.includes('--watch');

  return {
    name: 'chrome-extension-plugin',
    async closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const manifestPath = resolve(distDir, 'manifest.json');

      if (!existsSync(manifestPath)) return;

      // Find actual JS files (not .map files)
      const assetsDir = resolve(distDir, 'assets');
      let backgroundJs = '',
        contentJs = '';

      if (existsSync(assetsDir)) {
        const files = readdirSync(assetsDir);
        files.forEach((file) => {
          if (!file.endsWith('.map') && file.endsWith('.js')) {
            if (file.includes('background')) backgroundJs = file;
            else if (file.includes('content')) contentJs = file;
          }
        });
      }

      // Fix manifest.json paths
      let manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

      if (manifest.content_scripts?.[0]?.js && contentJs) {
        manifest.content_scripts[0].js = [`assets/${contentJs}`];
      }

      if (manifest.background && backgroundJs) {
        manifest.background.service_worker = `assets/${backgroundJs}`;
      }

      if (manifest.action?.default_popup) {
        // popup HTML is at dist/src/popup/index.html
        manifest.action.default_popup = 'src/popup/index.html';
      }

      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Only create zip in non-watch mode
      if (!isWatch) {
        const output = createWriteStream(resolve(__dirname, 'dist.zip'));
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`\n✅ Extension packaged: dist.zip (${archive.pointer()} bytes)`);
        });

        archive.pipe(output);
        archive.directory(distDir, false);
        await archive.finalize();
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), chromeExtensionPlugin()],
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
    },
    minify: true,
    sourcemap: true,
    // Watch mode for development - writes to dist on file changes
    watch: process.env.VITE_DEV_WATCH === 'true' ? { include: 'src/**' } : null,
  },
  publicDir: 'public',
});
