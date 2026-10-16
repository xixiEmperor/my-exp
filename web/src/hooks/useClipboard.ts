import { useCallback, useEffect, useRef, useState } from 'react';

// 复制成功后的提示保留时长。
const resetDelay = 2000;

// 复制状态只用于按钮上的短暂反馈，过期后自动复位。
export function useClipboard() {
    const [copied, setCopied] = useState(false);
    const timerRef = useRef(0);

    useEffect(
        () => () => {
            window.clearTimeout(timerRef.current);
        },
        [],
    );

    const copy = useCallback(async (text: string) => {
        if (!text) {
            return false;
        }

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.clearTimeout(timerRef.current);

            timerRef.current = window.setTimeout(() => {
                setCopied(false);
            }, resetDelay);

            return true;
        } catch {
            // 浏览器拒绝剪贴板权限时保持原样，由调用方决定怎么提示。
            return false;
        }
    }, []);

    return { copied, copy };
}
