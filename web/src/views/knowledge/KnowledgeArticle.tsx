import { useEffect, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import MarkdownSpace from '@/components/MarkdownSpace/MarkdownSpace';
import MarkdownToc from '@/components/MarkdownToc/MarkdownToc';
import ArticleMeta from '@/components/ArticleMeta/ArticleMeta';
import SiteFooter from '@/components/SiteFooter/SiteFooter';
import EmptyState from '@/components/EmptyState/EmptyState';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import ReadingFontToolbar, {
    DEFAULT_READING_FONT_SIZE,
} from '@/components/ReadingFontToolbar/ReadingFontToolbar';
import styles from './KnowledgeArticle.module.scss';

// 前台文章详情页。按路径里的文章 id 取缓存或发请求，然后用只读模式渲染 markdown。
export default function KnowledgeArticle() {
    const { id } = useParams<{ id: string }>();
    const { findArticle } = useArticles();
    // 字号保留在阅读页中，切换文章时继续使用当前设置。
    const [fontSize, setFontSize] = useState(DEFAULT_READING_FONT_SIZE);

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
                {/* 加载期间也保留正文列的页脚，避免页面底部突然空掉。 */}
                <div className={styles.articleFooter}>
                    <SiteFooter />
                </div>
            </div>
        );
    }

    // 正文内容抽出来复用，目录解析和 markdown 渲染读的是同一份文本
    const content = article.content ?? '';

    // 标题单独渲染，正文交给只读 markdown 组件，两者共用全局阅读排版样式
    return (
        <div className={styles.page}>
            <div className={styles.reading}>
                <div className={styles.articleColumn}>
                    {/* 移动端把同一个字号组件放在标题前，侧栏隐藏后仍然可以调整。 */}
                    <div className={styles.mobileFontToolbar}>
                        <ReadingFontToolbar fontSize={fontSize} onFontSizeChange={setFontSize} />
                    </div>
                    {/* 只给正文设置字号变量，右侧目录和文章信息维持原有大小。 */}
                    <article
                        className="reader-article"
                        style={
                            {
                                '--reader-font-size': `${fontSize}px`,
                                // 一级标题保留随屏幕变化的尺寸，再按用户字号缩放。
                                '--reader-font-scale': fontSize / DEFAULT_READING_FONT_SIZE,
                            } as CSSProperties
                        }
                    >
                        <div className="reader-prose">
                            {/* 用文章 id 做 key，切换文章时强制重新挂载，内容不会串到上一篇 */}
                            <MarkdownSpace key={id} mode="readonly" article={article} />
                        </div>
                        {/* 移动端把文章信息放在正文后面，每项单独一行。 */}
                        <ArticleMeta
                            className={styles.articleMeta}
                            createdAt={article.created_at}
                            lastModifiedAt={article.last_modified_at}
                            views={article.views}
                        />
                    </article>
                    {/* 页脚和末尾留白都放在正文列内，两侧目录的吸顶边界延伸到底。 */}
                    {/* <div className={styles.articleFooter}>
                        <SiteFooter />
                    </div> */}
                </div>

                {/* 目录固定在正文右侧，下方补上文章的时间信息和浏览量 */}
                {/* PC 端恢复目录下方的文章信息，移动端隐藏整块右侧栏。 */}
                <MarkdownToc
                    content={content}
                    footer={
                        <>
                            <ReadingFontToolbar
                                fontSize={fontSize}
                                onFontSizeChange={setFontSize}
                            />
                            <ArticleMeta
                                createdAt={article.created_at}
                                lastModifiedAt={article.last_modified_at}
                                views={article.views}
                            />
                        </>
                    }
                />
            </div>
        </div>
    );
}
