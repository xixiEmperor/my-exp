import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// 使用相对资源路径，构建结果可以放在 CDN 的任意版本目录下。
export default defineConfig({
    plugins: [react()],
    base: './',
    // demo 独立启动，避免占用主站的 5173 端口。
    server: { host: '127.0.0.1', port: 5174, strictPort: true },
    preview: { host: '127.0.0.1', port: 4174, strictPort: true },
});
