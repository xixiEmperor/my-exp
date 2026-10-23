import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MarkdownSpace from '@/components/MarkdownSpace/MarkdownSpace';
import MarkdownToc from '@/components/MarkdownToc/MarkdownToc';
import EmptyState from '@/components/EmptyState/EmptyState';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import styles from './KnowledgeArticle.module.scss';

// 前台文章详情页。按路径里的文章 id 取缓存或发请求，然后用只读模式渲染 markdown。
export default function KnowledgeArticle() {
    const { id } = useParams<{ id: string }>();
    const { findArticle } = useArticles();

    // 订阅文章缓存，详情写回 store 之后这里会跟着重新渲染
    const articles = useArticlesStore((state) => state.articles);

    useEffect(() => {
        // 点击目录时已经预取过一次，这里命中缓存就不会重复发请求
        if (id) {
            findArticle(id);
        }
    }, [id, findArticle]);

    const article = id ? articles[id] : undefined;

    // 详情还没回来时先给一个占位提示，避免空白页让人以为链接坏了
    if (!article) {
        return (
            <div className={styles.page}>
                <EmptyState
                    compact
                    icon="file"
                    title="文章正在加载"
                    description="内容拉取完成后会自动显示，如果一直没出现可以回到目录重新点一次。"
                />
            </div>
        );
    }

    // 正文内容抽出来复用，目录解析和 markdown 渲染读的是同一份文本
    const content = article.content ?? '';

    // 标题单独渲染，正文交给只读 markdown 组件，两者共用全局阅读排版样式
    return (
        <div className={styles.page}>
            <div className={styles.reading}>
                <article className="reader-article">
                    <div className="reader-prose">
                        {/* 用文章 id 做 key，切换文章时强制重新挂载，内容不会串到上一篇 */}
                        <MarkdownSpace key={id} mode="readonly" content={content} />
                    </div>
                </article>

                {/* 目录固定在正文右侧，标题不够两级的文章会自动不渲染 */}
                <MarkdownToc content={content} />
            </div>
        </div>
    );
}
