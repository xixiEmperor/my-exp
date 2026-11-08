import type { Article } from '@/types/articles';
import MarkdownReadonly from '../MarkdownReadonly/MarkdownReadonly';
import MDWriteComponent from '../MDXEditor/MDXEditor';

interface Props {
    /** 渲染模式，只读还是可编辑 */
    mode: 'readonly' | 'editable';
    /** 文章实体，正文、id 和详情信息都从这一份数据里取 */
    article: Article;
}

// 只做模式分发，内容完全由调用方传入的文章实体决定，方便详情页、编辑页共用同一个入口
export default function MarkdownSpace({ mode, article }: Props) {
    return mode === 'readonly' ? (
        <MarkdownReadonly content={article.content ?? ''} />
    ) : (
        <MDWriteComponent article={article} />
    );
}
