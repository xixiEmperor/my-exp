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
import { useCallback, useDeferredValue, useRef, useState } from 'react';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import { toast } from '@/utils/toast';
import MDXPreview from './MDXPreview';
import MDXToolbar from './MDXToolbar';
import { useDraft } from './useDraft';
import style from './MDXEditor.module.scss';

/** 保存动作的类型：草稿只有自己可见，正文对所有人可见 */
type SaveStatus = 'draft' | 'published';

interface Props {
    // 当前编辑的文章 id，本地草稿按它分开存放
    articleId: string;
    // 初始渲染内容由父组件传递，父组件取值时会优先使用本地草稿
    content: string;
}

const plugins = [
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
];

export default function MDWriteComponent({ articleId, content }: Props) {
    const mdRef = useRef<MDXEditorMethods>(null);
    // 草稿状态和本地缓存读写都交给 hook，组件这边只关心预览和保存交互
    const { draft, handleChange, saveNow } = useDraft({ articleId, content, mdRef });
    const previewContent = useDeferredValue(draft); // 预览解析 markdown 比较费时，用延迟值让输入先渲染出来，长文章下打字不会卡

    const [previewOpen, setPreviewOpen] = useState(false); // 预览页的开关
    const [pendingSave, setPendingSave] = useState<SaveStatus | null>(null); // 待确认的保存类型。有值就代表确认框打开，两种保存共用同一个框

    // 关闭预览。传给预览组件后保持引用稳定，避免每次渲染都重新挂 Esc 监听
    const handleClosePreview = useCallback(() => {
        setPreviewOpen(false);
    }, []);

    // 确认框点确认时执行。此时 pendingSave 还在，对话框会在回调结束后才关掉
    const handleConfirmSave = () => {
        if (!pendingSave) {
            return;
        }

        // 保存动作跳过节流，点击之后立即落进本地缓存
        saveNow();

        // 后端保存接口还没接，明确说明这次只落在本地，避免以为已经提交
        toast.warning('保存接口还没接入，内容暂时只保存在本地缓存');
    };

    // 编辑器固定源码模式，只编辑 markdown 原文，渲染效果交给预览页
    return (
        <div className={style.wrap}>
            {/* 状态栏只管展示，具体动作回调给下面的保存流程 */}
            <MDXToolbar
                onPreview={() => setPreviewOpen(true)}
                onSaveDraft={() => setPendingSave('draft')}
                onPublish={() => setPendingSave('published')}
            />

            {/* 源码模式下组件仍会把内容解析一遍，缺插件会直接报解析错误，所以插件保留但不挂工具栏 */}
            <MDXEditor
                ref={mdRef}
                className={style.editor}
                markdown={content}
                plugins={plugins}
                onChange={handleChange}
            />

            {/* 预览页自己管打开状态下的滚动锁定、Esc 关闭和目录跳转 */}
            <MDXPreview open={previewOpen} content={previewContent} onClose={handleClosePreview} />

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
