import { memo, useEffect, useRef, useState } from 'react';
import type { mountDeskDiorama } from '../../utils/homeDeskDiorama';
import type { SculptureAccent } from '../../utils/homeSculpture';
import { useUIStore } from '../../stores/ui';
import { useHomeInteraction } from '../../stores/homeInteraction';
import { usePrefersDark } from '../../hooks/usePrefersDark';
import fallbackImage from '../../assets/home/sculpture-fallback.png';

interface Props {
    onAccent: (accent: SculptureAccent) => void;
}

// 首屏右侧 3D 微缩开发者书桌岛：支持拖拽旋转、昼夜台灯联动、主题色与实时天气联动。
const HomeSculpture = memo(({ onAccent }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [interactive, setInteractive] = useState(false);
    const [dragging, setDragging] = useState(false);

    const accent = useUIStore((state) => state.homeAccent);
    const themePref = useUIStore((state) => state.theme);
    const prefersDark = usePrefersDark();
    const resolvedTheme =
        themePref === 'dark' || (themePref === 'auto' && prefersDark) ? 'dark' : 'light';
    const weatherIndex = useHomeInteraction((state) => state.weatherIndex);

    const renderer = useRef<ReturnType<typeof mountDeskDiorama>>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;

        if (!canvas || !wrap) return;

        let cancelled = false;

        async function setupDiorama() {
            const { mountDeskDiorama: mount } = await import('../../utils/homeDeskDiorama');

            if (cancelled || !canvasRef.current || !wrapRef.current) return;

            const currentThemePref = useUIStore.getState().theme;
            const initialTheme =
                currentThemePref === 'dark' ||
                (currentThemePref === 'auto' &&
                    globalThis.matchMedia('(prefers-color-scheme: dark)').matches)
                    ? 'dark'
                    : 'light';

            const instance = mount(canvasRef.current, wrapRef.current, {
                accent: useUIStore.getState().homeAccent,
                theme: initialTheme,
                weatherIndex: useHomeInteraction.getState().weatherIndex,
            });

            renderer.current = instance;
            setInteractive(Boolean(instance));
        }

        void setupDiorama();

        return () => {
            cancelled = true;
            renderer.current?.dispose();
            renderer.current = null;
        };
    }, []);

    useEffect(() => {
        renderer.current?.updateState({
            accent,
            theme: resolvedTheme,
            weatherIndex,
        });
    }, [accent, resolvedTheme, weatherIndex]);

    return (
        <figure className="hero-art">
            <div
                className={`sculpture-wrap${interactive ? ' canvas-active' : ''}`}
                id="sculpture-wrap"
                ref={wrapRef}
            >
                <canvas
                    id="sculpture-canvas"
                    ref={canvasRef}
                    data-cursor="拖动"
                    width={600}
                    height={580}
                    tabIndex={0}
                    role="img"
                    aria-label="可旋转的 3D 微缩开发者书桌岛，拖动或使用方向键旋转，按 R 重置"
                    hidden={!interactive}
                    className={dragging ? 'is-dragging' : ''}
                    onPointerDown={(event) => {
                        if (event.button !== 0) return;

                        setDragging(true);
                        renderer.current?.beginDrag(event.nativeEvent);
                    }}
                    onPointerMove={(event) => renderer.current?.moveDrag(event.nativeEvent)}
                    onPointerUp={() => {
                        setDragging(false);
                        renderer.current?.endDrag();
                    }}
                    onPointerCancel={() => {
                        setDragging(false);
                        renderer.current?.endDrag();
                    }}
                    onLostPointerCapture={() => {
                        setDragging(false);
                        renderer.current?.endDrag();
                    }}
                    onKeyDown={(event) => renderer.current?.keyboard(event.nativeEvent)}
                />
                <img
                    className="sculpture"
                    hidden={interactive}
                    src={fallbackImage}
                    alt="微缩开发者书桌工作台"
                    width={600}
                    height={580}
                />
            </div>
            <figcaption className="art-controls">
                {interactive ? (
                    <>
                        <span>拖动转一转</span>
                        <div className="color-options" role="group" aria-label="工作台配色">
                            <button
                                className={`color-swatch${accent === 'blue' ? ' selected' : ''}`}
                                onClick={() => onAccent('blue')}
                                data-sculpture-color="blue"
                                aria-label="钴蓝配色"
                                aria-pressed={accent === 'blue'}
                                style={{ '--swatch': '#254ddb' } as React.CSSProperties}
                            />
                            <button
                                className={`color-swatch${accent === 'green' ? ' selected' : ''}`}
                                onClick={() => onAccent('green')}
                                data-sculpture-color="green"
                                aria-label="森绿配色"
                                aria-pressed={accent === 'green'}
                                style={{ '--swatch': '#9aae5d' } as React.CSSProperties}
                            />
                            <button
                                className={`color-swatch${accent === 'orange' ? ' selected' : ''}`}
                                onClick={() => onAccent('orange')}
                                data-sculpture-color="orange"
                                aria-label="陶橙配色"
                                aria-pressed={accent === 'orange'}
                                style={{ '--swatch': '#e98349' } as React.CSSProperties}
                            />
                        </div>
                        <button
                            id="sculpture-reset"
                            onClick={() => renderer.current?.reset()}
                            className="art-reset"
                            aria-label="重置书桌岛视角"
                        >
                            ↻
                        </button>
                    </>
                ) : (
                    <span>一方书桌，继续探索</span>
                )}
            </figcaption>
        </figure>
    );
});

export default HomeSculpture;
