import { useCallback, useRef, useState } from 'react';
import { resolvePreviewContent } from '@/utils/articles';

/** 管理文章预览的打开状态，以及打开前对正文图片的异步检查 */
export function useArticlePreview() {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewContent, setPreviewContent] = useState('');

    // 每次预览一个任务号，关闭或重复打开时让旧任务的结果失效
    const previewTaskRef = useRef(0);

    const closePreview = useCallback(() => {
        previewTaskRef.current += 1;
        setPreviewOpen(false);
        setPreviewLoading(false);
    }, []);

    const openPreview = useCallback(async (markdown: string) => {
        const taskId = previewTaskRef.current + 1;
        previewTaskRef.current = taskId;

        // 弹层先打开并进入加载态，图片检查完成后再把正文交给预览组件
        setPreviewOpen(true);
        setPreviewLoading(true);
        setPreviewContent('');

        const content = await resolvePreviewContent(
            markdown,
            () => previewTaskRef.current !== taskId,
        );

        if (previewTaskRef.current !== taskId) {
            return;
        }

        setPreviewContent(content);
        setPreviewLoading(false);
    }, []);

    return { previewOpen, previewLoading, previewContent, openPreview, closePreview };
}
