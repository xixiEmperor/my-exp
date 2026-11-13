import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useHomeInteraction } from '../../stores/homeInteraction';

// 先回到展开前的位置再隐藏节点，避免长时间轴收起后把下方内容突然顶上来。
function scrollBeforeCollapse(top: number, reduced: boolean, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const started = performance.now();
        let frame = 0;
        const abort = () => {
            cancelAnimationFrame(frame);
            reject(new DOMException('组件已卸载', 'AbortError'));
        };
        const finish = () => {
            cancelAnimationFrame(frame);
            signal.removeEventListener('abort', abort);
            resolve();
        };
        const check = () => {
            if (Math.abs(window.scrollY - top) < 2) finish();
            else if (performance.now() - started > 1400) {
                // 浏览器中断平滑滚动时仍恢复位置，不在旧位置直接折掉长列表。
                window.scrollTo({ top, behavior: 'instant' });
                finish();
            } else frame = requestAnimationFrame(check);
        };

        signal.addEventListener('abort', abort, { once: true });

        // 等点击与禁用状态提交后再开始，避免浏览器把恢复滚动覆盖成点击定位。
        frame = requestAnimationFrame(() => {
            window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
            frame = requestAnimationFrame(check);
        });
    });
}

// 展开与滚动恢复集中维护，列表组件只消费状态和切换操作。
export function useJourneyExpansion() {
    const [expanded, setExpanded] = useState(false);
    const [busy, setBusy] = useState(false);
    const startScroll = useRef(0);
    const pending = useRef<AbortController | null>(null);
    const reduced = useReducedMotion();

    useEffect(() => () => pending.current?.abort(), []);

    const toggle = useCallback(async () => {
        if (!expanded) {
            startScroll.current = window.scrollY;
            setExpanded(true);

            return;
        }

        const controller = new AbortController();
        pending.current = controller;
        setBusy(true);

        try {
            await scrollBeforeCollapse(startScroll.current, reduced, controller.signal);
            setExpanded(false);
        } catch {
            // 卸载取消滚动后不再回写旧页面的状态。
        } finally {
            if (!controller.signal.aborted) setBusy(false);
        }
    }, [expanded, reduced]);

    useEffect(() => useHomeInteraction.getState().registerAction('timeline', toggle), [toggle]);

    return { expanded, busy, toggle };
}
