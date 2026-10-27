import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MarkdownSpace from '@/components/MarkdownSpace/MarkdownSpace';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import { useDraftStore } from '@/stores/draft';

/** 文章管理页，根据路径参数里的文章 id 取详情，用可编辑的 markdown 组件渲染 */
export default function ArticleManager() {
    const { id } = useParams<{ id: string }>();
    const { findArticle } = useArticles();
    const [init, setInit] = useState<{ id: string; content: string } | undefined>(undefined);

    // 订阅文章缓存，详情写回 store 之后这里会跟着重新渲染
    const articles = useArticlesStore((state) => state.articles);
    const drafts = useDraftStore((state) => state.draft);

    useEffect(() => {
        // 点击目录时已经预取过一次，这里命中缓存就不会重复发请求
        if (id) {
            // 如果已有本地草稿，直接用本地的
            if (drafts[id]) {
                setInit(drafts[id]);
                return;
            }

            // 没有草稿再去查看是否有对应的文章实体映射
            findArticle(id, true);
            if (articles[id]) {
                setInit(articles[id]);
                return;
            }
        }
    }, [id, findArticle]);

    if (!init) {
        return null;
    }

    // 用文章 id 做 key，切换文章时强制重新挂载，编辑器会按新内容重新初始化
    return (
        <MarkdownSpace key={id} mode="editable" articleId={init.id} content={init.content ?? ''} />
    );
}
