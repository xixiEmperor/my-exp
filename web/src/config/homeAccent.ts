export type HomeAccent = 'blue' | 'green' | 'orange';

export const HOME_ACCENT_STORAGE_KEY = 'xixi-home-accent';

// 和主题、光标一样，只把个人视觉偏好保存到本机，不依赖存储成功。
export function readStoredHomeAccent(): HomeAccent {
    try {
        const value = localStorage.getItem(HOME_ACCENT_STORAGE_KEY);

        if (value === 'blue' || value === 'green' || value === 'orange') return value;
    } catch {
        // 隐私模式使用默认蓝色，当前会话仍可以换色。
    }

    return 'blue';
}
