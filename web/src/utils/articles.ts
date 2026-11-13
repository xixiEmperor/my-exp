import imageCompression from 'browser-image-compression';
import { CDN_BASE_URL } from '@/constants/articles';
import { getByImageId } from '@/utils/idb';

export async function toWebp(file: File): Promise<File> {
    return imageCompression(file, {
        fileType: 'image/webp',
        maxSizeMB: 1, // 压缩目标体积
        maxWidthOrHeight: 2048,
        initialQuality: 0.8,
        useWebWorker: true, // 放到 Worker，不阻塞主线程
    });
}

export const subUrls = (markdown: string) => {
    const reg = /!\[[^\]]*\]\(([^)]+)\)/g;
    return [...markdown.matchAll(reg)].map((match) => match[1]);
};

/** 单张图片探测：CDN 能打开就保留原地址，失败时回退到 IndexedDB 里的本地 blob，返回处理后的预览正文 */
function probePreviewImage(url: string, content: string) {
    return new Promise<string>((resolve) => {
        const image = new Image();
        image.onload = () => {
            resolve(content);
        };
        image.onerror = async () => {
            try {
                // 从 URL 里取出图片 id，再到 IndexedDB 找对应的本地文件
                const res = new URL(url);
                const imageId = res.pathname.split('/')[3].split('.')[0];
                const tar = await getByImageId(imageId);

                if (tar) {
                    const previewUrl = URL.createObjectURL(tar.imageData);
                    resolve(content.replaceAll(url, previewUrl));
                    return;
                }

                resolve(content);
            } catch (e) {
                console.error('处理图片失败:', url, e);
                resolve(content);
            }
        };

        // 带独立查询参数探测，避免尚未上传时的 404 污染真实 URL 的 CDN 缓存
        const probeURL = url.startsWith(`${CDN_BASE_URL}/`) ? `${url}?preview=1` : url;
        image.src = probeURL;
    });
}

/**
 * 按顺序检查正文里的图片，返回替换过降级地址的正文。
 * 关闭预览后由调用方通过 isCancelled 跳过剩余探测。
 */
export function resolvePreviewContent(content: string, isCancelled: () => boolean) {
    return subUrls(content).reduce(async (pendingContent, url) => {
        const currentContent = await pendingContent;

        if (isCancelled()) {
            return currentContent;
        }

        return probePreviewImage(url, currentContent);
    }, Promise.resolve(content));
}
