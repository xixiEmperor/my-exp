import MarkdownReadonly from '../MarkdownReadonly/MarkdownReadonly';
import MDWriteComponent from '../MDXEditor/MDXEditor';

interface Props {
    /** 渲染模式，只读还是可编辑 */
    mode: 'readonly' | 'editable';
    /** 当前文章 id，可编辑模式下本地草稿按它归档 */
    articleId?: string;
    /** markdown 文本，由外部获取后传进来，组件内部不再持有内容 */
    content: string;
}

// 只做模式分发，内容完全由调用方决定，方便详情页、编辑页共用同一个入口
export default function MarkdownSpace({ mode, articleId, content }: Props) {
    return mode === 'readonly' ? (
        <MarkdownReadonly content={content} />
    ) : (
        <MDWriteComponent articleId={articleId!} content={content} />
    );
}
