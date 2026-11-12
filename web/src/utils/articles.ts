import imageCompression from 'browser-image-compression';

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
