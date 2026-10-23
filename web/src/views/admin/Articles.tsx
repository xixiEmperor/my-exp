import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MarkdownSpace from '@/components/MarkdownSpace/MarkdownSpace';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';

/** 文章管理页，根据路径参数里的文章 id 取详情，用可编辑的 markdown 组件渲染 */
export default function ArticleManager() {
    const { id } = useParams<{ id: string }>();
    const { findArticle } = useArticles();

    // 订阅文章缓存，详情写回 store 之后这里会跟着重新渲染
    const articles = useArticlesStore((state) => state.articles);

    useEffect(() => {
        // 走 hook 里统一的缓存加请求逻辑，缓存命中时不会再发请求
        if (id) {
            findArticle(id);
        }
    }, [id, findArticle]);

    // 详情还没回来时先不挂载编辑器，避免编辑器拿空内容做初始化
    const article = id ? articles[id] : undefined;

    if (!article) {
        return null;
    }

    // 用文章 id 做 key，切换文章时强制重新挂载，编辑器会按新内容重新初始化
    return <MarkdownSpace key={id} mode="editable" content={article.content ?? ''} />;
}
