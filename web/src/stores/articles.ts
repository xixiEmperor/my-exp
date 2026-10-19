import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type {
    Folder,
    Article,
    FolderStatus,
    GetFolderChildrenResp,
    NodeType,
} from '@/types/articles';

interface ArticlesStoreState {
    /** 文章实体映射 */
    articles: Record<string, Article>;
    /** 文件夹实体映射 */
    folders: Record<string, Folder>;

    /** 文件夹状态设置 */
    setFolderStatus: (id: string, status: FolderStatus) => void;
    /** 文件夹子节点追加 */
    appendFolderNodes: (id: string, nodes: GetFolderChildrenResp) => void;
}

export const useArticlesStore = create<ArticlesStoreState>()(
    devtools(
        immer((set) => ({
            articles: {},
            folders: {},

            setFolderStatus: (id, status) => {
                set((state) => {
                    const targetFolder = state.folders[id];
                    targetFolder.status = status;
                });
            },

            appendFolderNodes: (id, nodes) => {
                set((state) => {
                    const targetFolder = state.folders[id];
                    for (let n of nodes) {
                        // 直接整条塞进去，name、parentId 这些展示要用的字段不能丢
                        targetFolder.children.push(n);
                    }
                });
            },
        })),
    ),
);
