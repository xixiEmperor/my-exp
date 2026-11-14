import { useRef, type KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import { homeStore } from '../../stores/home';
import { releaseNotices } from '../../constants/releaseNotices';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// 点击与键盘选择共用入口，将目标节点滚入横向轨道的可见范围。
export function useReleaseTimeline() {
    const active = useStore(homeStore, (state) => state.activeNotice);
    const setActive = useStore(homeStore, (state) => state.setActiveNotice);
    const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const reduced = useReducedMotion();

    const select = (index: number, focus = false) => {
        if (index < 0 || index >= releaseNotices.length) return;

        setActive(index);
        const node = nodeRefs.current[index];

        if (focus) node?.focus({ preventScroll: true });

        // 只调整横向位置，页面的纵向阅读位置保持稳定。
        if (node?.parentElement) {
            const track = node.parentElement;

            track.scrollTo({
                left: node.offsetLeft - (track.clientWidth - node.clientWidth) / 2,
                behavior: reduced ? 'instant' : 'smooth',
            });
        }
    };

    const keyboard = (event: KeyboardEvent<HTMLButtonElement>, origin: number) => {
        const count = releaseNotices.length;
        const next = {
            ArrowRight: (origin + 1) % count,
            ArrowLeft: (origin - 1 + count) % count,
            Home: 0,
            End: count - 1,
        }[event.key];

        if (next === undefined) return;

        event.preventDefault();
        select(next, true);
    };

    return { active, nodeRefs, select, keyboard };
}
