import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// 提示条状态独立放一个 store，这样组件外的普通函数也能直接往里推消息。
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: number;
    type: ToastType;
    content: string;

    // 停留时长，单位毫秒。到期后由 Toast 组件负责退场和移除。
    duration: number;
}

interface ToastState {
    toasts: ToastItem[];
    pushToast: (type: ToastType, content: string, duration: number) => number;
    removeToast: (id: number) => void;
}

// 同时最多显示几条，超出时挤掉最早的一条，避免连续报错铺满屏幕。
const MAX_VISIBLE = 4;

// 自增序号只拿来当 key 和查找依据，不放进状态里，省掉一次多余的更新。
let seed = 0;

export const useToastStore = create<ToastState>()(
    devtools(
        immer((set) => ({
            toasts: [],

            pushToast: (type, content, duration) => {
                seed += 1;

                set((state) => {
                    state.toasts.push({ id: seed, type, content, duration });

                    if (state.toasts.length > MAX_VISIBLE) {
                        state.toasts.splice(0, state.toasts.length - MAX_VISIBLE);
                    }
                });

                return seed;
            },

            removeToast: (id) => {
                set((state) => {
                    state.toasts = state.toasts.filter((item) => item.id !== id);
                });
            },
        })),
    ),
);
