import { useEffect, useState, type RefObject } from 'react';

export interface ScrollEdges {
    atStart: boolean;
    atEnd: boolean;
    scrollable: boolean;
}

export type EdgeState = 'none' | 'start' | 'middle' | 'end';

const initialEdges: ScrollEdges = { atStart: true, atEnd: false, scrollable: false };

// 只读地测量横向容器滚到了哪一端，用来决定两端渐隐提示要不要出现。
// 全程只读不写布局，避免和 ResizeObserver 互相触发。
// 站内只有从左到右一种排版方向，所以不处理 RTL 下 scrollLeft 语义不同的情况。
export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdges {
    const [edges, setEdges] = useState<ScrollEdges>(initialEdges);

    useEffect(() => {
        const element = ref.current;

        if (!element) {
            return;
        }

        const measure = () => {
            const max = element.scrollWidth - element.clientWidth;

            // 留 1px 容差，避免小数宽度下两端同时被判为已到头。
            const scrollable = max > 1;
            const atStart = !scrollable || element.scrollLeft <= 1;
            const atEnd = !scrollable || element.scrollLeft >= max - 1;

            setEdges((previous) => {
                const unchanged =
                    previous.scrollable === scrollable &&
                    previous.atStart === atStart &&
                    previous.atEnd === atEnd;

                // 值没变就返回原对象，避免不必要的重渲染。
                return unchanged ? previous : { atStart, atEnd, scrollable };
            });
        };

        measure();
        element.addEventListener('scroll', measure, { passive: true });
        window.addEventListener('resize', measure);

        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);

        observer?.observe(element);

        return () => {
            element.removeEventListener('scroll', measure);
            window.removeEventListener('resize', measure);
            observer?.disconnect();
        };
    }, [ref]);

    return edges;
}

// 把边缘状态压成一个可直接写到 data 属性上的值。
export function describeEdges(edges: ScrollEdges): EdgeState {
    if (!edges.scrollable) {
        return 'none';
    }

    if (edges.atStart) {
        return 'start';
    }

    if (edges.atEnd) {
        return 'end';
    }

    return 'middle';
}
