import { useCallback, useEffect, useRef, useState } from 'react';
import { contactEmail } from '../../constants/home';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useClipboard } from '../../hooks/useClipboard';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { toast } from '../../utils/toast';
import { useHomeMagnet } from '../HomeExperience/HomeMagnetic';

// 邮箱复制、失败提示和庆祝反馈集中维护，联系板块只负责展示。
export function useContactEmail() {
    const { copied, copy } = useClipboard();
    const [fallback, setFallback] = useState(false);
    const lastFeedback = useRef(0);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const magnet = useHomeMagnet();
    const reduced = useReducedMotion();
    const [celebration, setCelebration] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!celebration) return;

        const timer = window.setTimeout(() => setCelebration(null), 900);

        return () => clearTimeout(timer);
    }, [celebration]);

    let copyHint = '点击复制邮箱';

    if (copied) copyHint = '邮箱已复制';
    else if (fallback) copyHint = '复制受限，可手动复制或打开邮件应用';

    const copyEmail = useCallback(async () => {
        try {
            const ok = await copy(contactEmail);
            setFallback(!ok);
            useHomeInteraction.getState().react(ok ? 'copied' : 'copyFailed');

            if (ok && !reduced && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setCelebration({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }

            // 按钮反馈即时更新，读屏与弹出提示留出间隔，连点也不会刷屏。
            if (Date.now() - lastFeedback.current >= 4000) {
                lastFeedback.current = Date.now();

                if (ok) toast.success('邮箱已复制，期待你的来信。');
                else toast.info('请手动复制邮箱，或使用邮件入口。');
            }
        } catch {
            setFallback(true);
        }
    }, [copy, reduced]);

    useEffect(() => useHomeInteraction.getState().registerAction('email', copyEmail), [copyEmail]);

    return { copyHint, fallback, celebration, buttonRef, magnet, copyEmail };
}
