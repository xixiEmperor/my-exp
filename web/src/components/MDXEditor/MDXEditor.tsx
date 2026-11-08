import '@mdxeditor/editor/style.css';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { normalizeArticleSeparator } from './ArticleSeparator';
import MarkdownSourceEditor, { type MarkdownSourceMethods } from './MarkdownSourceEditor';
import InsertArticleSeparator, { articleSeparatorExtensions } from './InsertArticleSeparator';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import ArticleMeta from '../ArticleMeta/ArticleMeta';
import { toast } from '@/utils/toast';
import type { Article } from '@/types/articles';
import MDXPreview from './MDXPreview';
import MDXToolbar from './MDXToolbar';
import { useDraft } from './useDraft';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import style from './MDXEditor.module.scss';

/** 保存动作的类型：草稿只有自己可见，正文对所有人可见 */
type SaveStatus = 'draft' | 'published';

interface Props {
    // 文章实体，正文、id 和右侧展示的详情信息都从这一份数据里取
    article: Article;
}

export default function MDWriteComponent({ article }: Props) {
    const articleId = article.id;
    const content = article.content ?? '';
    const mdRef = useRef<MarkdownSourceMethods>(null);

    // 每个编辑器各自保存源码实例，扩展只初始化一次。
    const sourceViewRef = useRef<EditorView | null>(null);
    const sourceExtensions = useMemo(() => articleSeparatorExtensions(sourceViewRef), []);
    const normalizedContent = normalizeArticleSeparator(content);

    // 草稿状态和本地缓存读写都交给 hook，组件这边只关心预览和保存交互
    const { draft, handleChange, saveNow } = useDraft({
        articleId,
        content: normalizedContent,
        mdRef,
    });
    const { updateArticleRequest } = useArticles();
    const previewContent = useDeferredValue(draft); // 预览解析 markdown 比较费时，用延迟值让输入先渲染出来，长文章下打字不会卡

    const [previewOpen, setPreviewOpen] = useState(false); // 预览页的开关
    const [pendingSave, setPendingSave] = useState<SaveStatus | null>(null); // 待确认的保存类型。有值就代表确认框打开，两种保存共用同一个框

    // 关闭预览。传给预览组件后保持引用稳定，避免每次渲染都重新挂 Esc 监听
    const handleClosePreview = useCallback(() => {
        setPreviewOpen(false);
    }, []);

    // 确认框点确认时执行。此时 pendingSave 还在，对话框会在回调结束后才关掉
    const handleConfirmSave = async () => {
        if (!pendingSave) {
            return;
        }

        // 1. 保存动作跳过节流，点击之后立即落进本地缓存
        saveNow();

        // 2. 调用接口更新数据库中的文章内容
        await updateArticleRequest.run({
            id: articleId,
            content: draft,
            status: pendingSave,
        });

        toast.success('保存成功');

        // 接口回填时同样保证全文只有一个分隔符。
        mdRef.current?.setMarkdown(
            normalizeArticleSeparator(useArticlesStore.getState().articles[articleId].content),
        );
    };

    // 编辑器固定源码模式，只编辑 markdown 原文，渲染效果交给预览页
    return (
        <div className={style.workspace}>
            <div className={style.wrap}>
                {/* 状态栏只管展示，具体动作回调给下面的保存流程 */}
                <MDXToolbar
                    separatorButton={
                        <InsertArticleSeparator
                            viewRef={sourceViewRef}
                            disabled={updateArticleRequest.loading}
                        />
                    }
                    onPreview={() => setPreviewOpen(true)}
                    onSaveDraft={() => setPendingSave('draft')}
                    onPublish={() => setPendingSave('published')}
                />

                {/* 源码模式下组件仍会把内容解析一遍，缺插件会直接报解析错误，所以插件保留但不挂工具栏 */}
                <MarkdownSourceEditor
                    ref={mdRef}
                    viewRef={sourceViewRef}
                    className={style.editor}
                    markdown={normalizedContent}
                    extensions={sourceExtensions}
                    onChange={handleChange}
                    readOnly={updateArticleRequest.loading} // 调用接口更新数据库时，保证文章只读
                />

                {/* 预览页自己管打开状态下的滚动锁定、Esc 关闭和目录跳转 */}
                <MDXPreview
                    open={previewOpen}
                    content={previewContent}
                    onClose={handleClosePreview}
                />

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

            {/* 编辑页不需要目录，只把文章信息固定在右侧 */}
            <aside className={style.side}>
                <ArticleMeta
                    createdAt={article.created_at}
                    lastModifiedAt={article.last_modified_at}
                    views={article.views}
                />
            </aside>
        </div>
    );
}
