import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

// 订阅系统偏好，偏好变化后也能关闭动画，不复制到业务 store。
function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);

  return () => media.removeEventListener('change', onChange);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
