import MarkdownReadonly from '../MarkdownReadonly/MarkdownReadonly';
import MDWriteComponent from '../MDXEditor/MDXEditor';

interface Props {
    mode: 'readonly' | 'editable';
}

// 注意：模板字符串里每行不要带缩进，行首的 tab 会被 Markdown 当成缩进代码块
const content = `
## 二级标题

1. 序号

- 无序列表
    - 子无序列表

* Item 1
* Item 2
* Item 3
    * nested item

我的网站：[AI面试助手](https://swifthire.top)
`;

export default function MarkdownSpace({ mode }: Props) {
    return mode === 'readonly' ? (
        <MarkdownReadonly content={content} />
    ) : (
        <MDWriteComponent content={content} />
    );
}
