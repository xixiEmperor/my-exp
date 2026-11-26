type TransitionListener = (active: boolean) => void;

let pendingCount = 0;
const listeners = new Set<TransitionListener>();

function emit() {
    const active = pendingCount > 0;

    listeners.forEach((listener) => {
        listener(active);
    });
}

// 仅由带最低延迟的懒加载路由触发，确保只有需要过渡的页面才展示全屏幕布。
export function startPageTransition() {
    pendingCount += 1;

    if (pendingCount === 1) {
        emit();
    }
}

export function endPageTransition() {
    if (pendingCount === 0) {
        return;
    }

    pendingCount -= 1;

    if (pendingCount === 0) {
        emit();
    }
}

export function subscribePageTransition(listener: TransitionListener): () => void {
    listeners.add(listener);

    if (pendingCount > 0) {
        listener(true);
    }

    return () => {
        listeners.delete(listener);
    };
}
