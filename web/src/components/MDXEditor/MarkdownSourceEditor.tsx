import { markdown } from '@codemirror/lang-markdown';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { useEffect, useImperativeHandle, useRef, type RefObject } from 'react';

// 草稿只需要读取和替换原文，不再经过 MDXEditor 的解析和序列化。
export interface MarkdownSourceMethods {
    getMarkdown: () => string;
    setMarkdown: (content: string) => void;
}

interface Props {
    ref: RefObject<MarkdownSourceMethods | null>;
    viewRef: RefObject<EditorView | null>;
    markdown: string;
    extensions: Extension[];
    onChange: (content: string) => void;
    readOnly: boolean;
    className: string;
}

export default function MarkdownSourceEditor({
    ref,
    viewRef,
    markdown: content,
    extensions,
    onChange,
    readOnly,
    className,
}: Props) {
    const hostRef = useRef<HTMLDivElement>(null);
    const initialContentRef = useRef(content);
    const changeRef = useRef(onChange);
    const readOnlyCompartment = useRef(new Compartment());

    // 回调更新不销毁编辑器，避免每次输入都丢失光标和撤销记录。
    useEffect(() => {
        changeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!hostRef.current) return;

        const view = new EditorView({
            parent: hostRef.current,
            state: EditorState.create({
                doc: initialContentRef.current,
                extensions: [
                    ...extensions,
                    basicSetup,
                    markdown(),
                    EditorView.lineWrapping,
                    readOnlyCompartment.current.of([]),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) changeRef.current(update.state.doc.toString());
                    }),
                ],
            }),
        });

        viewRef.current = view;

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [extensions, viewRef]);

    // 保存请求期间只切换只读配置，保留编辑器实例和当前选区。
    useEffect(() => {
        viewRef.current?.dispatch({
            effects: readOnlyCompartment.current.reconfigure([
                EditorState.readOnly.of(readOnly),
                EditorView.editable.of(!readOnly),
            ]),
        });
    }, [readOnly, viewRef]);

    useImperativeHandle(
        ref,
        () => ({
            getMarkdown: () => viewRef.current?.state.doc.toString() ?? initialContentRef.current,
            setMarkdown: (next) => {
                const view = viewRef.current;

                if (!view || view.state.doc.toString() === next) return;

                view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
            },
        }),
        [viewRef],
    );

    // 沿用现有源码编辑器样式，内容始终以原文形式显示。
    return <div ref={hostRef} className={`${className} mdxeditor`} />;
}
