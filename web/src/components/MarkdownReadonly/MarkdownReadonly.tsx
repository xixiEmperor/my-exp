import type { ComponentProps } from 'react';
import { SPLIT_FLAG } from '@/constants/articles';
import { useUIStore } from '@/stores/ui';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import styles from './MarkdownReadonly.module.scss';

interface Props {
    isPreview?: boolean;
    content: string;
}

// 直接从组件类型里取插件字段的类型，不用额外依赖 unified 的类型包
type MarkdownProps = ComponentProps<typeof Markdown>;

// 只描述转换分隔标记时需要的节点字段，代码块中的文本不参与转换。
interface MarkdownNode {
    type: string;
    value?: string;
    children?: MarkdownNode[];
    data?: {
        hName?: string;
        hProperties?: Record<string, string>;
    };
}

function urlTransform(url: string) {
    if (url.startsWith('blob:')) {
        return url;
    }

    return defaultUrlTransform(url);
}

// 在 Markdown 解析后替换独立的分隔标记，保留正文的正常解析流程。
function remarkArticleSeparator() {
    return (tree: MarkdownNode) => {
        const transform = (node: MarkdownNode) => {
            if (node.type === 'html' && node.value?.trim() === SPLIT_FLAG.trim()) {
                node.type = 'paragraph';
                delete node.value;

                node.children = [{ type: 'text', value: '登录后继续查看完整内容' }];

                node.data = {
                    hName: 'div',
                    hProperties: { className: styles.separator },
                };

                return;
            }

            // HTML 标记和代码节点类型不同，不会误改示例代码。
            node.children?.forEach(transform);
        };

        transform(tree);
    };
}

// 插件数组放在模块作用域，保证每次渲染传进去的都是同一个引用，避免无意义的重新处理
const remarkPlugins: MarkdownProps['remarkPlugins'] = [remarkGfm, remarkArticleSeparator];

// rehype-slug 给标题补 id，右侧目录里的锚点链接才能跳到对应位置
const rehypePlugins: MarkdownProps['rehypePlugins'] = [rehypeSlug, rehypeHighlight];

// 分隔提示使用站点已有的登录入口，按钮支持键盘操作。
const markdownComponents: MarkdownProps['components'] = {
    div: ({ className, children }) => {
        if (className !== styles.separator) {
            return <div className={className}>{children}</div>;
        }

        return (
            <div className={styles.separator}>
                <span>
                    <button
                        type="button"
                        className={styles.login}
                        onClick={() => useUIStore.getState().openLogin()}
                    >
                        登录
                    </button>
                    后继续查看完整内容
                </span>
            </div>
        );
    },
};

export default function MarkdownReadonly({ content, isPreview = false }: Props) {
    return (
        <Markdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={markdownComponents}
            urlTransform={isPreview ? urlTransform : null}
        >
            {content}
        </Markdown>
    );
}
