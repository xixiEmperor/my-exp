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
            open: false,
            gzipSize: true,
            brotliSize: true,
        }),
    ],
    // TextMate Worker 包含动态导入，使用 ES 模块格式才能完成构建。
    worker: { format: 'es' },
    // 统一排除 @codingame/monaco-vscode-* 的预构建，避免排除 TextMate/扩展后与预构建的 api 产生双份 TokenizationRegistry 实例。
    optimizeDeps: {
        exclude: [
            '@codingame/monaco-vscode-api',
            '@codingame/monaco-vscode-configuration-service-override',
            '@codingame/monaco-vscode-explorer-service-override',
            '@codingame/monaco-vscode-files-service-override',
            '@codingame/monaco-vscode-languages-service-override',
            '@codingame/monaco-vscode-textmate-service-override',
            '@codingame/monaco-vscode-theme-service-override',
            '@codingame/monaco-vscode-views-service-override',
            '@codingame/monaco-vscode-json-default-extension',
            '@codingame/monaco-vscode-typescript-basics-default-extension',
            '@codingame/monaco-vscode-markdown-basics-default-extension',
            '@codingame/monaco-vscode-css-default-extension',
            '@codingame/monaco-vscode-scss-default-extension',
            '@codingame/monaco-vscode-html-default-extension',
            '@codingame/monaco-vscode-go-default-extension',
            '@codingame/monaco-vscode-yaml-default-extension',
            '@codingame/monaco-vscode-shellscript-default-extension',
            '@codingame/monaco-vscode-sql-default-extension',
            '@codingame/monaco-vscode-theme-defaults-default-extension',
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
