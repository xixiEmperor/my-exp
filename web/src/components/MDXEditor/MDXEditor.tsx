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
import { useRef, useState } from 'react';
import style from './MDXEditor.module.scss';

interface Props {
    // 初始渲染内容由父组件传递
    content: string;
}

export default function MDWriteComponent({ content }: Props) {
    const mdRef = useRef<MDXEditorMethods>(null);

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
            onChange={console.log}
        />
    );
}
