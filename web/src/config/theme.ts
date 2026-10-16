// 主题偏好的非样式部分集中在这里，具体色值统一在 styles/tokens.scss 维护。

export type ThemePreference = 'auto' | 'light' | 'dark';

export type ResolvedTheme = 'light' | 'dark';

// 存储键必须和 index.html 里那段防闪烁脚本保持一致，改动时两处一起改。
export const THEME_STORAGE_KEY = 'xixi-theme';

// 浏览器地址栏配色，跟随最终生效的主题。
export const THEME_COLOR: Record<ResolvedTheme, string> = {
    light: '#f2f5ff',
    dark: '#080c16',
};

const preferences: readonly ThemePreference[] = ['auto', 'light', 'dark'];

// 读取本地保存的偏好。隐私模式禁用 localStorage 时退回 auto，不影响正常使用。
export function readStoredTheme(): ThemePreference {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);

        return preferences.find((item) => item === stored) ?? 'auto';
    } catch {
        // 读不到就当作没有选择过。
        return 'auto';
    }
}

// 把偏好落到文档上。auto 表示跟随系统，此时不写 data-theme，
// 交给 tokens.scss 里的媒体查询接管。
export function applyThemeToDocument(preference: ThemePreference, resolved: ResolvedTheme) {
    const root = document.documentElement;

    if (preference === 'auto') {
        delete root.dataset.theme;
    } else {
        root.dataset.theme = preference;
    }

    try {
        if (preference === 'auto') {
            localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
            localStorage.setItem(THEME_STORAGE_KEY, preference);
        }
    } catch {
        // 存不下就只在本次会话里生效。
    }

    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLOR[resolved]);
}
