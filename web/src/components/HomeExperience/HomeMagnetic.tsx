import {
    useEffect,
    useRef,
    useState,
    type AnchorHTMLAttributes,
    type ButtonHTMLAttributes,
    type CSSProperties,
    type PointerEvent,
} from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// 按钮自身提供事件和样式，避免全局枚举按钮再写入 DOM。
export function useHomeMagnet() {
    const reduced = useReducedMotion();
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const frame = useRef(0);
    const bounds = useRef<DOMRect | null>(null);
    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    function enter(event: PointerEvent<HTMLElement>) {
        bounds.current = event.currentTarget.getBoundingClientRect();
    }

    function move(event: PointerEvent<HTMLElement>) {
        const rect = bounds.current;

        if (reduced || event.pointerType !== 'mouse' || !rect) return;

        const x = Math.max(-8, Math.min(8, (event.clientX - rect.left - rect.width / 2) * 0.1));
        const y = Math.max(-8, Math.min(8, (event.clientY - rect.top - rect.height / 2) * 0.1));
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => setOffset({ x, y }));
    }

    function leave() {
        cancelAnimationFrame(frame.current);
        setOffset({ x: 0, y: 0 });
    }

    return {
        onPointerEnter: enter,
        onPointerMove: move,
        onPointerLeave: leave,
        style: { '--mx': `${offset.x}px`, '--my': `${offset.y}px` } as CSSProperties,
    };
}

export function HomeMagneticButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
    const magnet = useHomeMagnet();

    return <button {...props} {...magnet} style={{ ...props.style, ...magnet.style }} />;
}

export function HomeMagneticLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
    const magnet = useHomeMagnet();

    return <a {...props} {...magnet} style={{ ...props.style, ...magnet.style }} />;
}
