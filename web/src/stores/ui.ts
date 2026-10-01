import { createStore } from 'zustand/vanilla';

// 菜单和登录遮罩属于共享 UI 状态，不在组件中重复保存。
interface UiState {
  menuOpen: boolean;
  loginOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  closeOverlays: () => void;
}

export const uiStore = createStore<UiState>()((set) => ({
  menuOpen: false,
  loginOpen: false,

  toggleMenu: () => {
    set((state) => ({ menuOpen: !state.menuOpen }));
  },

  closeMenu: () => {
    set({ menuOpen: false });
  },

  // 打开登录时一并收起菜单，避免两个浮层同时占用交互焦点。
  openLogin: () => {
    set({ loginOpen: true, menuOpen: false });
  },

  closeLogin: () => {
    set({ loginOpen: false });
  },

  closeOverlays: () => {
    set({ menuOpen: false, loginOpen: false });
  },
}));
