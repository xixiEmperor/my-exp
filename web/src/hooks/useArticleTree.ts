import { useCallback } from 'react';
import { useArticlesStore } from '@/stores/articles';
import type { TreeNode } from '@/types/article-tree';
import { createArticle, getArticlesByFolderID, renameArticle } from '@/api/articles';
import { createFolder, getFolderChildren, renameFolder } from '@/api/folders';
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

/** 新建文章，发送请求并更新前端状态管理 */
async function createArticleNode(folderId: string) {
    // 1. 携带请求体参数向后端发送请求
    const article = await createArticle(folderId);

    const { setArticle, appendCreatedNode } = useArticlesStore.getState();

    // 详情写进 zustand 缓存，创建完马上点开就能直接命中
    setArticle(article.id, article);

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

    const { initFolder, appendCreatedNode } = useArticlesStore.getState();

    // 新文件夹保持 idle，展开时再查询其完整内容。
    initFolder(folder.id, folder.name, folder.parentId);
    appendCreatedNode(folder.parentId ?? 'root', { ...folder, type: 'folder' });

    return folder;
}

/** 重命名文章，成功后把后端实际保存的标题同步到状态管理 */
async function renameArticleNode(id: string, title: string) {
    const article = await renameArticle({ id, title });

    const { renameArticleNode: syncArticleName } = useArticlesStore.getState();

    // 后端遇到重名会自动加编号，这里要用响应里的标题，不能直接用入参
    syncArticleName(article.id, article.title);

    return article;
}

/** 重命名文件夹，成功后把后端实际保存的名称同步到状态管理 */
async function renameFolderNode(id: string, name: string) {
    const folder = await renameFolder({ id, name });

    const { renameFolderNode: syncFolderName } = useArticlesStore.getState();

    // 同步父目录里的节点名称和文件夹实体自身的名称
    syncFolderName(folder.id, folder.name);

    return folder;
}

export function useArticleTree() {
    // 渲染要用的源数据只订阅这一个字段，选择器里不生成新对象
    const folders = useArticlesStore((state) => state.folders);

    // 写方法在 hook 顶层解构，供下面的 find 使用
    const { initFolder } = useArticlesStore.getState();

    // 各类请求交给 useRequest 管理，loading 和错误提示不用再手写
    const folderChildrenRequest = useRequest(fetchDirectory);
    const createArticleRequest = useRequest(createArticleNode);
    const createFolderRequest = useRequest(createFolderNode);
    const renameArticleRequest = useRequest(renameArticleNode);
    const renameFolderRequest = useRequest(renameFolderNode);
    const { run } = folderChildrenRequest;

    /** 有缓存的情况下，根据当前文件夹id找到所有子节点 */
    const findFromCache = useCallback(
        (id: string) => {
            const { children } = folders[id];

            // 文件夹排在文章前面
            return [
                ...children.filter((item) => item.type === 'folder'),
                ...children.filter((item) => item.type === 'article'),
            ];
        },
        [folders],
    );

    /** 找文件夹子节点的聚合函数 */
    const find = useCallback(
        (id: string, name: string, parentId: string | null) => {
            const target = folders[id];

            // 缓存里还没有这个文件夹时先初始化，新文件夹本身没有子节点
            if (!target) {
                initFolder(id, name, parentId);
                void run(id);

                return [];
            }

            // 没有缓存就发起请求，请求完成后状态更新会触发重新渲染
            if (target.status === 'idle') {
                void run(id);
            }

            return findFromCache(id);
        },
        [folders, findFromCache, initFolder, run],
    );

    return {
        find,
        folders,
        folderChildrenRequest,
        createArticleRequest,
        createFolderRequest,
        renameArticleRequest,
        renameFolderRequest,
    };
}
