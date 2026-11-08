import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MarkdownSpace from '@/components/MarkdownSpace/MarkdownSpace';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import { useDraftStore } from '@/stores/draft';

/** 文章管理页，根据路径参数里的文章 id 取详情，用可编辑的 markdown 组件渲染 */
export default function ArticleManager() {
    const { id } = useParams<{ id: string }>();
    const { findArticle } = useArticles();

    // 订阅文章缓存和本地草稿，详情或草稿写回之后这里会跟着重新渲染
    const articles = useArticlesStore((state) => state.articles);
    const drafts = useDraftStore((state) => state.draft);

    useEffect(() => {
        // 点击目录时已经预取过一次，这里命中缓存就不会重复发请求。
        // 即使有本地草稿也要取一次详情，右侧信息栏需要接口返回的时间和浏览量。
        if (id) {
            findArticle(id);
        }
    }, [id, findArticle]);

    const article = id ? articles[id] : undefined;
    const draft = id ? drafts[id] : undefined;

    if (!article) {
        return null;
    }

    // 正文优先用本地草稿，没有草稿时再用服务端详情。
    // 合并成一份文章实体传给编辑组件，正文和右侧信息都从同一个 article 里取。
    const content = draft?.content ?? article.content;
    const editableArticle = content === article.content ? article : { ...article, content };

    // 用文章 id 做 key，切换文章时强制重新挂载，编辑器会按新内容重新初始化
    return <MarkdownSpace key={editableArticle.id} mode="editable" article={editableArticle} />;
}
