import { CDN_BASE_URL } from '@/constants/articles';
import type { DemoResource } from '@/types/demos';

// 预览产物固定发布在 demos/<slug>/<verison>/preview/index.html，与后台上传路径保持一致。
// 路径段单独编码，避免 slug 或版本号中出现特殊字符时拼出错误地址。
export function getDemoPreviewUrl(demo: Pick<DemoResource, 'slug' | 'verison'>): string {
    const slug = encodeURIComponent(demo.slug);
    const verison = encodeURIComponent(demo.verison);

    return `${CDN_BASE_URL}/demos/${slug}/${verison}/preview/index.html`;
}

// 源码按相对路径段逐级编码后拼接 CDN 地址，保留目录斜杠并兼容空格或中文文件名。
export function getDemoSourceUrl(
    demo: Pick<DemoResource, 'slug' | 'verison'>,
    relativePath: string,
): string {
    const slug = encodeURIComponent(demo.slug);
    const verison = encodeURIComponent(demo.verison);

    const encodedSegments = relativePath
        .split('/')
        .filter((segment) => segment.length > 0)
        .map((segment) => encodeURIComponent(segment))
        .join('/');

    return `${CDN_BASE_URL}/demos/${slug}/${verison}/sources/${encodedSegments}`;
}

// 按 x.x.x 三段数字比较版本号，保证 1.10.0 排在 1.2.0 之后（降序排列最新优先时调用反向结果）。
export function compareDemoVerison(left: string, right: string): number {
    const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
    const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0);
    const maxLen = Math.max(leftParts.length, rightParts.length, 3);

    for (let index = 0; index < maxLen; index += 1) {
        const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);

        if (diff !== 0) {
            return diff;
        }
    }

    return 0;
}

const ENTRY_PRIORITY_PATTERNS: readonly RegExp[] = [
    /(?:^|\/)src\/App\.(?:tsx|jsx|vue|ts|js)$/i,
    /(?:^|\/)App\.(?:tsx|jsx|vue|ts|js)$/i,
    /(?:^|\/)src\/main\.(?:tsx|jsx|ts|js)$/i,
    /(?:^|\/)src\/index\.(?:tsx|jsx|ts|js)$/i,
    /(?:^|\/)routes\.go$/i,
    /(?:^|\/)main\.go$/i,
    /(?:^|\/)index\.html$/i,
    /(?:^|\/)README\.md$/i,
];

// 从当前版本已登记的 file_paths 中挑选最适合首次展开阅读的入口源码文件。
export function pickDefaultEntryFile(filePaths: readonly string[]): string | null {
    if (filePaths.length === 0) {
        return null;
    }

    for (const pattern of ENTRY_PRIORITY_PATTERNS) {
        const matched = filePaths.find((filePath) => pattern.test(filePath));

        if (matched) {
            return matched;
        }
    }

    return filePaths[0] ?? null;
}

// 根据路径后缀或特殊文件名推断状态栏可读的语言标识。
export function inferFileLanguageLabel(filePath: string): string {
    const normalized = filePath.toLowerCase();
    const segments = normalized.split('/');
    const baseName = segments[segments.length - 1] ?? normalized;

    if (baseName === 'go.mod' || baseName === 'go.sum') {
        return 'Go Module';
    }

    if (baseName === 'dockerfile') {
        return 'Dockerfile';
    }

    if (baseName.startsWith('.env')) {
        return 'Environment';
    }

    if (baseName === '.gitignore' || baseName === '.gitattributes') {
        return 'Git Config';
    }

    const dotIndex = baseName.lastIndexOf('.');
    const ext = dotIndex >= 0 ? baseName.slice(dotIndex + 1) : '';

    switch (ext) {
        case 'tsx':
            return 'TypeScript JSX';
        case 'ts':
        case 'mts':
        case 'cts':
            return 'TypeScript';
        case 'jsx':
            return 'JavaScript JSX';
        case 'js':
        case 'mjs':
        case 'cjs':
            return 'JavaScript';
        case 'vue':
            return 'Vue SFC';
        case 'go':
            return 'Go';
        case 'scss':
        case 'sass':
            return 'SCSS';
        case 'css':
        case 'less':
            return 'CSS';
        case 'html':
        case 'htm':
            return 'HTML';
        case 'json':
        case 'jsonc':
            return 'JSON';
        case 'yaml':
        case 'yml':
            return 'YAML';
        case 'md':
        case 'mdx':
            return 'Markdown';
        case 'sql':
            return 'SQL';
        case 'sh':
        case 'bash':
        case 'zsh':
        case 'bat':
        case 'cmd':
        case 'ps1':
            return 'Shell';
        case 'svg':
            return 'SVG';
        default:
            return 'UTF-8 Text';
    }
}
