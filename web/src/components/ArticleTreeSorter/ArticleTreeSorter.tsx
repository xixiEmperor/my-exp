import { useEffect, useId, useRef, useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import { useTreeSort } from '@/hooks/useTreeSort';
import type { TreeNode } from '@/types/article-tree';
import SortableTreeNode from './SortableTreeNode';
import styles from './ArticleTreeSorter.module.scss';

export interface ArticleTreeSorterProps {
    open: boolean;
    onClose: () => void;
}

// 独立的目录排序弹窗：仅提供同级、同类型拖拽排序能力，与侧边栏的跨目录移动互不干扰。
export default function ArticleTreeSorter({ open, onClose }: ArticleTreeSorterProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    // 关闭弹窗时若仍有未保存的草稿，通过二次确认框防止误丢修改。
    const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

    const {
        storeFolders,
        editingParentId,
        editingName,
        isDirty,
        saving,
        getDirectoryLists,
        find,
        retryFolder,
        onDragEnd,
        notifyLocked,
        save,
        reset,
    } = useTreeSort();

    const { root } = storeFolders;
    const rootLists = getDirectoryLists('root');
    const isRootEmpty =
        root.status === 'loaded' &&
        rootLists.folders.length === 0 &&
        rootLists.articles.length === 0;

    // 同步原生 <dialog> 开关、按需拉取根目录并锁定背景滚动，写法与 ConfirmDialog 保持一致。
    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (open) {
            if (!dialog.open) {
                dialog.showModal();
            }

            // 防止直接打开弹窗时根目录尚未加载。
            if (root.status === 'idle') {
                find('root', root.folderName, null);
            }

            const previous = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = previous;
            };
        }

        if (dialog.open) {
            dialog.close();
        }
    }, [open, root.status, root.folderName, find]);

    // 统一收口关闭动作（右上角叉号、底部关闭按钮、Esc 键）。
    const handleRequestClose = () => {
        // 保存请求进行中禁止关闭，避免状态与响应脱节。
        if (saving) {
            return;
        }

        if (isDirty) {
            setDiscardConfirmOpen(true);

            return;
        }

        reset();
        onClose();
    };

    // 用户确认放弃未保存的顺序调整后，清空草稿并关闭弹窗。
    const handleConfirmDiscard = () => {
        reset();
        onClose();
    };

    // 展开子文件夹时复用现有目录树的懒加载能力。
    const handleExpandFolder = (node: TreeNode) => {
        find(node.id, node.name, node.parentId);
    };

    return (
        <>
            <dialog
                ref={dialogRef}
                className={styles.dialog}
                aria-labelledby={titleId}
                onCancel={(event) => {
                    // 拦截原生 Esc 关闭，统一走未保存校验逻辑。
                    event.preventDefault();
                    handleRequestClose();
                }}
            >
                <div className={styles.header}>
                    <div>
                        <h2 id={titleId}>调整目录顺序</h2>
                        <p className={styles.subtitle}>
                            拖动左侧手柄在同级、同类型内排序；文件夹始终排在文章前。
                        </p>
                    </div>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={handleRequestClose}
                        disabled={saving}
                        aria-label="关闭排序弹窗"
                    >
                        <SiteIcon name="close" />
                    </button>
                </div>

                <div className={styles.body}>
                    {root.status === 'loading' &&
                        rootLists.folders.length === 0 &&
                        rootLists.articles.length === 0 && (
                            <div className={styles.emptyState}>目录加载中...</div>
                        )}

                    {root.status === 'error' && (
                        <div className={styles.emptyState}>
                            <span>根目录加载失败</span>
                            <button
                                type="button"
                                className={styles.retryBtn}
                                onClick={() => {
                                    void retryFolder('root');
                                }}
                            >
                                重试
                            </button>
                        </div>
                    )}

                    {isRootEmpty && <div className={styles.emptyState}>暂无文件夹或文章</div>}

                    {(rootLists.folders.length > 0 || rootLists.articles.length > 0) && (
                        /* 弹窗内部使用独立的 DragDropProvider，不与侧边栏的跨目录移动上下文共用。 */
                        <DragDropProvider onDragEnd={onDragEnd}>
                            <div
                                className={`${styles.treeContainer} ${editingParentId === 'root' ? styles.editingGroup : ''}`}
                                role="tree"
                                aria-label="目录排序树"
                            >
                                {/* 根目录文件夹组：始终排在文章组之前，仅在组内排序。 */}
                                {rootLists.folders.length > 0 && (
                                    <ul className={styles.list} role="group">
                                        {rootLists.folders.map((node, index) => (
                                            <SortableTreeNode
                                                key={`folder:${node.id}`}
                                                node={node}
                                                index={index}
                                                parentId="root"
                                                level={0}
                                                storeFolders={storeFolders}
                                                editingParentId={editingParentId}
                                                saving={saving}
                                                getDirectoryLists={getDirectoryLists}
                                                onExpandFolder={handleExpandFolder}
                                                onRetryFolder={(id) => {
                                                    void retryFolder(id);
                                                }}
                                                onLockedAttempt={notifyLocked}
                                            />
                                        ))}
                                    </ul>
                                )}

                                {/* 根目录文章组：独立于文件夹组排序。 */}
                                {rootLists.articles.length > 0 && (
                                    <ul className={styles.list} role="group">
                                        {rootLists.articles.map((node, index) => (
                                            <SortableTreeNode
                                                key={`article:${node.id}`}
                                                node={node}
                                                index={index}
                                                parentId="root"
                                                level={0}
                                                storeFolders={storeFolders}
                                                editingParentId={editingParentId}
                                                saving={saving}
                                                getDirectoryLists={getDirectoryLists}
                                                onExpandFolder={handleExpandFolder}
                                                onRetryFolder={(id) => {
                                                    void retryFolder(id);
                                                }}
                                                onLockedAttempt={notifyLocked}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </DragDropProvider>
                    )}
                </div>

                <div className={styles.footer}>
                    <span className={styles.status}>
                        {editingName ? `正在调整：${editingName}` : '每次保存一个目录的顺序'}
                    </span>
                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={!isDirty || saving}
                            onClick={reset}
                        >
                            撤销
                        </button>
                        <button
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={saving}
                            onClick={handleRequestClose}
                        >
                            关闭
                        </button>
                        <button
                            type="button"
                            className={styles.primaryBtn}
                            disabled={!isDirty || saving}
                            onClick={() => {
                                void save();
                            }}
                        >
                            {saving ? '保存中...' : '保存'}
                        </button>
                    </div>
                </div>
            </dialog>

            <ConfirmDialog
                open={discardConfirmOpen}
                title="放弃未保存的排序？"
                description="当前目录的顺序调整尚未保存，关闭后将丢失本次修改。"
                confirmText="放弃并关闭"
                cancelText="继续编辑"
                danger
                onConfirm={handleConfirmDiscard}
                onClose={() => setDiscardConfirmOpen(false)}
            />
        </>
    );
}
