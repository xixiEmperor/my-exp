import { useMemo, type ReactNode } from 'react';
import { extractToc } from '@/utils/markdownToc';
import styles from './MarkdownToc.module.scss';

interface Props {
    /** markdown 原文，组件自己从里面提标题 */
    content: string;
    /** 自定义跳转。预览页的滚动容器不是窗口，需要外部接管锚点滚动 */
    onJump?: (id: string) => void;
    /** 目录下方的附加内容，文章详情页用它展示创建时间、修改时间和浏览量 */
    footer?: ReactNode;
}

// 文章右侧的目录导航，按标题层级缩进，正文滚动时保持吸顶。
export default function MarkdownToc({ content, onJump, footer }: Props) {
    // 正文没变就复用结果，避免每次渲染都把整篇文章扫一遍
    const headings = useMemo(() => extractToc(content), [content]);

    // 标题太少时目录意义不大，但下方还有附加信息时侧栏仍然要保留
    const hasToc = headings.length >= 2;

    if (!hasToc && !footer) {
        return null;
    }

    // 以最浅的标题为基准算缩进，文章从二级还是三级标题开始写都能对齐
    const minDepth = hasToc ? Math.min(...headings.map((item) => item.depth)) : 0;

    return (
        <div className={styles.panel} data-article-toc>
            {hasToc ? (
                <nav className={styles.toc} aria-label="文章目录">
                    <p className={styles.title}>目录</p>
                    <ul className={styles.list}>
                        {headings.map((item) => (
                            <li key={item.id}>
                                <a
                                    className={styles.link}
                                    href={`#${item.id}`}
                                    onClick={(event) => {
                                        // 外部接管跳转时拦掉默认的 hash 行为，避免改掉页面地址
                                        if (onJump) {
                                            event.preventDefault();
                                            onJump(item.id);
                                        }
                                    }}

                                    // 每深一级往右缩进一档，层级关系一眼能看出来
                                    style={{ paddingLeft: 12 + (item.depth - minDepth) * 12 }}
                                >
                                    {item.text}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            ) : null}

            {footer}
        </div>
    );
}
