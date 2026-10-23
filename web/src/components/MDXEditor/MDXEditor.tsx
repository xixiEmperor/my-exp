import '@mdxeditor/editor/style.css';
import {
    MDXEditor,
    codeBlockPlugin,
    codeMirrorPlugin,
    headingsPlugin,
    listsPlugin,
    diffSourcePlugin,
    toolbarPlugin,
    linkPlugin,
    UndoRedo,
    tablePlugin,
    linkDialogPlugin,
    BoldItalicUnderlineToggles,
    DiffSourceToggleWrapper,
    quotePlugin,
    InsertTable,
    thematicBreakPlugin,
    InsertCodeBlock,
    type MDXEditorMethods,
} from '@mdxeditor/editor';
import { useEffect, useRef } from 'react';
import style from './MDXEditor.module.scss';

interface Props {
    // 初始渲染内容由父组件传递
    content: string;
    // 编辑器里内容变化时把最新 markdown 交回父组件
    onChange?: (content: string) => void;
}

export default function MDWriteComponent({ content, onChange }: Props) {
    const mdRef = useRef<MDXEditorMethods>(null);

    // MDXEditor 只在初始化时读一次 markdown，外部内容后到时必须手动同步进去
    useEffect(() => {
        const current = mdRef.current?.getMarkdown();

        // 编辑器里的内容已经一致就不要再设置，否则会把用户正在输入的光标位置冲掉
        if (current !== undefined && current !== content) {
            mdRef.current?.setMarkdown(content);
        }
    }, [content]);

    return (
        <MDXEditor
            ref={mdRef}
            contentEditableClassName={style['prose']}
            markdown={content}
            plugins={[
                headingsPlugin(),
                quotePlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                listsPlugin(),
                diffSourcePlugin(),
                thematicBreakPlugin(),
                tablePlugin(),
                codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
                codeMirrorPlugin({
                    codeBlockLanguages: {
                        js: 'JavaScript',
                        css: 'CSS',
                        tsx: 'TypeScript (React)',
                        go: 'go',
                        mysql: 'mysql',
                    },
                }),
                toolbarPlugin({
                    toolbarClassName: style['toolbar'],
                    toolbarContents: () => (
                        <>
                            <UndoRedo />
                            <BoldItalicUnderlineToggles />
                            <InsertTable />
                            <InsertCodeBlock />
                            <DiffSourceToggleWrapper children />
                        </>
                    ),
                }),
            ]}
            onChange={onChange}
        />
    );
}
