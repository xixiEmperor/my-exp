import { createStore } from 'zustand/vanilla';
import { readStoredTheme, type ThemePreference } from '../config/theme';

// 菜单、登录遮罩和主题偏好都属于共享 UI 状态，不在组件中重复保存。
interface UiState {
    menuOpen: boolean;
    loginOpen: boolean;
    theme: ThemePreference;
    toggleMenu: () => void;
    closeMenu: () => void;
    openLogin: () => void;
    closeLogin: () => void;
    closeOverlays: () => void;
    setTheme: (theme: ThemePreference) => void;
}

export const uiStore = createStore<UiState>()((set) => ({
    menuOpen: false,
    loginOpen: false,

    // 初值直接读本地偏好，刷新后主题不会跳一下。
    theme: readStoredTheme(),

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

    setTheme: (theme) => {
        set({ theme });
    },
}));
