import { create } from 'zustand';
import { readStoredTheme, type ThemePreference } from '../config/theme';
import { readStoredCursor, type CursorPreference } from '../config/cursor';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

// 菜单、登录遮罩、主题和光标偏好都属于共享 UI 状态，不在组件中重复保存。
interface UiState {
    menuOpen: boolean;
    loginOpen: boolean;
    theme: ThemePreference;
    cursor: CursorPreference;
    toggleMenu: () => void;
    closeMenu: () => void;
    openLogin: () => void;
    closeLogin: () => void;
    closeOverlays: () => void;
    setTheme: (theme: ThemePreference) => void;
    setCursor: (cursor: CursorPreference) => void;
}

export const useUIStore = create<UiState>()(
    devtools(
        immer((set) => ({
            menuOpen: false,
            loginOpen: false,

            // 初值直接读本地偏好，刷新后主题不会跳一下。
            theme: readStoredTheme(),

            // 光标皮肤同理，classic 和 new 两套之间的切换不走主题状态。
            cursor: readStoredCursor(),

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

            setCursor: (cursor) => {
                set({ cursor });
            },
        })),
    ),
);
