import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { uploadFiles } from './r2-upload.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const directoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ignoredDirectories = new Set([
    'node_modules',
    'dist',
    '.git',
    '.vite',
    'coverage',
    'tmp',
    'logs',
    'bin',
]);
const decoder = new TextDecoder('utf-8', { fatal: true });

// 目录不存在时返回空值，读取权限等真实错误继续向外抛出。
async function getStat(path) {
    try {
        return await lstat(path);
    } catch (error) {
        if (error.code === 'ENOENT') return undefined;
        throw error;
    }
}

async function main() {
    const { values } = parseArgs({
        options: {
            slug: { type: 'string' },
            implementation: { type: 'string' },
            verison: { type: 'string' },
            exclude: { type: 'string', multiple: true, default: [] },
            'dry-run': { type: 'boolean', default: false },
            help: { type: 'boolean', default: false },
        },
    });

    if (values.help) {
        console.log(
            'pnpm push:sources --slug <场景> --implementation <实现或default> --verison <x.x.x> [--exclude <实现内相对路径>] [--dry-run]',
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

    // 排除规则相对于所选实现，匹配文件自身或目录中的全部子项。
    const excludes = values.exclude.map((value) => {
        const path = value.replaceAll('\\', '/').replace(/\/+$/, '');
        if (
            !path ||
            path.split('/').some((part) => !part || part === '.' || part === '..') ||
            /[:*?]/.test(path)
        ) {
            throw new Error(`排除项必须是相对文件或目录路径，不支持通配符：${value}`);
        }
        return path;
    });

    const candidates = [];
    for (const root of ['demos', 'playground']) {
        const scene = join(repoRoot, root, slug);
        const selected = implementation === 'default' ? scene : join(scene, implementation);
        const sceneStat = await getStat(scene);
        const selectedStat = await getStat(selected);

        if (sceneStat?.isSymbolicLink() || selectedStat?.isSymbolicLink()) {
            throw new Error('源码根目录不允许符号链接');
        }
        if (selectedStat?.isDirectory()) {
            candidates.push({ scene, selected });
        }
    }

    if (candidates.length !== 1) {
        throw new Error('未找到唯一实现目录，请检查 demos 与 playground 是否重名');
    }

    async function addFile(path) {
        const body = await readFile(path);
        // 只发布 UTF-8 原始文本，二进制和运行文件不进入只读源码目录。
        try {
            decoder.decode(body);
        } catch {
            console.log(`跳过非 UTF-8 文件：${relative(scene, path)}`);
            return;
        }
        if (body.includes(0)) {
            console.log(`跳过二进制文件：${relative(scene, path)}`);
            return;
        }
        files.push({ path, relativePath: relative(scene, path).replaceAll('\\', '/') });
    }

    async function collect(directory) {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name);
            const localPath = relative(selected, path).replaceAll('\\', '/');

            if (excludes.some((rule) => localPath === rule || localPath.startsWith(`${rule}/`))) {
                continue;
            }

            // 保留环境示例，排除真实环境配置、Git 信息和常见运行产物。
            if (
                entry.name === '.git' ||
                entry.name === '.env' ||
                (entry.name.startsWith('.env.') && !entry.name.endsWith('.example')) ||
                /\.(exe|log|tsbuildinfo|pem|key)$/.test(entry.name)
            ) {
                continue;
            }

            if (entry.isSymbolicLink()) {
                continue;
            }
            if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
                await collect(path);
            } else if (entry.isFile()) {
                await addFile(path);
            }
        }
    }

    await collect(selected);

    // 多实现场景的共同说明可以上传，其他实现的文件不参与扫描。
    if (implementation !== 'default') {
        const readme = join(scene, 'README.md');
        if ((await getStat(readme))?.isFile()) await addFile(readme);
    }

    files.sort((left, right) =>
        left.relativePath < right.relativePath
            ? -1
            : left.relativePath > right.relativePath
              ? 1
              : 0,
    );

    if (!files.length) throw new Error('排除后没有可上传的源码文件');

    const prefix = `demos/${slug}/${verison}/sources/`;
    console.log(`本地源码：${relative(repoRoot, selected)}`);
    console.log(`上传目录：${prefix}，共 ${files.length} 个文件`);
    console.log(`file_paths：${JSON.stringify(files.map((file) => file.relativePath))}`);

    if (values['dry-run']) {
        for (const file of files) console.log(`${prefix}${file.relativePath}`);
        return;
    }

    await uploadFiles(
        prefix,
        files.map((file) => ({
            path: file.path,
            key: `${prefix}${file.relativePath}`,
            // 原始 HTML 等源码也按文本提供，保留原文件字节和已有注释。
            contentType: 'text/plain; charset=utf-8',
        })),
    );
    console.log('源码推送完成，请使用相同实现、版本和排除规则登记资源。');
}

// 所有扫描和上传错误都使根目录命令失败，不把部分结果报告为成功。
try {
    await main();
} catch (error) {
    console.error(`源码推送失败：${error.message}`);
    process.exitCode = 1;
}
