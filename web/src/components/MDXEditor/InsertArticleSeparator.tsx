import { EditorState } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import type { RefObject } from 'react';
import { ARTICLE_SEPARATOR } from './ArticleSeparator';
import style from './MDXToolbar.module.scss';

// 保存源码编辑器实例，按钮失去焦点时仍使用编辑区保留的选区。
export function articleSeparatorExtensions(viewRef: RefObject<EditorView | null>) {
    return [
        ViewPlugin.fromClass(
            class {
                constructor(view: EditorView) {
                    viewRef.current = view;
                }
                destroy() {
                    viewRef.current = null;
                }
            },
        ),

        // 合并到同一次编辑事务，撤销时分隔符和原来的位置一起恢复。
        EditorState.transactionFilter.of((transaction) => {
            if (!transaction.docChanged) return transaction;

            const content = transaction.newDoc.toString();
            const positions = [...content.matchAll(/<ArticleSeparator \/>/g)].map(
                (match) => match.index,
            );

            if (positions.length < 2) return transaction;

            let keep = positions[positions.length - 1];

            // 新输入的标志优先，不能简单按文章中的先后顺序决定。
            transaction.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
                positions.forEach((position) => {
                    if (position < toB && position + ARTICLE_SEPARATOR.length > fromB) {
                        keep = position;
                    }
                });
            });

            return [
                transaction,
                {
                    changes: positions
                        .filter((position) => position !== keep)
                        .map((position) => ({
                            from: position,
                            to: position + ARTICLE_SEPARATOR.length,
                            insert: '',
                        })),
                    sequential: true,
                },
            ];
        }),
    ];
}

export default function InsertArticleSeparator({
    viewRef,
    disabled,
}: {
    viewRef: RefObject<EditorView | null>;
    disabled: boolean;
}) {
    // 在光标处插入独立块，选中文字时保留原文，光标落到分隔符之后。
    const insert = () => {
        const view = viewRef.current;

        if (!view || disabled || view.state.readOnly) return;

        const position = view.state.selection.main.head;
        const text = `\n${ARTICLE_SEPARATOR}\n`;

        view.dispatch({
            changes: { from: position, insert: text },
            selection: { anchor: position + text.length },
            scrollIntoView: true,
        });

        view.focus();
    };

    return (
        <button
            type="button"
            className={style.previewButton}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={insert}
            title="插入到当前光标处，并替换已有分隔符"
        >
            插入分隔符
        </button>
    );
}
