import { useArticlesStore } from '@/stores/articles';
import { useDraftStore } from '@/stores/draft';
import { useUserStore } from '@/stores/user';
import { getArticleDetail, updateArticle } from '@/api/articles';
import { useRequest } from './useRequest';
import type { UpdateArticleReq } from '@/types/articles';

// 每次身份变化递增，区分同一篇文章在不同身份下的请求。
let articleRequestVersion = 0;

// 登录身份变化后重新获取正文，不能沿用游客预览或管理员正文的缓存。
useUserStore.subscribe((state, previous) => {
    if (state.isLogin !== previous.isLogin || state.userInfo !== previous.userInfo) {
        articleRequestVersion += 1;
        useArticlesStore.setState({ articles: {} });
    }
});

export function useArticles() {
    // 方法引用稳定，直接从 getState 解构，不参与订阅
    const { setArticle } = useArticlesStore.getState();
    const { getDraft, removeDraft } = useDraftStore.getState();

    /** 更新文章内容 */
    const fetchUpdateArticle = async (options: UpdateArticleReq) => {
        // 1. 调接口
        const res = await updateArticle(options);

        // 2. 如果接口调用成功，需要清空对应 id 的文章本地草稿
        removeDraft(res.id);

        // 3. 覆盖掉旧的 article 实体映射
        setArticle(res.id, res);

        return res;
    };

    const fetchArticleDetail = async (id: string) => {
        // 保存本次请求的身份，身份切换后丢弃仍在路上的旧响应。
        const userState = useUserStore.getState();
        const requestVersion = articleRequestVersion;

        try {
            // 请求层已经解掉了统一响应结构，这里拿到的就是文章详情
            const detail = await getArticleDetail(id);

            const currentUserState = useUserStore.getState();

            if (
                articleRequestVersion !== requestVersion ||
                currentUserState.isLogin !== userState.isLogin ||
                currentUserState.userInfo !== userState.userInfo
            ) {
                return;
            }

            // 详情写进 zustand 缓存，下次再点这篇就能直接命中
            setArticle(id, detail);

            return detail;
        } catch (error) {
            // 记录失败的文章，页面提示仍由 useRequest 统一处理。
            console.error('获取文章失败:', id, error);

            // 错误交给 useRequest 统一处理。
            throw error;
        }
    };

    const articleDetailRequest = useRequest(fetchArticleDetail);
    const updateArticleRequest = useRequest(fetchUpdateArticle);
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
        void runArticleDetail(id);

        // 3. 首次点击时数据还没回来，先返回 undefined
        return undefined;
    };

    return { findArticle, updateArticleRequest };
}
