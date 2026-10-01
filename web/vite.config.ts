import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发阶段只启用 React 和本地接口代理，业务构建配置按需补充。
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      // 保留完整的接口路径，与 Gin 的 /api/v1 路由保持一致。
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
