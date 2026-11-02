import { useArticlesStore } from '@/stores/articles';
import { useDraftStore } from '@/stores/draft';
import { getArticleDetail } from '@/api/articles';
import { useRequest } from './useRequest';

// 模块级记录正在请求中的文章 id，点击预取和详情页初始化可能同时调用，靠它避免重复请求
const pendingArticleIds = new Set<string>();

export function useArticles() {
    // 方法引用稳定，直接从 getState 解构，不参与订阅
    const { setArticle } = useArticlesStore.getState();
    const { getDraft } = useDraftStore.getState();

    const fetchArticleDetail = async (id: string) => {
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
    };

    const articleDetailRequest = useRequest(fetchArticleDetail);
    const { run: runArticleDetail } = articleDetailRequest;

    /** 找文章详情的聚合函数，缓存命中直接返回，没有缓存就发起请求 */
    const findArticle = (id: string, fromAticle?: boolean) => {
        // 回调执行时重新取最新状态，避免使用渲染时捕获的旧快照
        const { articles } = useArticlesStore.getState();

        // 0. 如果是在后台渲染，需要先查找是否有本地缓存
        if (fromAticle) {
            // 缓存里只有服务端内容，本地草稿更新时补齐一次。
            // 写回后两边内容一致，下次调用不会重复更新，不会引起循环渲染
            const cached = getDraft(id);

            if (cached) {
                return cached;
            }
        }

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
    };

    return { findArticle };
}
