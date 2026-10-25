import '@mdxeditor/editor/style.css';
import {
    MDXEditor,
    codeBlockPlugin,
    codeMirrorPlugin,
    diffSourcePlugin,
    headingsPlugin,
    linkPlugin,
    listsPlugin,
    quotePlugin,
    tablePlugin,
    thematicBreakPlugin,
    type MDXEditorMethods,
} from '@mdxeditor/editor';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import MarkdownReadonly from '../MarkdownReadonly/MarkdownReadonly';
import MarkdownToc from '../MarkdownToc/MarkdownToc';
import SiteIcon from '../SiteIcon/SiteIcon';
import { toast } from '@/utils/toast';
import style from './MDXEditor.module.scss';

/** 保存动作的类型：草稿只有自己可见，正文对所有人可见 */
export type SaveStatus = 'draft' | 'published';

interface Props {
    // 初始渲染内容由父组件传递
    content: string;
    // 编辑器里内容变化时把最新 markdown 交回父组件
    onChange?: (content: string) => void;
    // 用户在确认框里点了确认之后触发，把最新内容和保存类型一起交回父组件
    onSave?: (content: string, status: SaveStatus) => void;
}

export default function MDWriteComponent({ content, onChange, onSave }: Props) {
    const mdRef = useRef<MDXEditorMethods>(null);

    // 预览正文的滚动容器，点目录时需要把对应标题滚到可视区
    const previewBodyRef = useRef<HTMLDivElement>(null);

    // 编辑器当前文本自己留一份。父组件不一定回传 onChange，预览需要靠它实时刷新
    const [draft, setDraft] = useState(content);

    // 预览解析 markdown 比较费时，用延迟值让输入先渲染出来，长文章下打字不会卡
    const previewContent = useDeferredValue(draft);

    // 预览页的开关
    const [previewOpen, setPreviewOpen] = useState(false);

    // 待确认的保存类型。有值就代表确认框打开，两种保存共用同一个框
    const [pendingSave, setPendingSave] = useState<SaveStatus | null>(null);

    // MDXEditor 只在初始化时读一次 markdown，外部内容后到时必须手动同步进去
    useEffect(() => {
        const current = mdRef.current?.getMarkdown();

        // 编辑器里的内容已经一致就不要再设置，否则会把用户正在输入的光标位置冲掉
        if (current !== undefined && current !== content) {
            mdRef.current?.setMarkdown(content);
        }

        // 外部换了一篇文章时，预览也要跟着换成新内容
        setDraft(content);
    }, [content]);

    // 预览打开时锁住页面滚动，同时支持 Esc 关闭
    useEffect(() => {
        if (!previewOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreviewOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [previewOpen]);

    // 输入时先把内容写进本地状态，再按需通知父组件
    const handleChange = (next: string) => {
        setDraft(next);
        onChange?.(next);
    };

    // 目录的锚点跳转走这里。预览页自己的滚动容器不是窗口，默认的 hash 跳转不生效
    const handleJump = (id: string) => {
        const target = previewBodyRef.current?.querySelector(`#${CSS.escape(id)}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // 确认框点确认时执行。此时 pendingSave 还在，对话框会在回调结束后才关掉
    const handleConfirmSave = () => {
        if (!pendingSave) {
            return;
        }

        // 以编辑器里的即时内容为准，兜住 onChange 还没同步过来的最后一次输入
        const latest = mdRef.current?.getMarkdown() ?? draft;

        if (onSave) {
            onSave(latest, pendingSave);

            return;
        }

        // 父组件还没接保存接口时给一句明确提示，避免点了按钮像没反应
        toast.warning('保存接口还没接入，这次改动没有提交到后端');
    };

    // 编辑器固定源码模式，只编辑 markdown 原文，渲染效果交给预览页
    return (
        <div className={style.wrap}>
            {/* 这一栏吸顶，往下翻正文时预览和保存仍然点得到 */}
            <div className={style.bar}>
                <span className={style.label}>Markdown 源码</span>
                <div className={style.toolbar}>
                    <button
                        type="button"
                        className={style.previewButton}
                        onClick={() => setPreviewOpen(true)}
                    >
                        <SiteIcon name="book" />
                        <span>预览</span>
                    </button>
                    <button
                        type="button"
                        className={style.draftButton}
                        onClick={() => setPendingSave('draft')}
                    >
                        <SiteIcon name="save" />
                        <span>保存为草稿</span>
                    </button>
                    <button
                        type="button"
                        className={style.publishButton}
                        onClick={() => setPendingSave('published')}
                    >
                        <SiteIcon name="publish" />
                        <span>发布为正文</span>
                    </button>
                </div>
            </div>

            {/* 源码模式下组件仍会把内容解析一遍，缺插件会直接报解析错误，所以插件保留但不挂工具栏 */}
            <MDXEditor
                ref={mdRef}
                className={style.editor}
                markdown={content}
                plugins={[
                    headingsPlugin(),
                    quotePlugin(),
                    linkPlugin(),
                    listsPlugin(),
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
                    diffSourcePlugin({ viewMode: 'source' }),
                ]}
                onChange={handleChange}
            />

            {previewOpen && (
                <div
                    className={style.overlay}
                    role="dialog"
                    aria-modal="true"
                    aria-label="文章预览"
                    onClick={(event) => {
                        // 只有点在遮罩本身才关闭，点弹层内容不关
                        if (event.target === event.currentTarget) {
                            setPreviewOpen(false);
                        }
                    }}
                >
                    <div className={style.modal}>
                        <header className={style.modalHead}>
                            <span className={style.modalTitle}>文章预览</span>
                            <button
                                type="button"
                                className={style.closeButton}
                                onClick={() => setPreviewOpen(false)}
                                aria-label="关闭预览"
                                autoFocus
                            >
                                <SiteIcon name="close" />
                            </button>
                        </header>

                        <div className={style.modalBody} ref={previewBodyRef}>
                            <article className={style.article}>
                                {/* 和前台文章详情页共用同一套阅读排版 */}
                                <div className="reader-prose">
                                    <MarkdownReadonly content={previewContent} />
                                </div>
                            </article>

                            <MarkdownToc content={previewContent} onJump={handleJump} />
                        </div>
                    </div>
                </div>
            )}

            {/* 草稿和发布共用一个确认框，标题和说明按待保存的类型切换 */}
            <ConfirmDialog
                open={pendingSave !== null}
                title={pendingSave === 'published' ? '发布为正文' : '保存为草稿'}
                description={
                    pendingSave === 'published'
                        ? '发布之后这篇文章会在知识库里对所有人可见，确定现在发布吗？'
                        : '内容会保存成草稿，只有登录后的你自己能看到，确定保存吗？'
                }
                confirmText={pendingSave === 'published' ? '确认发布' : '保存草稿'}
                onConfirm={handleConfirmSave}
                onClose={() => setPendingSave(null)}
            />
        </div>
    );
}
