import { useCallback, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
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
    const transitionBusy = useRef(false);

    useEffect(() => {
        applyThemeToDocument(theme, resolvedTheme);
    }, [theme, resolvedTheme]);

    // 二态按钮：第一次点击会离开 auto 并固定到与系统相反的主题，
    // 之后就是在明暗之间来回切，符合默认跟随系统、选择后记住的直觉。
    const toggleTheme = useCallback(
        async (origin?: { x: number; y: number }) => {
            if (transitionBusy.current) return;

            const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
            const root = document.documentElement;
            const commit = () => {
                // 快照前同步状态与令牌，避免先拍到旧主题再等待 React 的 effect。
                applyThemeToDocument(nextTheme, nextTheme);
                flushSync(() => useUIStore.getState().setTheme(nextTheme));
            };

            if (
                !document.startViewTransition ||
                matchMedia('(prefers-reduced-motion: reduce)').matches
            ) {
                commit();

                return;
            }

            const x = origin?.x ?? innerWidth / 2;
            const y = origin?.y ?? 44;
            const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            transitionBusy.current = true;
            root.classList.add('is-theme-transition');

            try {
                const transition = document.startViewTransition(commit);
                await transition.ready;

                const animation = root.animate(
                    {
                        clipPath: [
                            `circle(0px at ${x}px ${y}px)`,
                            `circle(${radius}px at ${x}px ${y}px)`,
                        ],
                    },
                    {
                        duration: 600,
                        easing: 'cubic-bezier(.2,.7,.2,1)',
                        pseudoElement: '::view-transition-new(root)',
                    },
                );

                await animation.finished;
                await transition.finished;
            } catch {
                // 浏览器取消快照时仍完成用户选择，持久化继续由现有主题配置负责。
                commit();
            } finally {
                transitionBusy.current = false;
                root.classList.remove('is-theme-transition');
            }
        },
        [resolvedTheme],
    );

    return { theme, resolvedTheme, toggleTheme };
}
