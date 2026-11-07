import { javascript } from '@codemirror/lang-javascript';

// 语言实例在模块内复用，代码高亮不会随输入重新创建解析器。
const javascriptLanguage = javascript().language;
const jsxLanguage = javascript({ jsx: true }).language;
const typescriptLanguage = javascript({ typescript: true }).language;
const tsxLanguage = javascript({ typescript: true, jsx: true }).language;

// 识别文章已有的代码语言标记，未知语言仍保留清晰的普通代码文字。
export function markdownCodeLanguage(info: string) {
    const name = info.trim().split(/\s+/)[0].toLowerCase();

    if (['js', 'javascript', 'mjs', 'cjs'].includes(name)) return javascriptLanguage;

    if (name === 'jsx') return jsxLanguage;

    if (['ts', 'typescript'].includes(name)) return typescriptLanguage;

    if (name === 'tsx') return tsxLanguage;

    return null;
}
