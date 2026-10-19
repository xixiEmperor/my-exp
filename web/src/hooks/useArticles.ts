import { useArticlesStore } from '@/stores/articles';
import { useStore } from 'zustand';
import { getFolderChildren } from '@/api/articles';
import type { FolderNode, GetFolderChildrenResp } from '@/types/articles';
import { handleError } from '@/utils/errorHandler';

export function useArticles() {
    const state = useArticlesStore.getState();
    const articles = useStore(useArticlesStore, (state) => state.articles);
    const folders = useStore(useArticlesStore, (state) => state.folders);

    /** 有缓存的情况下，根据当前文件夹id找到所有子节点 */
    const findFromCache = (id: string) => {
        // 这里拿到的还只是简化的数据模型，只有id和type
        const children = folders[id].children;

        let f: FolderNode[] = [];
        let a: FolderNode[] = [];

        for (let c of children) {
            const node = {
                id: c.id,
                type: c.type,
                name: c.name,
            };

            if (c.type === 'article') {
                a.push(node);
            } else {
                f.push(node);
            }
        }

        // 拼接文件夹+文件数组并返回，文件夹在前
        return [...f, ...a];
    };

    /** 无缓存的情况下，根据文件夹id向后端请求某个文件夹所有子节点 */
    const requestChildren = async (id: string) => {
        try {
            state.setFolderStatus(id, 'loading');

            const res = await getFolderChildren<GetFolderChildrenResp>(id);

            // 这里将请求得到的节点追加到zustand中，视作缓存
            state.appendFolderNodes(id, res.data!);
            state.setFolderStatus(id, 'loaded');
        } catch (error) {
            state.setFolderStatus(id, 'error');
            handleError(error);
        }
    };

    /** 找文件节子节点的聚合函数 */
    const find = (id: string) => {
        const target = folders[id];

        // 1. 先去 zustand 里面检查该文件夹是否有缓存
        if (target.status === 'loaded') {
            return findFromCache(id);
        }

        // 2. 如果没有缓存，则发起请求查找所有子节点
        if (target.status === 'idle') {
            const rid = id === 'root' ? 'root' : id;
            requestChildren(rid);
        }

        // 3. 请求完追加到 zustand 之后，还需要从里面找出来并返回给上层使用
        return findFromCache(id);
    };

    return {
        find,
    };
}
