import { useCallback } from 'react';
import { useArticlesStore } from '@/stores/articles';
import { getFolderChildren } from '@/api/articles';
import { useRequest } from './useRequest';

export function useArticles() {
    // 方法引用稳定，直接从 getState 解构，不参与订阅
    const { initFolder, setFolderStatus, appendFolderNodes } = useArticlesStore.getState();

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

    // 文件夹子节点请求交给 useRequest 管理，loading 和错误提示不用再手写
    const folderChildrenRequest = useRequest(fetchFolderChildren);
    const { run: runFolderChildren } = folderChildrenRequest;

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

    return {
        find,
        folders,
    };
}
