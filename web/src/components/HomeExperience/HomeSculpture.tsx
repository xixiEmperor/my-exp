import { memo, useEffect, useRef, useState } from 'react';
import { mountSculpture, type SculptureAccent } from '../../utils/homeSculpture';
import { useUIStore } from '../../stores/ui';
import fallbackImage from '../../assets/home/sculpture-fallback.png';

interface Props {
    onAccent: (accent: SculptureAccent) => void;
}

// 高频旋转不经过 React 状态，板块状态变化也不重新创建模型。
const HomeSculpture = memo(({ onAccent }: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [interactive, setInteractive] = useState(false);
    const [dragging, setDragging] = useState(false);
    const accent = useUIStore((state) => state.homeAccent);
    const renderer = useRef<ReturnType<typeof mountSculpture>>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;

        if (!canvas || !wrap) return;

        try {
            if (!canvas.getContext('2d')) {
                setInteractive(false);

                return;
            }
        } catch {
            // Canvas 受限时保留图像，把不可用的拖动入口一起收起。
            setInteractive(false);

            return;
        }

        renderer.current = mountSculpture(canvas, wrap, useUIStore.getState().homeAccent);
        setInteractive(Boolean(renderer.current));

        return () => {
            renderer.current?.dispose();
            renderer.current = null;
        };
    }, []);

    useEffect(() => {
        renderer.current?.selectColor(accent);
    }, [accent]);

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
                    height={610}
                    tabIndex={0}
                    role="img"
                    aria-label="可旋转的雕塑，拖动或使用方向键旋转，按 R 重置"
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
                    alt="一条连续的蓝色路径，交织成三个相连的环"
                    width={600}
                    height={610}
                />
            </div>
            <figcaption className="art-controls">
                {interactive ? (
                    <>
                        <span>拖动转一转</span>
                        <div className="color-options" role="group" aria-label="雕塑颜色">
                            <button
                                className={`color-swatch${accent === 'blue' ? ' selected' : ''}`}
                                onClick={() => onAccent('blue')}
                                data-sculpture-color="blue"
                                aria-label="蓝色雕塑"
                                aria-pressed={accent === 'blue'}
                                style={{ '--swatch': '#254ddb' } as React.CSSProperties}
                            />
                            <button
                                className={`color-swatch${accent === 'green' ? ' selected' : ''}`}
                                onClick={() => onAccent('green')}
                                data-sculpture-color="green"
                                aria-label="绿色雕塑"
                                aria-pressed={accent === 'green'}
                                style={{ '--swatch': '#9aae5d' } as React.CSSProperties}
                            />
                            <button
                                className={`color-swatch${accent === 'orange' ? ' selected' : ''}`}
                                onClick={() => onAccent('orange')}
                                data-sculpture-color="orange"
                                aria-label="橙色雕塑"
                                aria-pressed={accent === 'orange'}
                                style={{ '--swatch': '#e98349' } as React.CSSProperties}
                            />
                        </div>
                        <button
                            id="sculpture-reset"
                            onClick={() => renderer.current?.reset()}
                            className="art-reset"
                            aria-label="重置雕塑角度"
                        >
                            ↻
                        </button>
                    </>
                ) : (
                    <span>一条连续的路径，继续探索</span>
                )}
            </figcaption>
        </figure>
    );
});

export default HomeSculpture;
