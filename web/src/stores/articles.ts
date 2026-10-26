import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { Folder, Article, FolderStatus, GetFolderChildrenResp } from '@/types/articles';

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
    appendFolderNodes: (id: string, nodes: GetFolderChildrenResp) => void;
    /** 文件夹初始化 */
    initFolder: (id: string, name: string, parentId: string | null) => void;
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
                    for (let n of nodes) {
                        if (targetFolder.children.some((item) => item.id === n.id)) {
                            continue;
                        }
                        // 直接整条塞进去，name、parentId 这些展示要用的字段不能丢
                        targetFolder.children.push(n);
                    }
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
        })),
    ),
);
