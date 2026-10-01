import { createStore } from 'zustand/vanilla';
import { carouselItems, projectPhases } from '../constants/home';

// 只保存首页交互状态，实际滑动过程与当前页计算交给 Swiper。
interface HomeState {
  activeProject: number;
  carouselIndex: number;
  setActiveProject: (index: number) => void;
  setCarouselIndex: (index: number) => void;
}

export const homeStore = createStore<HomeState>()((set) => ({
  activeProject: 0,
  carouselIndex: 0,

  // 在唯一修改入口检查索引，保证详情和选中节点始终能找到对应数据。
  setActiveProject: (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= projectPhases.length) {
      return;
    }

    set({ activeProject: index });
  },

  setCarouselIndex: (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= carouselItems.length) {
      return;
    }

    set({ carouselIndex: index });
  },
}));
