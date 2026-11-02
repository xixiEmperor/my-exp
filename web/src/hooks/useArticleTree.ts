import { useCallback } from 'react';
import { useArticlesStore } from '@/stores/articles';
import type { TreeNode } from '@/types/article-tree';
import { createArticle, getArticlesByFolderID } from '@/api/articles';
import { createFolder, getFolderChildren } from '@/api/folders';
import { useRequest } from './useRequest';

/** 请求某个文件夹下所有子节点，包括文章和子文件夹 */
async function fetchDirectory(id: string, signal?: AbortSignal): Promise<TreeNode[]> {
    const { setFolderStatus, setFolderNodes } = useArticlesStore.getState();
    setFolderStatus(id, { status: 'loading' });

    try {
        // 并行去请求当前 id 文件夹下的文章和子文件夹
        const [folders, articles] = await Promise.all([
            getFolderChildren(id, signal),
            getArticlesByFolderID(id, signal),
        ]);

        signal?.throwIfAborted();

        // 请求层已经解掉了统一响应结构，这里拿到的就是节点数组
        const nodes: TreeNode[] = [
            ...folders.map((folder): TreeNode => ({ ...folder, type: 'folder' })),
            ...articles.map((article): TreeNode => ({
                id: article.id,
                name: article.title,
                parentId: article.folder_id,
                type: 'article',
            })),
        ];

        // 两种资源都成功后才提交完整目录，空数组也是成功结果。
        setFolderNodes(id, nodes);
        setFolderStatus(id, { status: 'loaded' });

        // 把节点交给调用方，外层用它区分成功和失败
        return nodes;
    } catch (error) {
        // 保留原有缓存，失败或取消都不能标成完整目录。
        setFolderStatus(id, { status: 'error' });

        throw error;
    }
}

/** 向前端状态管理的文件夹中追加新创建的节点 */
function appendCreatedNode(targetId: string, node: TreeNode) {
    const { initFolder, appendFolderNodes, folders } = useArticlesStore.getState();

    if (!folders[targetId]) {
        initFolder(targetId, targetId === 'root' ? '全部文章' : targetId, null);
    }

    // 这里将请求得到的节点追加到zustand中，视作缓存
    appendFolderNodes(targetId, [node]);
}

/** 新建文章，发送请求并更新前端状态管理 */
async function createArticleNode(folderId: string) {
    // 1. 携带请求体参数向后端发送请求
    const article = await createArticle(folderId);

    // 详情写进 zustand 缓存，创建完马上点开就能直接命中
    useArticlesStore.getState().setArticle(article.id, article);

    // 根目录响应为 null，缓存键仍然使用请求目标 root。
    appendCreatedNode(article.folder_id ?? 'root', {
        id: article.id,
        name: article.title,
        parentId: article.folder_id,
        type: 'article',
    });

    return article;
}

/** 新建文件夹，发送请求并更新状态管理 */
async function createFolderNode(parentId: string) {
    const folder = await createFolder(parentId);
    const { folders, initFolder } = useArticlesStore.getState();

    // 新文件夹保持 idle，展开时再查询其完整内容。
    if (!folders[folder.id]) {
        initFolder(folder.id, folder.name, folder.parentId);
    }

    appendCreatedNode(folder.parentId ?? 'root', { ...folder, type: 'folder' });

    return folder;
}

export function useArticleTree() {
    // 渲染要用的源数据只订阅这一个字段，选择器里不生成新对象
    const folders = useArticlesStore((state) => state.folders);

    // 文件夹子节点请求交给 useRequest 管理，loading 和错误提示不用再手写
    const folderChildrenRequest = useRequest(fetchDirectory);
    const createArticleRequest = useRequest(createArticleNode);
    const createFolderRequest = useRequest(createFolderNode);
    const { run } = folderChildrenRequest;

    /** 有缓存的情况下，根据当前文件夹id找到所有子节点 */
    const findFromCache = (id: string) => {
        // 回调执行时重新取最新状态，避免使用渲染时捕获的旧快照
        const { children } = useArticlesStore.getState().folders[id];

        // 文件夹排在文章前面
        return [
            ...children.filter((item) => item.type === 'folder'),
            ...children.filter((item) => item.type === 'article'),
        ];
    };

    /** 找文件夹子节点的聚合函数 */
    const find = useCallback(
        (id: string, name: string, parentId: string | null) => {
            const { initFolder } = useArticlesStore.getState();

            // 渲染和异步回调都会调用这里，统一读最新状态
            if (!useArticlesStore.getState().folders[id]) {
                initFolder(id, name, parentId);
            }

            const { status } = useArticlesStore.getState().folders[id];

            // 1. 先去 zustand 里面检查该文件夹是否有缓存
            if (status === 'loaded') {
                return findFromCache(id);
            }

            // 2. 如果没有缓存，则发起请求查找所有子节点
            if (status === 'idle') {
                void run(id);
            }

            // 3. 请求完追加到 zustand 之后，还需要从里面找出来并返回给上层使用
            return findFromCache(id);
        },
        [run],
    );

    return { find, folders, folderChildrenRequest, createArticleRequest, createFolderRequest };
}
