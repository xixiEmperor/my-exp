import { useCallback } from 'react';
import { useArticlesStore } from '@/stores/articles';
import { getFolderChildren, getArticleDetail } from '@/api/articles';
import { useRequest } from './useRequest';

// 模块级记录正在请求中的文章 id，点击预取和详情页初始化可能同时调用，靠它避免重复请求
const pendingArticleIds = new Set<string>();

export function useArticles() {
    // 方法引用稳定，直接从 getState 解构，不参与订阅
    const { initFolder, setFolderStatus, appendFolderNodes, setArticle } =
        useArticlesStore.getState();

    // 渲染要用的源数据只订阅这一个字段，选择器里不生成新对象
    const folders = useArticlesStore((state) => state.folders);

    // service 只依赖稳定方法，用 useCallback 固定引用，useRequest 的 run 才能跟着稳定
    const fetchFolderChildren = useCallback(
        async (id: string) => {
            setFolderStatus(id, 'loading');

            // 请求层已经解掉了统一响应结构，这里拿到的就是节点数组
            const nodes = await getFolderChildren(id);

            // 这里将请求得到的节点追加到zustand中，视作缓存
            appendFolderNodes(id, nodes ?? []);
            setFolderStatus(id, 'loaded');

            // 把节点交给调用方，外层用它区分成功和失败
            return nodes ?? [];
        },
        [appendFolderNodes, setFolderStatus],
    );

    const fetchArticleDetail = useCallback(
        async (id: string) => {
            // 请求发出前先登记，请求结束后不管成败都移除
            pendingArticleIds.add(id);

            try {
                // 请求层已经解掉了统一响应结构，这里拿到的就是文章详情
                const detail = await getArticleDetail(id);

                // 详情写进 zustand 缓存，下次再点这篇就能直接命中
                setArticle(id, detail);

                return detail;
            } finally {
                pendingArticleIds.delete(id);
            }
        },
        [setArticle],
    );

    // 文件夹子节点请求交给 useRequest 管理，loading 和错误提示不用再手写
    const folderChildrenRequest = useRequest(fetchFolderChildren);
    const articleDetailRequest = useRequest(fetchArticleDetail);
    const { run: runFolderChildren } = folderChildrenRequest;
    const { run: runArticleDetail } = articleDetailRequest;

    /** 有缓存的情况下，根据当前文件夹id找到所有子节点 */
    const findFromCache = useCallback((id: string) => {
        // 回调执行时重新取最新状态，避免使用渲染时捕获的旧快照
        const { children } = useArticlesStore.getState().folders[id];

        // 文件夹排在文章前面
        return [
            ...children.filter((item) => item.type === 'folder'),
            ...children.filter((item) => item.type === 'article'),
        ];
    }, []);

    /** 无缓存的情况下，根据文件夹id向后端请求某个文件夹所有子节点 */
    const requestChildren = useCallback(
        async (id: string) => {
            const nodes = await runFolderChildren(id);

            // 请求失败时 run 返回 undefined，把文件夹状态标成失败，方便展示重试
            if (!nodes) {
                setFolderStatus(id, 'error');
            }
        },
        [runFolderChildren, setFolderStatus],
    );

    /** 找文件夹子节点的聚合函数 */
    const find = useCallback(
        (id: string, name: string, parentId: string | null) => {
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
                void requestChildren(id);
            }

            // 3. 请求完追加到 zustand 之后，还需要从里面找出来并返回给上层使用
            return findFromCache(id);
        },
        [findFromCache, initFolder, requestChildren],
    );

    /** 找文章详情的聚合函数，缓存命中直接返回，没有缓存就发起请求 */
    const findArticle = useCallback(
        (id: string) => {
            // 回调执行时重新取最新状态，避免使用渲染时捕获的旧快照
            const { articles } = useArticlesStore.getState();

            // 1. zustand 里有这篇文章的实体，就说明缓存过，直接返回
            if (articles[id]) {
                return articles[id];
            }

            // 2. 没有实体且没有请求在路上，就发起请求，成功后写回 articles，下次再点就命中缓存
            if (!pendingArticleIds.has(id)) {
                void runArticleDetail(id);
            }

            // 3. 首次点击时数据还没回来，先返回 undefined
            return undefined;
        },
        [runArticleDetail],
    );

    return {
        find,
        findArticle,
        folders,
    };
}
