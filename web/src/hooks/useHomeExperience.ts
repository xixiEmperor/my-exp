import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { useHomeInteraction } from '../stores/homeInteraction';

// 每个组件观察自己的引用，进场状态由 React 渲染，避免扫描整棵页面。
export function useHomeVisibility<T extends HTMLElement>(section?: string) {
    const ref = useRef<T>(null);
    const [visible, setVisible] = useState(true);
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        const element = ref.current;

        if (!element || !window.IntersectionObserver) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                setVisible(entry.isIntersecting);

                if (entry.isIntersecting) {
                    setEntered(true);

                    if (section) useHomeInteraction.getState().setActiveSection(section);
                }
            },
            { rootMargin: section ? '-12% 0px -58% 0px' : '0px', threshold: 0 },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [section]);

    return { ref, visible, entered };
}

// 只测量显式绑定的元素，指针反馈留在对应组件，粗指针和减少动效时静止。
export function useHomeTilt(limit = 4) {
    const reduced = useReducedMotion();
    const [style, setStyle] = useState<CSSProperties>({});
    const frame = useRef(0);
    const bounds = useRef<DOMRect | null>(null);
    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    function onPointerEnter(event: PointerEvent<HTMLElement>) {
        bounds.current = event.currentTarget.getBoundingClientRect();
    }

    function onPointerMove(event: PointerEvent<HTMLElement>) {
        if (reduced || event.pointerType !== 'mouse' || !bounds.current) return;

        const rect = bounds.current;
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        cancelAnimationFrame(frame.current);

        frame.current = requestAnimationFrame(() =>
            setStyle({
                '--tilt-x': `${String(-y * limit * 2)}deg`,
                '--tilt-y': `${String(x * limit * 2)}deg`,
                '--px': `${String(x * 24)}px`,
                '--py': `${String(y * 24)}px`,
            } as CSSProperties),
        );
    }

    function onPointerLeave() {
        cancelAnimationFrame(frame.current);
        setStyle({});
    }

    return { style, onPointerEnter, onPointerMove, onPointerLeave };
}

// 滚动帧只读缓存尺寸，进度通过组件状态渲染。
export function useHomeProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let frame = 0;
        let height = 1;
        let previousY = window.scrollY;
        let previousTime = performance.now();
        let lastFast = 0;

        function draw(time: number) {
            frame = 0;
            const y = window.scrollY;
            setProgress(Math.max(0, Math.min(1, y / height)));

            if (
                Math.abs(y - previousY) / Math.max(1, time - previousTime) > 2.4 &&
                time - lastFast > 10000
            ) {
                useHomeInteraction.getState().react('fast');
                lastFast = time;
            }

            previousY = y;
            previousTime = time;
        }

        function schedule() {
            if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
        }

        function measure() {
            height = Math.max(1, document.documentElement.scrollHeight - innerHeight);
            schedule();
        }

        const observer = new ResizeObserver(measure);
        observer.observe(document.body);
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', measure, { passive: true });
        measure();

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', measure);
        };
    }, []);

    return progress;
}

// 时间轴只测量自己的容器，展开时由尺寸观察器更新缓存。
export function useHomeTimeline() {
    const ref = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const element = ref.current;

        if (!element) return;

        let top = 0;
        let height = 1;
        let frame = 0;

        function draw() {
            frame = 0;
            setProgress(Math.max(0, Math.min(1, (scrollY + innerHeight * 0.65 - top) / height)));
        }

        function schedule() {
            if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
        }

        function measure() {
            const bounds = element!.getBoundingClientRect();
            top = bounds.top + scrollY;
            height = Math.max(1, bounds.height);
            schedule();
        }

        const observer = new ResizeObserver(measure);
        observer.observe(element);
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', measure, { passive: true });
        measure();

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', measure);
        };
    }, []);

    return { ref, progress };
}

// 固定挂件收成小图标后留出正文空间，状态只在越过边界时改变。
export function useHomeReading() {
    const [reading, setReading] = useState(false);
    const [hidden, setHidden] = useState(document.hidden);

    useEffect(() => {
        let frame = 0;

        function update() {
            frame = 0;
            setReading(scrollY > 80);
        }

        function scroll() {
            if (!frame) frame = requestAnimationFrame(update);
        }

        function visibility() {
            setHidden(document.hidden);
        }

        window.addEventListener('scroll', scroll, { passive: true });
        document.addEventListener('visibilitychange', visibility);
        update();

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', scroll);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, []);

    return { reading, hidden };
}
