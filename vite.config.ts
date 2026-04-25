import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// 部署到 GitHub Pages 子路径时设置 BASE_PATH，例如 "/MeiTuan-AI-coding/"。
// 本地开发或自定义域部署时留空。
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
