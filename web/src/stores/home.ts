import { create } from 'zustand';
import { wishItems } from '../constants/home';
import { releaseNotices } from '../constants/releaseNotices';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

// 只保存首页交互状态，实际滑动过程与当前页计算交给 Swiper。
interface HomeState {
    activeNotice: number;
    wishlistIndex: number;
    setActiveNotice: (index: number) => void;
    setWishlistIndex: (index: number) => void;
}

export const homeStore = create<HomeState>()(
    devtools(
        immer((set) => ({
            activeNotice: 0,
            wishlistIndex: 0,

            // 在唯一修改入口检查索引，保证展开的卡片始终能找到对应数据。
            setActiveNotice: (index) => {
                if (!Number.isInteger(index) || index < 0 || index >= releaseNotices.length) {
                    return;
                }

                set({ activeNotice: index });
            },

            setWishlistIndex: (index) => {
                if (!Number.isInteger(index) || index < 0 || index >= wishItems.length) {
                    return;
                }

                set({ wishlistIndex: index });
            },
        })),
    ),
);
