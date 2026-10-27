import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export interface Draft {
    /** 本地内容对应的文章 id */
    id: string;
    /** 编辑器尚未保存到后端的正文 */
    content: string;
    /** 毫秒时间戳，刷新恢复后仍然是 number */
    updatedAt: number;
}

// 本地记录不包含远端文章状态，修改时间由 store 自动生成。
export type DraftInput = Pick<Draft, 'id' | 'content'>;

interface DraftState {
    /** 按文章 id 保存，各篇文章的本地内容互不影响 */
    draft: Record<string, Draft>;
    getDraft: (id: string) => Draft | undefined;
    setDraft: (value: DraftInput) => void;
    removeDraft: (id: string) => void;
}

export const useDraftStore = create<DraftState>()(
    devtools(
        persist(
            immer((set, get) => ({
                draft: {},

                // 没有本地记录时返回 undefined，由调用方决定下一步如何加载。
                getDraft: (id) => get().draft[id],

                // 首次修改时创建，也可以用完整正文覆盖已有记录。
                setDraft: (value) => {
                    set((state) => {
                        state.draft[value.id] = { ...value, updatedAt: Date.now() };
                    });
                },

                // 后端保存成功后由调用方清理，store 不管理保存请求。
                removeDraft: (id) => {
                    set((state) => {
                        delete state.draft[id];
                    });
                },
            })),
            {
                name: 'article-editor-drafts',
                storage: createJSONStorage(() => localStorage),

                // 仅持久化本地内容，查询和修改方法不会写入 localStorage。
                partialize: (state) => ({ draft: state.draft }),
            },
        ),
    ),
);
