import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';

// 开发阶段只启用 React 和本地接口代理，业务构建配置按需补充。
export default defineConfig({
    plugins: [
        react(),
        visualizer({
            filename: 'stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
        }),
    ],
    // TextMate Worker 包含动态导入，使用 ES 模块格式才能完成构建。
    worker: { format: 'es' },
    // 默认扩展通过 import.meta.url 加载语法和主题文件，交给 Vite 保留资源地址。
    optimizeDeps: {
        exclude: [
            '@codingame/monaco-vscode-json-default-extension',
            // TSX 和 Markdown 的语法资源同样需要保留扩展内的原始地址。
            '@codingame/monaco-vscode-typescript-basics-default-extension',
            '@codingame/monaco-vscode-markdown-basics-default-extension',
            '@codingame/monaco-vscode-theme-defaults-default-extension',
            '@codingame/monaco-vscode-textmate-service-override',
        ],
    },

    // .cur 光标素材不在 Vite 默认素材类型里，补上才能被当作资源打包。
    assetsInclude: ['**/*.cur'],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@/assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
        },
    },
    server: {
        host: 'localhost',
        port: 5173,
    },
});
