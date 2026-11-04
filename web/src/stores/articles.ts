import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { Article } from '@/types/articles';
import type { Folder, FolderStatus } from '@/types/folders';
import type { TreeNode } from '@/types/article-tree';

interface Options {
    status?: FolderStatus;
    folderName?: string;
}

interface ArticlesStoreState {
    /** 文章实体映射，某个 id 有实体就说明详情已经缓存过 */
    articles: Record<string, Article>;
    /** 文件夹实体映射 */
    folders: Record<string, Folder>;

    /** 文章详情写入缓存 */
    setArticle: (id: string, article: Article) => void;
    /** 文件夹映射更新 */
    setFolderStatus: (id: string, options: Options) => void;
    /** 文件夹子节点追加 */
    appendFolderNodes: (id: string, nodes: TreeNode[]) => void;
    /** 追加新创建的节点，父目录还没有缓存时先补一个空实体 */
    appendCreatedNode: (parentId: string, node: TreeNode) => void;
    /** 完整目录查询替换子节点，不改变加载状态 */
    setFolderNodes: (id: string, nodes: TreeNode[]) => void;
    /** 文件夹初始化 */
    initFolder: (id: string, name: string, parentId: string | null) => void;
    /** 重命名成功后同步文章实体和目录树里的标题 */
    renameArticleNode: (id: string, title: string) => void;
    /** 重命名成功后同步文件夹实体和目录树里的名称 */
    renameFolderNode: (id: string, name: string) => void;
}

export const useArticlesStore = create<ArticlesStoreState>()(
    devtools(
        immer((set) => ({
            articles: {},
            // 根文件夹是个虚拟节点，页面一进来就能拿它发起第一层查询，不用等后端单独返回
            folders: {
                root: {
                    id: 'root',
                    folderName: '全部文章',
                    parentId: null,
                    children: [],
                    status: 'idle',
                },
            },

            setArticle: (id, article) => {
                set((state) => {
                    // 详情整条写进缓存，后续再点这篇文章直接从这里取
                    state.articles[id] = article;
                });
            },

            setFolderStatus: (id, options) => {
                set((state) => {
                    const targetFolder = state.folders[id];
                    Object.assign(targetFolder, options);
                });
            },

            appendFolderNodes: (id, nodes) => {
                set((state) => {
                    const targetFolder = state.folders[id];

                    nodes.forEach((n) => {
                        if (
                            targetFolder.children.some(
                                (item) => item.id === n.id && item.type === n.type,
                            )
                        ) {
                            return;
                        }

                        // 直接整条塞进去，name、parentId 这些展示要用的字段不能丢
                        targetFolder.children.push(n);
                    });
                });
            },

            appendCreatedNode: (parentId, node) => {
                set((state) => {
                    // 父目录可能还没有展开过，没有实体时先补一个，名称和原来创建时的占位规则一致
                    if (!state.folders[parentId]) {
                        state.folders[parentId] = {
                            id: parentId,
                            folderName: parentId === 'root' ? '全部文章' : parentId,
                            parentId: null,
                            children: [],
                            status: 'idle',
                        };
                    }

                    state.folders[parentId].children.push(node);
                });
            },

            setFolderNodes: (id, nodes) => {
                set((state) => {
                    // 只有两类查询都成功时才替换完整目录。
                    state.folders[id].children = nodes;
                });
            },

            initFolder: (id, name, parentId) => {
                set((state) => {
                    state.folders[id] = {
                        id,
                        folderName: name,
                        parentId,
                        children: [],
                        status: 'idle',
                    };
                });
            },

            renameArticleNode: (id, title) => {
                set((state) => {
                    // 详情缓存里可能还没有这篇文章，有才更新
                    if (state.articles[id]) {
                        state.articles[id].title = title;
                    }

                    // 目录树里的节点是多处轻量引用，逐个文件夹找出同一个节点改掉
                    Object.values(state.folders).forEach((folder) => {
                        const node = folder.children.find(
                            (item) => item.type === 'article' && item.id === id,
                        );

                        if (node) {
                            node.name = title;
                        }
                    });
                });
            },

            renameFolderNode: (id, name) => {
                set((state) => {
                    // 文件夹实体只有展开或创建过才存在，存在才更新
                    if (state.folders[id]) {
                        state.folders[id].folderName = name;
                    }

                    // 目录树里的节点可能还没初始化实体，单独再扫一遍
                    Object.values(state.folders).forEach((folder) => {
                        const node = folder.children.find(
                            (item) => item.type === 'folder' && item.id === id,
                        );

                        if (node) {
                            node.name = name;
                        }
                    });
                });
            },
        })),
    ),
);
