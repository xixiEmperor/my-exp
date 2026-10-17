import { create } from 'zustand';
import { projectPhases, wishItems } from '../constants/home';
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'

// 项目卡片允许全部收起，用 -1 表示当前没有展开的卡片。
export const collapsedProject = -1;

// 只保存首页交互状态，实际滑动过程与当前页计算交给 Swiper。
interface HomeState {
    activeProject: number;
    wishlistIndex: number;
    setActiveProject: (index: number) => void;
    setWishlistIndex: (index: number) => void;
}

export const homeStore = create<HomeState>()(
    devtools(
        immer(
            (set) => ({
                activeProject: collapsedProject,
                wishlistIndex: 0,

                // 在唯一修改入口检查索引，保证展开的卡片始终能找到对应数据。
                setActiveProject: (index) => {
                    if (index === collapsedProject) {
                        set({ activeProject: index });

                        return;
                    }

                    if (!Number.isInteger(index) || index < 0 || index >= projectPhases.length) {
                        return;
                    }

                    set({ activeProject: index });
                },

                setWishlistIndex: (index) => {
                    if (!Number.isInteger(index) || index < 0 || index >= wishItems.length) {
                        return;
                    }

                    set({ wishlistIndex: index });
                },
            })
        )
    )
);
