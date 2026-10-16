import { useSyncExternalStore } from 'react';

const query = '(prefers-color-scheme: dark)';

// 订阅系统明暗偏好，和 useReducedMotion 保持同一套写法，不复制到业务 store。
function subscribe(onChange: () => void) {
    const media = window.matchMedia(query);
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
}

export function usePrefersDark() {
    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(query).matches,
        () => false,
    );
}
