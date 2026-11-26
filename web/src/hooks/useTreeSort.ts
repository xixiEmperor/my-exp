import { useCallback, useMemo, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/react';
import { isSortableOperation } from '@dnd-kit/react/sortable';
import { getArticlesByFolderID } from '@/api/articles';
import { getFolderChildren, sortFolderChildren } from '@/api/folders';
import { RequestError } from '@/api/request';
import { useArticlesStore } from '@/stores/articles';
import type { TreeNode } from '@/types/article-tree';
import { handleError } from '@/utils/errorHandler';
import { toast } from '@/utils/toast';
import { useArticleTree } from './useArticleTree';
import { useRequest } from './useRequest';

/** 单个目录下的两组子节点，不混排，文件夹与文章各自独立维护顺序。 */
export interface DirectoryLists {
    folders: TreeNode[];
    articles: TreeNode[];
}

/** 当前正在弹窗中编辑排序的单个目录草稿。 */
export interface EditingDirectory extends DirectoryLists {
    parentId: string;
}

/** 纯函数数组移动：将 from 位置的元素移到 to 位置，不修改原数组。 */
function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
    const next = list.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    return next;
}

/** 将 Store 中混存的目录子节点拆分成“文件夹组”和“文章组”。 */
function splitChildren(children: readonly TreeNode[]): DirectoryLists {
    const folders: TreeNode[] = [];
    const articles: TreeNode[] = [];

    children.forEach((node) => {
        if (node.type === 'folder') {
            folders.push(node);
        } else {
            articles.push(node);
        }
    });

    return { folders, articles };
}

/** 比较两组节点顺序是否完全一致，用来判断草稿是否有实质改动。 */
function isSameOrder(a: readonly TreeNode[], b: readonly TreeNode[]): boolean {
    if (a.length !== b.length) {
        return false;
    }

    return a.every((item, index) => item.id === b[index]?.id);
}

/**
 * 409 冲突时用服务端最新列表全量替换该目录缓存。
 * 不能复用 fetchDirectory，因为后者使用 appendFolderNodes 只追加不删除，会残留旧节点。
 */
async function refreshDirectory(parentId: string) {
    const { setFolderStatus, setFolderNodes } = useArticlesStore.getState();
    setFolderStatus(parentId, { status: 'loading' });

    try {
        const [folders, articles] = await Promise.all([
            getFolderChildren(parentId),
            getArticlesByFolderID(parentId),
        ]);

        const nodes: TreeNode[] = [
            ...folders.map((folder): TreeNode => ({ ...folder, type: 'folder' })),
            ...articles.map((article): TreeNode => ({
                id: article.id,
                name: article.title,
                parentId: article.folder_id,
                type: 'article',
            })),
        ];

        setFolderNodes(parentId, nodes);
        setFolderStatus(parentId, { status: 'loaded' });
    } catch {
        setFolderStatus(parentId, { status: 'error' });
    }
}

/** 提交单个目录的新顺序；409 冲突时在函数内提示并刷新目录，避免调用方闭包读到旧 error。 */
async function saveDirectoryOrder(draft: EditingDirectory): Promise<'saved' | 'conflict'> {
    try {
        await sortFolderChildren({
            parent_id: draft.parentId,
            folder_ids: draft.folders.map((item) => item.id),
            article_ids: draft.articles.map((item) => item.id),
        });
    } catch (error) {
        if (error instanceof RequestError && error.status === 409) {
            // 先提示后端返回的冲突说明，再拉取最新目录覆盖本地缓存。
            handleError(error);
            await refreshDirectory(draft.parentId);

            return 'conflict';
        }

        // 非 409 错误继续抛给 useRequest，由其统一弹出错误提示。
        throw error;
    }

    // 后端保存成功后，按“文件夹在前、文章在后”写回 Store，侧边栏和知识库页会立即同步。
    useArticlesStore
        .getState()
        .setFolderNodes(draft.parentId, [...draft.folders, ...draft.articles]);

    toast.success('排序已保存');

    return 'saved';
}

export function useTreeSort() {
    const storeFolders = useArticlesStore((state) => state.folders);
    const { find, folderChildrenRequest } = useArticleTree();
    const saveRequest = useRequest(saveDirectoryOrder);

    // 一次只允许编辑一个目录的草稿；其余未改动目录直接从 Store 实时读取。
    const [editing, setEditing] = useState<EditingDirectory | null>(null);

    // 对比草稿与 Store 中原始顺序，判断是否确实发生了位置变化。
    const isDirty = useMemo(() => {
        if (!editing) {
            return false;
        }

        const original = splitChildren(storeFolders[editing.parentId]?.children ?? []);

        return (
            !isSameOrder(editing.folders, original.folders) ||
            !isSameOrder(editing.articles, original.articles)
        );
    }, [editing, storeFolders]);

    // 底部状态栏展示当前正在编辑的目录名称。
    const editingName = useMemo(() => {
        if (!editing || !isDirty) {
            return null;
        }

        return storeFolders[editing.parentId]?.folderName ?? '全部文章';
    }, [editing, isDirty, storeFolders]);

    /** 获取指定目录用于渲染的文件夹组与文章组；若该目录正在编辑则优先返回草稿。 */
    const getDirectoryLists = useCallback(
        (parentId: string): DirectoryLists => {
            if (editing && editing.parentId === parentId) {
                return { folders: editing.folders, articles: editing.articles };
            }

            return splitChildren(storeFolders[parentId]?.children ?? []);
        },
        [editing, storeFolders],
    );

    /** dnd-kit 拖拽结束回调：仅处理同级同类型内的位置变更并更新草稿。 */
    const onDragEnd = useCallback(
        (event: DragEndEvent) => {
            // 取消拖拽或正在提交保存时直接忽略。
            if (event.canceled || saveRequest.loading) {
                return;
            }

            // 只处理来自 useSortable 的排序操作。
            if (!isSortableOperation(event.operation)) {
                return;
            }

            const { source } = event.operation;
            const node = source?.data as TreeNode | undefined;

            if (!source || !node) {
                return;
            }

            // initialIndex 为拖拽前下标，index 为拖拽后下标，未移动时不产生草稿。
            const { initialIndex, index } = source;
            console.log(source);

            if (initialIndex === index || initialIndex < 0 || index < 0) {
                return;
            }

            // 事件回调内直接读最新 Store，避免捕获过期快照。
            const parentId = node.parentId ?? 'root';
            const latestFolders = useArticlesStore.getState().folders;
            const original = splitChildren(latestFolders[parentId]?.children ?? []);

            setEditing((prev) => {
                // 已有其他目录处于待保存状态时，拒绝开启第二个目录的草稿。
                if (prev && prev.parentId !== parentId) {
                    return prev;
                }

                // 首次拖动该目录时以 Store 原始顺序为基线，连续拖动则基于上一次草稿继续调整。
                const base = prev?.parentId === parentId ? prev : original;
                const nextFolders =
                    node.type === 'folder'
                        ? arrayMove(base.folders, initialIndex, index)
                        : base.folders;
                const nextArticles =
                    node.type === 'article'
                        ? arrayMove(base.articles, initialIndex, index)
                        : base.articles;

                // 如果用户把节点拖回原位，视为无改动并自动释放对其他目录的锁定。
                if (
                    isSameOrder(nextFolders, original.folders) &&
                    isSameOrder(nextArticles, original.articles)
                ) {
                    return null;
                }

                return {
                    parentId,
                    folders: nextFolders,
                    articles: nextArticles,
                };
            });
        },
        [saveRequest.loading],
    );

    /** 用户尝试拖动被锁定的其他目录节点时给出轻提示。 */
    const notifyLocked = useCallback(() => {
        toast.info('请先保存或撤销当前目录的调整');
    }, []);

    /** 撤销当前目录的草稿，恢复为 Store 中的顺序。 */
    const reset = useCallback(() => {
        setEditing(null);
    }, []);

    /** 提交当前目录的草稿；保存成功或 409 刷新后都会清空草稿以解锁其他目录。 */
    const save = useCallback(async () => {
        if (!editing || !isDirty || saveRequest.loading) {
            return;
        }

        const result = await saveRequest.run(editing);

        if (result === 'saved' || result === 'conflict') {
            setEditing(null);
        }
    }, [editing, isDirty, saveRequest]);

    return {
        storeFolders,
        editingParentId: isDirty ? (editing?.parentId ?? null) : null,
        editingName,
        isDirty,
        saving: saveRequest.loading,
        getDirectoryLists,
        find,
        retryFolder: folderChildrenRequest.run,
        onDragEnd,
        notifyLocked,
        save,
        reset,
    };
}
