import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import {
    Decoration,
    ViewPlugin,
    type DecorationSet,
    type EditorView,
    type ViewUpdate,
} from '@codemirror/view';
import { tags } from '@lezer/highlight';
import styles from './MarkdownSourceTheme.module.scss';

// 使用 CodeMirror 的高亮扩展接管固定色值，源码内容和解析方式保持原样。
export const markdownSourceTheme = syntaxHighlighting(
    HighlightStyle.define([
        { tag: tags.heading, class: styles.heading },
        { tag: [tags.keyword, tags.typeName], class: styles.keyword },
        { tag: tags.processingInstruction, class: styles.marker },
        { tag: [tags.labelName, tags.meta], class: styles.language },
        { tag: tags.punctuation, class: styles.punctuation },
        { tag: [tags.string, tags.regexp], class: styles.string },
        { tag: [tags.comment, tags.quote], class: styles.comment },
        { tag: [tags.number, tags.bool, tags.null, tags.attributeName], class: styles.literal },
        {
            tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
            class: styles.literal,
        },
        { tag: [tags.link, tags.url], class: styles.link },
        { tag: tags.strong, class: styles.strong },
        { tag: tags.emphasis, class: styles.emphasis },
        { tag: tags.monospace, class: styles.code },
        { tag: tags.invalid, class: styles.invalid },
    ]),
);

// 按语法树标记源码代码区，只改变底色，不改变文字尺寸和编辑区行高。
function codeBlockDecorations(view: EditorView) {
    const ranges: ReturnType<Decoration['range']>[] = [];

    syntaxTree(view.state).iterate({
        enter(node) {
            if (node.name !== 'FencedCode' && node.name !== 'CodeBlock') return;

            const first = view.state.doc.lineAt(node.from).number;
            const last = view.state.doc.lineAt(Math.max(node.from, node.to - 1)).number;

            for (let line = first; line <= last; line += 1) {
                ranges.push(
                    Decoration.line({ class: styles.codeLine }).range(
                        view.state.doc.line(line).from,
                    ),
                );
            }

            return false;
        },
    });

    return Decoration.set(ranges, true);
}

export const markdownSourceCodeBlocks = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = codeBlockDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || syntaxTree(update.state) !== syntaxTree(update.startState)) {
                this.decorations = codeBlockDecorations(update.view);
            }
        }
    },
    {
        decorations(plugin) {
            return plugin.decorations;
        },
    },
);
