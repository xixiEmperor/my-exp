import { readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { uploadFiles } from './r2-upload.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// 只接受稳定目录名与三段版本，避免上传到场景父目录。
const directoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
};

// 不跟随符号链接，防止把产物目录外的本机文件一起上传。
async function collectFiles(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error(`产物中不允许符号链接：${path}`);
        if (entry.isDirectory()) files.push(...(await collectFiles(path)));
        else if (entry.isFile()) files.push(path);
        else throw new Error(`不支持的产物类型：${path}`);
    }
    return files.sort();
}

async function main() {
    const { values } = parseArgs({
        options: {
            slug: { type: 'string' },
            implementation: { type: 'string' },
            verison: { type: 'string' },
            'dry-run': { type: 'boolean', default: false },
            help: { type: 'boolean', default: false },
        },
    });
    if (values.help) {
        console.log(
            'pnpm push:artifacts --slug <场景> --implementation <实现或default> --verison <x.x.x> [--dry-run]',
        );
        return;
    }
    const { slug, implementation, verison } = values;
    if (!directoryPattern.test(slug ?? '') || !directoryPattern.test(implementation ?? '')) {
        throw new Error('slug 和 implementation 必填，只能包含小写字母、数字和中间连字符');
    }
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(verison ?? '')) {
        throw new Error('verison 必填，格式为 x.x.x，例如 1.1.0');
    }

    // 优先使用文档中的 demos，同时支持现有 playground；重名时要求先整理目录。
    const candidates = [];
    for (const root of ['demos', 'playground']) {
        const path = join(
            repoRoot,
            root,
            slug,
            implementation === 'default' ? '' : implementation,
            'web',
            'dist',
        );
        try {
            if ((await stat(path)).isDirectory()) candidates.push(path);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }
    }
    if (candidates.length !== 1) {
        throw new Error(
            '未找到唯一的 web/dist，请先构建所选实现，并检查 demos 与 playground 是否重名',
        );
    }
    const dist = candidates[0];
    const files = await collectFiles(dist);
    if (!files.includes(join(dist, 'index.html'))) throw new Error('构建产物缺少 index.html');
    const prefix = `demos/${slug}/${verison}/`;
    console.log(`本地产物：${relative(repoRoot, dist)}`);
    console.log(`上传目录：${prefix}preview/，共 ${files.length} 个文件`);
    if (values['dry-run']) {
        for (const file of files)
            console.log(`${prefix}preview/${relative(dist, file).split('\\').join('/')}`);
        return;
    }

    // 预演无需凭证，真正推送时才加载 R2 客户端并检查环境配置。
    await uploadFiles(
        `${prefix}preview/`,
        files.map((file) => ({
            path: file,
            key: `${prefix}preview/${relative(dist, file).split('\\').join('/')}`,
            contentType: mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
        })),
    );
    console.log('产物推送完成，请在后台登记对应版本。');
}

// 异步错误统一给出非零退出码，供根目录命令与后续部署使用。
try {
    await main();
} catch (error) {
    console.error(`产物推送失败：${error.message}`);
    process.exitCode = 1;
}
