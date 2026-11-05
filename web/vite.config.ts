import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// 开发阶段只启用 React 和本地接口代理，业务构建配置按需补充。
export default defineConfig({
    plugins: [react()],

    // .cur 光标素材不在 Vite 默认素材类型里，补上才能被当作资源打包。
    assetsInclude: ['**/*.cur'],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@/assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
    },
});
