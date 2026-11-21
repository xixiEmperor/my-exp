import { readFile, stat } from 'node:fs/promises';

// 源码与产物共用官方 R2 上传接口，各自检查所属目录，允许同版本分别发布。
export async function uploadFiles(prefix, files) {
    for (const name of ['R2_ACCOUNT_ID', 'R2_BUCKET', 'CLOUDFLARE_API_TOKEN']) {
        if (!process.env[name]) {
            throw new Error(`缺少环境变量 ${name}，请参考 scripts/.env.example`);
        }
    }

    // 官方对象上传接口单文件最大 300 MB，上传前检查全部文件。
    for (const file of files) {
        if ((await stat(file.path)).size > 300_000_000) {
            throw new Error(`文件超过 Cloudflare API 的 300 MB 上传限制：${file.path}`);
        }
    }

    const { default: Cloudflare } = await import('cloudflare');
    const client = new Cloudflare({
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        // 写入失败时交给维护者检查，避免自动重试造成重复发布。
        maxRetries: 0,
    });
    const account_id = process.env.R2_ACCOUNT_ID;
    const bucket_name = process.env.R2_BUCKET;
    // 所属目录已有任何文件就停止，另一类资源可以单独上传。
    const existing = await client.r2.buckets.objects.list(bucket_name, {
        account_id,
        prefix,
        per_page: 1,
    });

    if (existing.result.length) {
        throw new Error(`资源目录 ${prefix} 已存在，不允许覆盖，请使用新版本`);
    }

    for (const file of files) {
        const key = file.key;
        // 对象键保留目录斜杠，二进制内容直接作为请求正文发送。
        await client.r2.buckets.objects.upload(
            key,
            await readFile(file.path),
            { account_id, bucket_name },
            {
                // SDK 当前会编码对象键中的斜杠，这里按官方文档保留斜杠并逐段编码。
                path: `/accounts/${encodeURIComponent(account_id)}/r2/buckets/${encodeURIComponent(bucket_name)}/objects/${key.split('/').map(encodeURIComponent).join('/')}`,
                headers: {
                    'Content-Type': file.contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            },
        );
        console.log(`已上传 ${key}`);
    }
}
