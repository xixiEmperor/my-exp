import { useState } from 'react';
import { useSortable } from '@dnd-kit/react/sortable';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import type { DirectoryLists } from '@/hooks/useTreeSort';
import type { TreeNode } from '@/types/article-tree';
import type { Folder } from '@/types/folders';
import styles from './ArticleTreeSorter.module.scss';

/** 每往下一层增加的缩进像素，用于清晰表达树层级。 */
const INDENT_STEP = 18;
/** 第 0 层的左侧基础留白。 */
const INDENT_BASE = 8;

interface SortableTreeNodeProps {
    node: TreeNode;
    /** 当前节点在同级同类型分组中的下标，供 useSortable 计算移动前后位置。 */
    index: number;
    /** 所属父目录 ID，根目录为 root。 */
    parentId: string;
    /** 当前节点层级，从 0 开始。 */
    level: number;
    storeFolders: Record<string, Folder>;
    /** 当前处于编辑态的目录 ID；非空时其余目录被锁定不可拖动。 */
    editingParentId: string | null;
    saving: boolean;
    getDirectoryLists: (parentId: string) => DirectoryLists;
    onExpandFolder: (node: TreeNode) => void;
    onRetryFolder: (id: string) => void;
    onLockedAttempt: () => void;
}

export default function SortableTreeNode({
    node,
    index,
    parentId,
    level,
    storeFolders,
    editingParentId,
    saving,
    getDirectoryLists,
    onExpandFolder,
    onRetryFolder,
    onLockedAttempt,
}: SortableTreeNodeProps) {
    // 展开状态仅保留在排序弹窗内部，不影响侧边栏树的展开状态。
    const [open, setOpen] = useState(false);

    // 将 group/type/accept 全部绑定到 `parentId:nodeType`，在 dnd-kit 引擎层彻底隔离跨目录与跨类型碰撞。
    const groupKey = `${parentId}:${node.type}`;
    // 已有其他目录产生未保存草稿时，锁定当前目录节点，提示用户先保存或撤销。
    const lockedByOtherDir = editingParentId !== null && editingParentId !== parentId;
    const dragDisabled = saving || lockedByOtherDir;

    const { ref, handleRef, isDragging } = useSortable({
        id: `${node.type}:${node.id}`,
        index,
        group: groupKey,
        type: groupKey,
        accept: groupKey,
        data: node,
        disabled: dragDisabled,
    });

    const isFolder = node.type === 'folder';
    const folderState = isFolder ? storeFolders[node.id] : undefined;
    // 只有文件夹展开时才读取其子节点列表，避免收起状态下做无效计算。
    const childLists = isFolder && open ? getDirectoryLists(node.id) : null;
    const hasChildren =
        childLists !== null && (childLists.folders.length > 0 || childLists.articles.length > 0);
    const isEditingChildren = isFolder && editingParentId === node.id;

    // 切换文件夹展开状态；首次展开时触发懒加载。
    const handleToggle = () => {
        if (!isFolder) {
            return;
        }

        const nextOpen = !open;
        setOpen(nextOpen);

        if (nextOpen) {
            onExpandFolder(node);
        }
    };

    return (
        <li
            ref={ref}
            className={`${styles.item} ${isDragging ? styles.dragging : ''}`}
            role="treeitem"
            aria-expanded={isFolder ? open : undefined}
        >
            <div className={styles.row} style={{ paddingLeft: level * INDENT_STEP + INDENT_BASE }}>
                {/* 只有按住手柄才能拖动，避免点击展开文件夹时误触发拖拽。 */}
                <button
                    ref={handleRef}
                    type="button"
                    className={`${styles.handle} ${lockedByOtherDir ? styles.locked : ''}`}
                    aria-label={`拖拽调整 ${node.name} 的顺序`}
                    title={lockedByOtherDir ? '请先保存或撤销当前目录的调整' : '按住拖动调整顺序'}
                    disabled={saving}
                    onPointerDown={() => {
                        // 被其他待保存目录锁定时，在按下手柄瞬间给出提示。
                        if (lockedByOtherDir) {
                            onLockedAttempt();
                        }
                    }}
                >
                    <SiteIcon name="grip" size={14} />
                </button>

                {/* 文件夹展示展开箭头，文章保留等宽占位以保证图标与标题左对齐。 */}
                {isFolder ? (
                    <button
                        type="button"
                        className={`${styles.toggle} ${open ? styles.open : ''}`}
                        aria-label={open ? `收起 ${node.name}` : `展开 ${node.name}`}
                        onClick={handleToggle}
                    >
                        <SiteIcon name="chevron" size={13} />
                    </button>
                ) : (
                    <span className={styles.togglePlaceholder} aria-hidden="true" />
                )}

                {/* 节点主体仅用于展示名称和展开文件夹，不提供跳转、重命名或删除操作。 */}
                <span className={styles.nodeMeta} onClick={isFolder ? handleToggle : undefined}>
                    <SiteIcon name={isFolder ? 'folder' : 'file'} size={14} />
                    <span className={styles.label} title={node.name}>
                        {node.name}
                    </span>
                </span>
            </div>

            {isFolder && open && (
                <div
                    className={`${styles.childrenBox} ${isEditingChildren ? styles.editingGroup : ''}`}
                >
                    {folderState?.status === 'loading' && !hasChildren && (
                        <div
                            className={styles.hintRow}
                            style={{ paddingLeft: (level + 1) * INDENT_STEP + INDENT_BASE + 24 }}
                        >
                            加载中...
                        </div>
                    )}

                    {folderState?.status === 'error' && (
                        <div
                            className={styles.hintRow}
                            style={{ paddingLeft: (level + 1) * INDENT_STEP + INDENT_BASE + 24 }}
                        >
                            <span>加载失败</span>
                            <button
                                type="button"
                                className={styles.retryBtn}
                                onClick={() => onRetryFolder(node.id)}
                            >
                                重试
                            </button>
                        </div>
                    )}

                    {folderState?.status === 'loaded' && !hasChildren && (
                        <div
                            className={styles.hintRow}
                            style={{ paddingLeft: (level + 1) * INDENT_STEP + INDENT_BASE + 24 }}
                        >
                            空目录
                        </div>
                    )}

                    {/* 子文件夹组：递归渲染，层级 + 1。 */}
                    {childLists && childLists.folders.length > 0 && (
                        <ul className={styles.list} role="group">
                            {childLists.folders.map((child, childIndex) => (
                                <SortableTreeNode
                                    key={`folder:${child.id}`}
                                    node={child}
                                    index={childIndex}
                                    parentId={node.id}
                                    level={level + 1}
                                    storeFolders={storeFolders}
                                    editingParentId={editingParentId}
                                    saving={saving}
                                    getDirectoryLists={getDirectoryLists}
                                    onExpandFolder={onExpandFolder}
                                    onRetryFolder={onRetryFolder}
                                    onLockedAttempt={onLockedAttempt}
                                />
                            ))}
                        </ul>
                    )}

                    {/* 子文章组：紧随子文件夹组之后渲染。 */}
                    {childLists && childLists.articles.length > 0 && (
                        <ul className={styles.list} role="group">
                            {childLists.articles.map((child, childIndex) => (
                                <SortableTreeNode
                                    key={`article:${child.id}`}
                                    node={child}
                                    index={childIndex}
                                    parentId={node.id}
                                    level={level + 1}
                                    storeFolders={storeFolders}
                                    editingParentId={editingParentId}
                                    saving={saving}
                                    getDirectoryLists={getDirectoryLists}
                                    onExpandFolder={onExpandFolder}
                                    onRetryFolder={onRetryFolder}
                                    onLockedAttempt={onLockedAttempt}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </li>
    );
}
