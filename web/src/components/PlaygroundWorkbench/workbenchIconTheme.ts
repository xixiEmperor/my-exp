import {
    registerExtension,
    type RegisterLocalExtensionResult,
} from '@codingame/monaco-vscode-api/extensions';

export const ZHIYE_ICON_THEME_ID = 'zhiye-studio-icons';

// 统一将 16x16 矢量图标包装成完整的 SVG 源码，供 VS Code 图标主题直接通过 Blob URL 挂载。
function svgWrap(inner: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none">${inner}</svg>`;
}

// 文件夹闭合与展开图形生成器，支持按语义目录切换柔和色板。
function folderSvg(fill: string, accent: string, open = false): string {
    if (open) {
        return svgWrap(
            `<path d="M1.5 3.6C1.5 2.99 1.99 2.5 2.6 2.5H6.1L7.45 4H13.4C14.01 4 14.5 4.49 14.5 5.1V6.2H3.35L1.5 12.1V3.6Z" fill="${fill}" opacity="0.88"/>` +
                `<path d="M2.85 6.4H14.65C15.05 6.4 15.33 6.79 15.2 7.17L13.72 12.42C13.57 12.94 13.1 13.3 12.56 13.3H2.05C1.65 13.3 1.37 12.91 1.5 12.53L2.85 6.4Z" fill="${accent}"/>`,
        );
    }

    return svgWrap(
        `<path d="M1.5 3.7C1.5 3.04 2.04 2.5 2.7 2.5H6.15L7.55 4.05H13.3C13.96 4.05 14.5 4.59 14.5 5.25V12.3C14.5 12.96 13.96 13.5 13.3 13.5H2.7C2.04 13.5 1.5 12.96 1.5 12.3V3.7Z" fill="${fill}"/>` +
            `<path d="M1.5 5.4H14.5V12.3C14.5 12.96 13.96 13.5 13.3 13.5H2.7C2.04 13.5 1.5 12.96 1.5 12.3V5.4Z" fill="${accent}" opacity="0.9"/>`,
    );
}

// 各文件类型与目录类型的矢量图标定义，覆盖前端、Go 后端、构建配置、锁文件、样式与脚本。
const RAW_ICONS: Record<string, string> = {
    // 目录图标（默认 + 常见工程目录语义色）
    _folder: folderSvg('#64748b', '#94a3b8', false),
    _folder_open: folderSvg('#64748b', '#cbd5e1', true),
    _root_folder: folderSvg('#4f46e5', '#818cf8', false),
    _root_folder_open: folderSvg('#4f46e5', '#a5b4fc', true),
    _folder_src: folderSvg('#059669', '#34d399', false),
    _folder_src_open: folderSvg('#059669', '#6ee7b7', true),
    _folder_web: folderSvg('#2563eb', '#60a5fa', false),
    _folder_web_open: folderSvg('#2563eb', '#93c5fd', true),
    _folder_server: folderSvg('#0891b2', '#22d3ee', false),
    _folder_server_open: folderSvg('#0891b2', '#67e8f9', true),
    _folder_ui: folderSvg('#7c3aed', '#a78bfa', false),
    _folder_ui_open: folderSvg('#7c3aed', '#c4b5fd', true),
    _folder_logic: folderSvg('#d97706', '#fbbf24', false),
    _folder_logic_open: folderSvg('#d97706', '#fcd34d', true),
    _folder_style: folderSvg('#db2777', '#f472b6', false),
    _folder_style_open: folderSvg('#db2777', '#f9a8d4', true),

    // 默认文件兜底图标
    _file: svgWrap(
        `<path d="M3.5 2.3C3.5 1.86 3.86 1.5 4.3 1.5H9.6L12.5 4.4V13.7C12.5 14.14 12.14 14.5 11.7 14.5H4.3C3.86 14.5 3.5 14.14 3.5 13.7V2.3Z" stroke="#94a3b8" stroke-width="1.2" fill="#1e293b"/>` +
            `<path d="M9.4 1.6V4.6H12.4" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),

    // React TSX / JSX 原子轨道图标
    _react_ts: svgWrap(
        `<circle cx="8" cy="8" r="1.45" fill="#38bdf8"/>` +
            `<ellipse cx="8" cy="8" rx="6.2" ry="2.45" stroke="#38bdf8" stroke-width="1.1"/>` +
            `<ellipse cx="8" cy="8" rx="6.2" ry="2.45" transform="rotate(60 8 8)" stroke="#38bdf8" stroke-width="1.1"/>` +
            `<ellipse cx="8" cy="8" rx="6.2" ry="2.45" transform="rotate(120 8 8)" stroke="#38bdf8" stroke-width="1.1"/>`,
    ),
    _react_js: svgWrap(
        `<circle cx="8" cy="8" r="1.45" fill="#67e8f9"/>` +
            `<ellipse cx="8" cy="8" rx="6.2" ry="2.45" stroke="#22d3ee" stroke-width="1.1"/>` +
            `<ellipse cx="8" cy="8" rx="6.2" ry="2.45" transform="rotate(60 8 8)" stroke="#22d3ee" stroke-width="1.1"/>` +
            `<ellipse cx="8" cy="8" rx="6.2" ry="2.45" transform="rotate(120 8 8)" stroke="#22d3ee" stroke-width="1.1"/>`,
    ),

    // TypeScript 徽章
    _ts: svgWrap(
        `<rect x="1.5" y="1.5" width="13" height="13" rx="2.6" fill="#2563eb"/>` +
            `<path d="M4.1 6.2H8.1M6.1 6.2V12.1" stroke="#ffffff" stroke-width="1.45" stroke-linecap="round"/>` +
            `<path d="M12.1 6.8C11.7 6.35 11.1 6.15 10.45 6.15C9.55 6.15 9 6.6 9 7.25C9 7.95 9.55 8.22 10.55 8.55C11.65 8.92 12.25 9.32 12.25 10.3C12.25 11.35 11.45 12.05 10.25 12.05C9.45 12.05 8.85 11.8 8.4 11.3" stroke="#ffffff" stroke-width="1.35" stroke-linecap="round"/>`,
    ),

    // TypeScript 声明文件 (.d.ts)
    _dts: svgWrap(
        `<rect x="1.5" y="1.5" width="13" height="13" rx="2.6" fill="#1d4ed8" stroke="#93c5fd" stroke-width="0.9"/>` +
            `<path d="M4.2 5.8H6.1C7.45 5.8 8.3 6.65 8.3 8.05C8.3 9.45 7.45 10.3 6.1 10.3H4.2V5.8Z" stroke="#dbeafe" stroke-width="1.3" stroke-linejoin="round"/>` +
            `<circle cx="11.2" cy="10.1" r="1" fill="#93c5fd"/>`,
    ),

    // JavaScript 徽章
    _js: svgWrap(
        `<rect x="1.5" y="1.5" width="13" height="13" rx="2.6" fill="#eab308"/>` +
            `<path d="M6.9 6.1V10.5C6.9 11.45 6.3 12 5.45 12C4.85 12 4.4 11.75 4.15 11.3" stroke="#18181b" stroke-width="1.4" stroke-linecap="round"/>` +
            `<path d="M12.05 6.75C11.65 6.3 11.1 6.1 10.45 6.1C9.6 6.1 9.05 6.55 9.05 7.2C9.05 7.9 9.6 8.18 10.55 8.5C11.6 8.86 12.2 9.25 12.2 10.22C12.2 11.25 11.42 11.98 10.25 11.98C9.48 11.98 8.9 11.72 8.45 11.25" stroke="#18181b" stroke-width="1.35" stroke-linecap="round"/>`,
    ),

    // Vue 组件
    _vue: svgWrap(
        `<path d="M1.8 3H4.5L8 9.1L11.5 3H14.2L8 13.6L1.8 3Z" fill="#42b883"/>` +
            `<path d="M4.5 3H6.6L8 5.5L9.4 3H11.5L8 9.1L4.5 3Z" fill="#35495e"/>`,
    ),

    // Go 源码文件
    _go: svgWrap(
        `<rect x="1.2" y="2.5" width="13.6" height="11" rx="2.8" fill="#0891b2"/>` +
            `<path d="M7.3 6.3C6.85 5.85 6.25 5.65 5.55 5.65C4.25 5.65 3.35 6.6 3.35 8C3.35 9.4 4.25 10.35 5.6 10.35C6.55 10.35 7.3 9.85 7.45 8.85H5.7" stroke="#ecfeff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` +
            `<circle cx="10.85" cy="8" r="2.25" stroke="#ecfeff" stroke-width="1.3"/>`,
    ),

    // Go Module (go.mod / go.sum)
    _gomod: svgWrap(
        `<path d="M8 1.6L13.6 4.8V11.2L8 14.4L2.4 11.2V4.8L8 1.6Z" fill="#0e7490" stroke="#22d3ee" stroke-width="1.1"/>` +
            `<path d="M8 1.8V8M8 8L13.4 4.9M8 8L2.6 4.9" stroke="#a5f3fc" stroke-width="1.05"/>`,
    ),

    // CSS 样式表
    _css: svgWrap(
        `<rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2.6" fill="#0284c7"/>` +
            `<path d="M5.7 4.4L4.7 11.6M11.1 4.4L10.1 11.6M3.9 6.6H12.1M3.6 9.4H11.8" stroke="#e0f2fe" stroke-width="1.25" stroke-linecap="round"/>`,
    ),

    // SCSS / Sass 预处理器样式
    _scss: svgWrap(
        `<rect x="1.8" y="1.8" width="12.4" height="12.4" rx="6.2" fill="#db2777"/>` +
            `<path d="M10.3 5.3C9.6 4.75 8.55 4.55 7.5 4.85C6.2 5.22 5.6 6.2 6.2 7.05C6.75 7.8 8.85 7.95 9.6 8.85C10.35 9.75 9.65 11.15 7.95 11.35C6.7 11.5 5.65 11 5.25 10.3" stroke="#fce7f3" stroke-width="1.35" stroke-linecap="round"/>`,
    ),

    // HTML 模板文件
    _html: svgWrap(
        `<path d="M2.4 2H13.6L12.6 12.5L8 14L3.4 12.5L2.4 2Z" fill="#ea580c"/>` +
            `<path d="M6.2 5.8L4.4 7.8L6.2 9.8M9.8 5.8L11.6 7.8L9.8 9.8" stroke="#fff7ed" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),

    // JSON 数据与配置
    _json: svgWrap(
        `<path d="M5.6 2.6C4.4 2.6 3.9 3.2 3.9 4.2V6.3C3.9 7.1 3.3 7.7 2.5 8C3.3 8.3 3.9 8.9 3.9 9.7V11.8C3.9 12.8 4.4 13.4 5.6 13.4" stroke="#fbbf24" stroke-width="1.4" stroke-linecap="round"/>` +
            `<path d="M10.4 2.6C11.6 2.6 12.1 3.2 12.1 4.2V6.3C12.1 7.1 12.7 7.7 13.5 8C12.7 8.3 12.1 8.9 12.1 9.7V11.8C12.1 12.8 11.6 13.4 10.4 13.4" stroke="#fbbf24" stroke-width="1.4" stroke-linecap="round"/>`,
    ),

    // package.json 包描述清单
    _package: svgWrap(
        `<path d="M8 1.7L13.7 4.7V11.3L8 14.3L2.3 11.3V4.7L8 1.7Z" fill="#166534" stroke="#4ade80" stroke-width="1.15"/>` +
            `<path d="M2.5 4.8L8 7.8L13.5 4.8M8 7.8V14.1M5.2 3.2L10.7 6.2" stroke="#bbf7d0" stroke-width="1.1" stroke-linecap="round"/>`,
    ),

    // 依赖锁文件 (pnpm-lock.yaml / package-lock.json / yarn.lock)
    _lock: svgWrap(
        `<rect x="3.2" y="7" width="9.6" height="7" rx="1.8" fill="#d97706"/>` +
            `<path d="M5.3 7V5.1C5.3 3.6 6.5 2.4 8 2.4C9.5 2.4 10.7 3.6 10.7 5.1V7" stroke="#fbbf24" stroke-width="1.4" stroke-linecap="round"/>` +
            `<circle cx="8" cy="10.5" r="1.1" fill="#fef3c7"/>`,
    ),

    // tsconfig.json / jsconfig.json
    _tsconfig: svgWrap(
        `<rect x="1.8" y="1.8" width="12.4" height="12.4" rx="2.6" fill="#1e40af" stroke="#60a5fa" stroke-width="1"/>` +
            `<circle cx="8" cy="8" r="2.2" stroke="#dbeafe" stroke-width="1.3"/>` +
            `<path d="M8 3.9V5M8 11V12.1M3.9 8H5M11 8H12.1M5.1 5.1L5.9 5.9M10.1 10.1L10.9 10.9M10.9 5.1L10.1 5.9M5.9 10.1L5.1 10.9" stroke="#93c5fd" stroke-width="1.2" stroke-linecap="round"/>`,
    ),

    // Vite 构建配置 (vite.config.ts)
    _vite: svgWrap(
        `<path d="M13.8 2.6L8.3 13.9C8.1 14.3 7.5 14.3 7.3 13.9L2.2 2.6C2 2.2 2.4 1.8 2.8 1.9L8 3.2L13.2 1.9C13.6 1.8 14 2.2 13.8 2.6Z" fill="#7c3aed"/>` +
            `<path d="M9.6 2.1L6.1 8.4H8.5L7.1 12.4L11.2 6.9H8.7L9.6 2.1Z" fill="#facc15"/>`,
    ),

    // YAML / TOML 配置文件
    _yaml: svgWrap(
        `<path d="M3 4.2H13M3 8H13M3 11.8H13" stroke="#fb923c" stroke-width="1.3" stroke-linecap="round"/>` +
            `<circle cx="6" cy="4.2" r="1.6" fill="#fed7aa"/>` +
            `<circle cx="10.5" cy="8" r="1.6" fill="#fb923c"/>` +
            `<circle cx="7.2" cy="11.8" r="1.6" fill="#fed7aa"/>`,
    ),

    // Markdown 普通文档
    _markdown: svgWrap(
        `<rect x="1.5" y="2.8" width="13" height="10.4" rx="2" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.1"/>` +
            `<path d="M3.8 10.4V5.6L5.8 8.2L7.8 5.6V10.4M11.2 5.6V10.2M9.7 8.7L11.2 10.3L12.7 8.7" stroke="#dbeafe" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),

    // README 导读文档
    _readme: svgWrap(
        `<circle cx="8" cy="8" r="6.2" fill="#0369a1" stroke="#38bdf8" stroke-width="1.15"/>` +
            `<path d="M8 7.3V11.2" stroke="#e0f2fe" stroke-width="1.5" stroke-linecap="round"/>` +
            `<circle cx="8" cy="4.9" r="0.95" fill="#e0f2fe"/>`,
    ),

    // Git 忽略与属性配置
    _git: svgWrap(
        `<circle cx="5" cy="4.2" r="1.5" stroke="#f97316" stroke-width="1.3"/>` +
            `<circle cx="5" cy="11.8" r="1.5" stroke="#f97316" stroke-width="1.3"/>` +
            `<circle cx="11.2" cy="7.8" r="1.5" stroke="#f97316" stroke-width="1.3"/>` +
            `<path d="M5 5.7V10.3M5 6.4C5 7.5 6 7.8 9.7 7.8" stroke="#f97316" stroke-width="1.3" stroke-linecap="round"/>`,
    ),

    // 环境变量文件 (.env*)
    _env: svgWrap(
        `<circle cx="6" cy="8" r="3.1" stroke="#eab308" stroke-width="1.35"/>` +
            `<path d="M9.1 8H14M12 8V10.2M13.8 8V9.8" stroke="#eab308" stroke-width="1.35" stroke-linecap="round"/>`,
    ),

    // SQL 数据库脚本
    _sql: svgWrap(
        `<ellipse cx="8" cy="3.8" rx="5.2" ry="2" fill="#9333ea" stroke="#d8b4fe" stroke-width="1.1"/>` +
            `<path d="M2.8 3.8V12C2.8 13.1 5.1 14 8 14C10.9 14 13.2 13.1 13.2 12V3.8" stroke="#d8b4fe" stroke-width="1.1"/>` +
            `<path d="M2.8 7.9C2.8 9 5.1 9.9 8 9.9C10.9 9.9 13.2 9 13.2 7.9" stroke="#d8b4fe" stroke-width="1.1"/>`,
    ),

    // Shell / 批处理脚本
    _shell: svgWrap(
        `<rect x="1.6" y="2.4" width="12.8" height="11.2" rx="2.2" fill="#14532d" stroke="#4ade80" stroke-width="1.1"/>` +
            `<path d="M4.3 6L6.8 8L4.3 10M8 10.2H11.4" stroke="#dcfce7" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),

    // 图像与矢量素材
    _image: svgWrap(
        `<rect x="1.8" y="2.4" width="12.4" height="11.2" rx="2.1" fill="#064e3b" stroke="#34d399" stroke-width="1.1"/>` +
            `<circle cx="5.4" cy="6" r="1.2" fill="#fde68a"/>` +
            `<path d="M2.6 12.2L6.2 8.8L8.8 11.1L10.8 9.3L13.4 12.2" stroke="#6ee7b7" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),

    // ESLint / Prettier 规范配置
    _lint: svgWrap(
        `<path d="M8 1.8L13.4 4.9V11.1L8 14.2L2.6 11.1V4.9L8 1.8Z" fill="#3730a3" stroke="#818cf8" stroke-width="1.15"/>` +
            `<circle cx="8" cy="8" r="2.3" fill="#c7d2fe"/>`,
    ),

    // Docker 容器配置
    _docker: svgWrap(
        `<rect x="3" y="6.8" width="10.2" height="5.2" rx="2.2" fill="#0284c7"/>` +
            `<rect x="4.4" y="4.4" width="2" height="2" rx="0.4" fill="#38bdf8"/>` +
            `<rect x="6.9" y="4.4" width="2" height="2" rx="0.4" fill="#38bdf8"/>` +
            `<rect x="9.4" y="4.4" width="2" height="2" rx="0.4" fill="#38bdf8"/>`,
    ),
};

let iconExtensionRegistered = false;

// 向 monaco-vscode-api 注册演练场专属文件类型与目录图标主题扩展，整个生命周期只执行一次。
export function ensureWorkbenchIconTheme(): void {
    if (iconExtensionRegistered) {
        return;
    }

    iconExtensionRegistered = true;

    const iconDefinitions: Record<string, { iconPath: string }> = {};

    for (const key of Object.keys(RAW_ICONS)) {
        iconDefinitions[key] = {
            iconPath: `./icons/${key}.svg`,
        };
    }

    const themeDocument = {
        iconDefinitions,
        folder: '_folder',
        folderExpanded: '_folder_open',
        rootFolder: '_root_folder',
        rootFolderExpanded: '_root_folder_open',
        file: '_file',
        folderNames: {
            src: '_folder_src',
            web: '_folder_web',
            client: '_folder_web',
            public: '_folder_web',
            server: '_folder_server',
            cmd: '_folder_server',
            internal: '_folder_server',
            api: '_folder_server',
            pkg: '_folder_server',
            components: '_folder_ui',
            views: '_folder_ui',
            pages: '_folder_ui',
            features: '_folder_ui',
            hooks: '_folder_logic',
            utils: '_folder_logic',
            lib: '_folder_logic',
            service: '_folder_logic',
            services: '_folder_logic',
            handler: '_folder_logic',
            handlers: '_folder_logic',
            repo: '_folder_logic',
            repository: '_folder_logic',
            stores: '_folder_logic',
            model: '_folder_logic',
            dto: '_folder_logic',
            styles: '_folder_style',
            assets: '_folder_style',
            icons: '_folder_style',
            theme: '_folder_style',
        },
        folderNamesExpanded: {
            src: '_folder_src_open',
            web: '_folder_web_open',
            client: '_folder_web_open',
            public: '_folder_web_open',
            server: '_folder_server_open',
            cmd: '_folder_server_open',
            internal: '_folder_server_open',
            api: '_folder_server_open',
            pkg: '_folder_server_open',
            components: '_folder_ui_open',
            views: '_folder_ui_open',
            pages: '_folder_ui_open',
            features: '_folder_ui_open',
            hooks: '_folder_logic_open',
            utils: '_folder_logic_open',
            lib: '_folder_logic_open',
            service: '_folder_logic_open',
            services: '_folder_logic_open',
            handler: '_folder_logic_open',
            handlers: '_folder_logic_open',
            repo: '_folder_logic_open',
            repository: '_folder_logic_open',
            stores: '_folder_logic_open',
            model: '_folder_logic_open',
            dto: '_folder_logic_open',
            styles: '_folder_style_open',
            assets: '_folder_style_open',
            icons: '_folder_style_open',
            theme: '_folder_style_open',
        },
        fileExtensions: {
            tsx: '_react_ts',
            jsx: '_react_js',
            'd.ts': '_dts',
            ts: '_ts',
            mts: '_ts',
            cts: '_ts',
            js: '_js',
            mjs: '_js',
            cjs: '_js',
            vue: '_vue',
            go: '_go',
            mod: '_gomod',
            sum: '_gomod',
            css: '_css',
            less: '_css',
            scss: '_scss',
            sass: '_scss',
            'module.scss': '_scss',
            'module.css': '_css',
            html: '_html',
            htm: '_html',
            json: '_json',
            jsonc: '_json',
            yaml: '_yaml',
            yml: '_yaml',
            toml: '_yaml',
            ini: '_yaml',
            conf: '_yaml',
            md: '_markdown',
            mdx: '_markdown',
            sql: '_sql',
            sh: '_shell',
            bash: '_shell',
            zsh: '_shell',
            bat: '_shell',
            cmd: '_shell',
            ps1: '_shell',
            svg: '_image',
            png: '_image',
            jpg: '_image',
            jpeg: '_image',
            webp: '_image',
            gif: '_image',
            ico: '_image',
            cur: '_image',
            lock: '_lock',
        },
        fileNames: {
            'package.json': '_package',
            'pnpm-lock.yaml': '_lock',
            'package-lock.json': '_lock',
            'yarn.lock': '_lock',
            'bun.lockb': '_lock',
            'tsconfig.json': '_tsconfig',
            'tsconfig.node.json': '_tsconfig',
            'tsconfig.app.json': '_tsconfig',
            'jsconfig.json': '_tsconfig',
            'vite.config.ts': '_vite',
            'vite.config.js': '_vite',
            'vite.config.mts': '_vite',
            'go.mod': '_gomod',
            'go.sum': '_gomod',
            'go.work': '_gomod',
            'readme.md': '_readme',
            '.gitignore': '_git',
            '.gitattributes': '_git',
            '.gitkeep': '_git',
            '.env': '_env',
            '.env.example': '_env',
            '.env.local': '_env',
            '.env.development': '_env',
            '.env.production': '_env',
            dockerfile: '_docker',
            'docker-compose.yml': '_docker',
            'docker-compose.yaml': '_docker',
            'eslint.config.js': '_lint',
            'eslint.config.mjs': '_lint',
            'eslint.config.ts': '_lint',
            '.eslintrc': '_lint',
            '.eslintrc.json': '_lint',
            '.eslintrc.cjs': '_lint',
            '.prettierrc': '_lint',
            '.prettierrc.json': '_lint',
            '.prettierignore': '_lint',
            'prettier.config.js': '_lint',
        },
        languageIds: {
            typescriptreact: '_react_ts',
            javascriptreact: '_react_js',
            typescript: '_ts',
            javascript: '_js',
            go: '_go',
            css: '_css',
            scss: '_scss',
            html: '_html',
            json: '_json',
            jsonc: '_json',
            yaml: '_yaml',
            markdown: '_markdown',
            sql: '_sql',
            shellscript: '_shell',
        },
    };

    const manifest = {
        name: 'zhiye-studio-icon-theme',
        displayName: 'Zhiye Studio File Icons',
        description: 'File and folder icon theme for Scenario Playground Workbench',
        version: '1.0.0',
        publisher: 'zhiye',
        engines: { vscode: '*' },
        contributes: {
            iconThemes: [
                {
                    id: ZHIYE_ICON_THEME_ID,
                    label: 'Zhiye Studio Icons',
                    path: './fileicons/zhiye-icon-theme.json',
                },
            ],
        },
    };

    const { registerFileUrl } = registerExtension(manifest, undefined, {
        system: true,
    }) as RegisterLocalExtensionResult;

    const themeJsonText = JSON.stringify(themeDocument);
    const themeBlobUrl = URL.createObjectURL(
        new Blob([themeJsonText], { type: 'application/json' }),
    );

    registerFileUrl('fileicons/zhiye-icon-theme.json', themeBlobUrl, {
        mimeType: 'application/json',
        size: themeJsonText.length,
    });

    for (const [iconKey, svgContent] of Object.entries(RAW_ICONS)) {
        const svgBlobUrl = URL.createObjectURL(
            new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' }),
        );

        registerFileUrl(`fileicons/icons/${iconKey}.svg`, svgBlobUrl, {
            mimeType: 'image/svg+xml',
            size: svgContent.length,
        });
    }
}
