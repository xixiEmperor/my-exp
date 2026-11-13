import '@mdxeditor/editor/style.css';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useArticlePreview } from '@/hooks/useArticlePreview';
import { useArticles } from '@/hooks/useArticles';
import { useArticlesStore } from '@/stores/articles';
import { initDB, getByArticleId } from '@/utils/idb';
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
    const { previewOpen, previewLoading, previewContent, openPreview, closePreview } =
        useArticlePreview();

    const [pendingSave, setPendingSave] = useState<SaveStatus | null>(null); // 待确认的保存类型。有值就代表确认框打开，两种保存共用同一个框

    // 组件初次加载时初始化 IndexedDB
    useEffect(() => {
        initDB().then(() => {
            console.log('IndexedDB 加载成功');
        });
    }, []);

    // 确认框点确认时执行。此时 pendingSave 还在，对话框会在回调结束后才关掉
    const handleConfirmSave = async () => {
        if (!pendingSave) {
            return;
        }

        // 更新接口可能还要把正文里的图片上传到 R2，先挂一条不会自动消失的 loading 提示，
        // 等请求真正结束（无论成功失败）再统一移除。
        const loadingToastId = toast.loading(
            pendingSave === 'published'
                ? '正在发布文章，图片上传可能需要一点时间…'
                : '正在保存草稿，图片上传可能需要一点时间…',
        );

        try {
            // 1. 保存动作跳过节流，点击之后立即落进本地缓存
            saveNow();

            // 2. 构造请求的 FormData
            // 2.1 基础信息
            const formData = new FormData();
            formData.append('id', articleId);
            formData.append('content', draft);
            formData.append('status', pendingSave);

            // 2.2 图片数据
            const items = (await getByArticleId(articleId)) ?? [];
            for (let item of items) {
                formData.append(item.cdnURL, item.imageData); // 这里用 cdnURL 做键名是因为所有信息都可以从 url 反解出来
            }

            // 3. 调用接口更新数据库中的文章内容
            const savedArticle = await updateArticleRequest.run(formData);

            // 请求失败时 useRequest 已经弹过错误提示，这里不再覆盖成功提示
            if (!savedArticle) {
                return;
            }

            toast.success('保存成功');

            // 接口回填时同样保证全文只有一个分隔符。
            mdRef.current?.setMarkdown(
                normalizeArticleSeparator(useArticlesStore.getState().articles[articleId].content),
            );
        } finally {
            // 成功、失败和提前返回都走这里，避免 loading 提示一直挂在页面上
            toast.dismiss(loadingToastId);
        }
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
                    onPreview={() => void openPreview(draft)}
                    onSaveDraft={() => setPendingSave('draft')}
                    onPublish={() => setPendingSave('published')}
                />

                {/* 编辑区只负责改 markdown 原文，排版效果交给预览页 */}
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
                    loading={previewLoading}
                    onClose={closePreview}
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
