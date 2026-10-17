import { useCallback, useEffect } from 'react';
import { useStore } from 'zustand';
import { applyThemeToDocument, type ResolvedTheme, type ThemePreference } from '../config/theme';
import { useUIStore } from '../stores/ui';
import { usePrefersDark } from './usePrefersDark';

// 把偏好和系统设置合成为一个最终生效的主题。
function resolveTheme(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
    if (theme === 'auto') {
        return prefersDark ? 'dark' : 'light';
    }

    return theme;
}

// 主题编排：store 只存偏好，这里负责算出最终主题并同步到文档。
export function useTheme() {
    const theme = useStore(useUIStore, (state) => state.theme);
    const prefersDark = usePrefersDark();
    const resolvedTheme = resolveTheme(theme, prefersDark);

    useEffect(() => {
        applyThemeToDocument(theme, resolvedTheme);
    }, [theme, resolvedTheme]);

    // 二态按钮：第一次点击会离开 auto 并固定到与系统相反的主题，
    // 之后就是在明暗之间来回切，符合默认跟随系统、选择后记住的直觉。
    const toggleTheme = useCallback(() => {
        useUIStore.getState().setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    }, [resolvedTheme]);

    return { theme, resolvedTheme, toggleTheme };
}
