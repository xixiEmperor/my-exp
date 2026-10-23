import type { ComponentProps } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface Props {
    content: string;
}

// 直接从组件类型里取插件字段的类型，不用额外依赖 unified 的类型包
type MarkdownProps = ComponentProps<typeof Markdown>;

// 插件数组放在模块作用域，保证每次渲染传进去的都是同一个引用，避免无意义的重新处理
const remarkPlugins: MarkdownProps['remarkPlugins'] = [remarkGfm];

// rehype-slug 给标题补 id，右侧目录里的锚点链接才能跳到对应位置
const rehypePlugins: MarkdownProps['rehypePlugins'] = [rehypeSlug, rehypeHighlight];

export default function MarkdownReadonly({ content }: Props) {
    return (
        <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
            {content}
        </Markdown>
    );
}
