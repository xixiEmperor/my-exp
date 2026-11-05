// 光标皮肤的非样式部分集中在这里，具体 cursor 图标统一在 styles/cursor.scss 维护。

export type CursorPreference = 'classic' | 'new';

// 存储键必须和 index.html 里那段防闪烁脚本保持一致，改动时两处一起改。
export const CURSOR_STORAGE_KEY = 'xixi-cursor';

const preferences: readonly CursorPreference[] = ['classic', 'new'];

// 读取本地保存的偏好。隐私模式禁用 localStorage 时退回 classic，不影响正常使用。
export function readStoredCursor(): CursorPreference {
    try {
        const stored = localStorage.getItem(CURSOR_STORAGE_KEY);

        return preferences.find((item) => item === stored) ?? 'classic';
    } catch {
        // 读不到就当作没有选择过。
        return 'classic';
    }
}

// 把偏好落到文档上。styles/cursor.scss 按这个属性在两套图标之间切换。
export function applyCursorToDocument(preference: CursorPreference) {
    document.documentElement.dataset.cursor = preference;

    try {
        localStorage.setItem(CURSOR_STORAGE_KEY, preference);
    } catch {
        // 存不下就只在本次会话里生效。
    }
}
