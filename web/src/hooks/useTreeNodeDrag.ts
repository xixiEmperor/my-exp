import type { TreeNode } from '@/types/article-tree';
import { useArticlesStore } from '@/stores/articles';
import type { DragEndEvent } from '@dnd-kit/react';
import { moveArticle } from '@/api/articles';
import { moveFolder } from '@/api/folders';
import { useRequest } from './useRequest';

// 请求和缓存同步一起交给 useRequest，失败时由请求 hook 统一处理。
async function moveTreeNode(node: TreeNode, tar: TreeNode) {
    const { moveFolderNode } = useArticlesStore.getState();

    if (node.type === 'folder') {
        const folder = await moveFolder({ id: node.id, parent_id: tar.id });
        moveFolderNode({ ...node, name: folder.name }, { ...tar, id: folder.parentId ?? 'root' });

        return;
    }

    const article = await moveArticle({ id: node.id, folder_id: tar.id });
    moveFolderNode({ ...node, name: article.title }, { ...tar, id: article.folder_id ?? 'root' });
}

export const useTreeNodeDrag = () => {
    // 请求结束前不接受新的移动，避免连续拖拽导致响应顺序覆盖目录状态。
    const moveRequest = useRequest(moveTreeNode);

    const onDragEnd = async (e: DragEndEvent) => {
        // 取消拖拽不能触发后端移动。
        if (e.canceled || moveRequest.loading) return;

        const tar = e.operation.target?.data as TreeNode | undefined;
        const node = e.operation.source?.data as TreeNode | undefined;
        // 只在事件发生时读取最新缓存，避免捕获旧的父目录关系。
        const { folders } = useArticlesStore.getState();

        // 1. 如果放置的目标是自己原来的位置，不处理
        if (!tar || !node || node.id === tar.id || node.id === 'root') return;

        // 目标必须是文件夹，原目录使用 root 作为根目录缓存键。
        if (tar.type !== 'folder' || (node.parentId ?? 'root') === tar.id) return;

        // 2. 如果 drop target 是子文件夹，不处理
        if (node.type === 'folder') {
            // 沿目标的父目录向上检查，覆盖多层子目录，未缓存的关系由后端再校验。
            // 自身已在前面排除，直接从目标的父目录开始按 ID 查扁平映射。
            let current: string | null = tar.parentId;
            const seen = new Set<string>();

            while (current !== null) {
                if (current === node.id || seen.has(current)) return;

                seen.add(current);
                current = folders[current]?.parentId ?? null;
            }
        }

        // 移动接口返回简要信息，文章详情未缓存时无需额外请求完整正文。
        await moveRequest.run(node, tar);
    };

    return {
        onDragEnd,
        moveRequest,
    };
};
