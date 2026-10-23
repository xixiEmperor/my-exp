import MarkdownReadonly from '../MarkdownReadonly/MarkdownReadonly';
import MDWriteComponent from '../MDXEditor/MDXEditor';

interface Props {
    /** 渲染模式，只读还是可编辑 */
    mode: 'readonly' | 'editable';
    /** markdown 文本，由外部获取后传进来，组件内部不再持有内容 */
    content: string;
    /** 可编辑模式下内容变化时触发，把最新文本交回给外部 */
    onChange?: (content: string) => void;
}

// 只做模式分发，内容完全由调用方决定，方便详情页、编辑页共用同一个入口
export default function MarkdownSpace({ mode, content, onChange }: Props) {
    return mode === 'readonly' ? (
        <MarkdownReadonly content={content} />
    ) : (
        <MDWriteComponent content={content} onChange={onChange} />
    );
}
