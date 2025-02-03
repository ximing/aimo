import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.', // 指定项目根目录
  base: '/', // 指定部署时的基础路径
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173, // 开发服务器端口
    proxy: {
      // '/api': {
      //   target: 'http://222.128.65.91:12137',
      //   // target: 'https://aimo.delu.life:1443',
      //   changeOrigin: true,
      // },
      // '/uploads': {
      //   target: 'https://aimo.delu.life:1443',
      //   changeOrigin: true,
      // },
      '/api': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist', // 构建输出目录
    assetsDir: 'assets', // 静态资源目录
    sourcemap: true, // 生成 sourcemap
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
});
