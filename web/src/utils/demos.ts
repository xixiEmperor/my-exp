import { CDN_BASE_URL } from '@/constants/articles';
import type { DemoResource } from '@/types/demos';

// 预览产物固定发布在 demos/<slug>/<verison>/preview/index.html，与后台上传路径保持一致。
// 路径段单独编码，避免 slug 或版本号中出现特殊字符时拼出错误地址。
export function getDemoPreviewUrl(demo: Pick<DemoResource, 'slug' | 'verison'>): string {
    const slug = encodeURIComponent(demo.slug);
    const verison = encodeURIComponent(demo.verison);

    return `${CDN_BASE_URL}/demos/${slug}/${verison}/preview/index.html`;
}
