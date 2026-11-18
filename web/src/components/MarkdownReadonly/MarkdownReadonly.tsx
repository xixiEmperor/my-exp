import type { ComponentProps } from 'react';
import { useUIStore } from '@/stores/ui';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import styles from './MarkdownReadonly.module.scss';
import MermaidDiagram from './MermaidDiagram';
import { remarkArticleSeparator, urlTransform } from '../../utils/markdown-plugin';

interface Props {
    isPreview?: boolean;
    content: string;
}

// 直接从组件类型里取插件字段的类型，不用额外依赖 unified 的类型包
type MarkdownProps = ComponentProps<typeof Markdown>;

// 插件数组放在模块作用域，保证每次渲染传进去的都是同一个引用，避免无意义的重新处理
const remarkPlugins: MarkdownProps['remarkPlugins'] = [remarkGfm, remarkArticleSeparator];

// rehype-slug 给标题补 id，右侧目录里的锚点链接才能跳到对应位置
const rehypePlugins: MarkdownProps['rehypePlugins'] = [
    rehypeSlug,
    [rehypeHighlight, { ignore: ['mermaid'] }],
];

// 分隔提示使用站点已有的登录入口，按钮支持键盘操作。
const markdownComponents: MarkdownProps['components'] = {
    // 从原始代码节点读取文本，避免代码高亮影响图表解析。
    pre: ({ node, children, ...props }) => {
        const code = node?.children[0];

        if (
            code?.type === 'element' &&
            code.tagName === 'code' &&
            Array.isArray(code.properties.className) &&
            code.properties.className.includes('language-mermaid')
        ) {
            const source = code.children
                .map((child) => (child.type === 'text' ? child.value : ''))
                .join('');

            return <MermaidDiagram source={source} />;
        }

        return <pre {...props}>{children}</pre>;
    },
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
            urlTransform={isPreview ? urlTransform : defaultUrlTransform}
        >
            {content}
        </Markdown>
    );
}
