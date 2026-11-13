import { useRef, type KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import { homeStore } from '../../stores/home';
import { projectPhases } from '../../constants/home';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// 节点选择、键盘移动和横向定位共用同一份状态。
export function useProjectTimeline() {
    const storedActive = useStore(homeStore, (state) => state.activeProject);
    const setActive = useStore(homeStore, (state) => state.setActiveProject);
    const phaseRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const reduced = useReducedMotion();

    // 兼容旧版折叠状态，进度公告始终展示一个阶段。
    const currentIndex = projectPhases.findIndex((phase) => phase.isCurrent);
    const active = storedActive >= 0 ? storedActive : Math.max(0, currentIndex);

    const select = (index: number, focus = false) => {
        setActive(index);
        const node = phaseRefs.current[index];

        if (focus) node?.focus({ preventScroll: true });

        // 只滚动节点所在的横向轨道，不改变整页的阅读位置。
        if (node?.parentElement) {
            const track = node.parentElement;

            track.scrollTo({
                left: node.offsetLeft - (track.clientWidth - node.clientWidth) / 2,
                behavior: reduced ? 'instant' : 'smooth',
            });
        }
    };

    // 索引由渲染闭包传入，方向键仅通过已注册引用移动焦点。
    const keyboard = (event: KeyboardEvent<HTMLButtonElement>, origin: number) => {
        const next = {
            ArrowRight: (origin + 1) % projectPhases.length,
            ArrowLeft: (origin - 1 + projectPhases.length) % projectPhases.length,
            Home: 0,
            End: projectPhases.length - 1,
        }[event.key];

        if (next === undefined) return;

        event.preventDefault();
        select(next, true);
    };

    return { active, currentIndex, phaseRefs, select, keyboard };
}
