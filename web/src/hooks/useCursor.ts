import { useCallback, useEffect } from 'react';
import { useStore } from 'zustand';
import { applyCursorToDocument, type CursorPreference } from '../config/cursor';
import { useUIStore } from '../stores/ui';

// 光标皮肤编排：store 只存偏好，这里负责同步到文档并暴露切换动作。
export function useCursor() {
    const cursor = useStore(useUIStore, (state) => state.cursor);

    useEffect(() => {
        applyCursorToDocument(cursor);
    }, [cursor]);

    // 两态切换：classic 是默认套装，new 只区分链接和其他两种情况。
    const toggleCursor = useCallback(() => {
        const next: CursorPreference =
            useUIStore.getState().cursor === 'classic' ? 'new' : 'classic';

        useUIStore.getState().setCursor(next);
    }, []);

    return { cursor, toggleCursor };
}
