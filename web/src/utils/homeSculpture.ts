// 蓝色路径用 Canvas 实时绘制，鼠标与触摸拖动会改变真实的空间角度。
'use strict';
import { useHomeInteraction } from '../stores/homeInteraction';

export type SculptureAccent = 'blue' | 'green' | 'orange';
interface Surface {
    point: number[];
    normal: number[];
}
interface Face {
    vertices: Surface[];
    normal: number[];
}

export function mountSculpture(
    canvas: HTMLCanvasElement,
    wrap: HTMLDivElement,
    initialAccent: SculptureAccent,
) {
    const controller = new AbortController();

    // 每个挂载实例独占监听，路由切换后通过一个 signal 同时撤销。
    function listen<T extends Event>(
        target: EventTarget,
        type: string,
        handler: (event: T) => void,
        options: AddEventListenerOptions = {},
    ) {
        target.addEventListener(type, handler as EventListener, {
            ...options,
            signal: controller.signal,
        });
    }

    const candidate = canvas.getContext('2d');

    if (!candidate) return null;

    const context = candidate;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const palettes: Record<SculptureAccent, number[]> = {
        blue: [17, 42, 153],
        green: [54, 83, 25],
        orange: [164, 60, 20],
    };
    let color = [...palettes[initialAccent]];
    let targetColor = [...color];
    let angleX = 0.65;
    let angleY = -0.45;
    let velocityX = 0;
    let velocityY = 0;
    let lastX = 0;
    let lastY = 0;
    let dragging = false;
    let visible = true;
    let frameId = 0;
    let lastTime = 0;
    let highSpinSince = 0;
    let segments = 0;
    let sides = 0;
    const faces: Face[] = [];

    // 先缓存模型顶点，动画帧只计算旋转、投影与光照，避免重复生成几何体。
    function normalize(v: number[]) {
        const length = Math.hypot(...v);

        return v.map((value) => {
            return value / length;
        });
    }

    function cross(a: number[], b: number[]) {
        return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }

    function center(t: number) {
        return [
            (2 + 0.65 * Math.cos(3 * t)) * Math.cos(2 * t),
            (2 + 0.65 * Math.cos(3 * t)) * Math.sin(2 * t),
            0.82 * Math.sin(3 * t),
        ];
    }

    function surface(t: number, p: number): Surface {
        const c = center(t);
        const next = center(t + 0.001);
        const tangent = normalize(
            next.map((value, index) => {
                return value - c[index];
            }),
        );
        const n = normalize(cross(tangent, [0, 0, 1]));
        const b = cross(tangent, n);
        const normal = n.map((value, index) => {
            return value * Math.cos(p) + b[index] * Math.sin(p);
        });

        return {
            point: c.map((value, index) => {
                return value + 0.285 * normal[index];
            }),
            normal,
        };
    }

    function rebuildGeometry() {
        const compact = innerWidth <= 760 || devicePixelRatio > 1.5;
        const nextSegments = compact ? 110 : 190;

        if (segments === nextSegments) return;

        segments = nextSegments;
        sides = compact ? 12 : 16;
        faces.length = 0;
        const rings: Surface[][] = [];

        for (let i = 0; i <= segments; i += 1) {
            const ring: Surface[] = [];

            for (let j = 0; j <= sides; j += 1) {
                ring.push(surface((i * 2 * Math.PI) / segments, (j * 2 * Math.PI) / sides));
            }

            rings.push(ring);
        }

        for (let i = 0; i < segments; i += 1) {
            for (let j = 0; j < sides; j += 1) {
                const vertices = [
                    rings[i][j],
                    rings[i + 1][j],
                    rings[i + 1][j + 1],
                    rings[i][j + 1],
                ];
                const normal = normalize(
                    vertices.reduce(
                        (sum, vertex) => {
                            return sum.map((value, index) => {
                                return value + vertex.normal[index];
                            });
                        },
                        [0, 0, 0],
                    ),
                );

                faces.push({
                    vertices,
                    normal,
                });
            }
        }
    }

    rebuildGeometry();

    function rotate(v: number[], cx: number, sx: number, cy: number, sy: number) {
        const y = v[1] * cx - v[2] * sx;
        const z = v[1] * sx + v[2] * cx;

        return [v[0] * cy + z * sy, y, -v[0] * sy + z * cy];
    }

    function project(v: number[]): [number, number] {
        const scale = 9 / (9 - v[2]);

        return [300 + v[0] * 91 * scale, 290 + v[1] * 91 * scale];
    }

    function draw(time: number) {
        frameId = 0;
        const delta = lastTime ? Math.min((time - lastTime) / 16.67, 2) : 1;
        lastTime = time;

        if (!dragging && !motion.matches) {
            angleX += velocityX * delta;
            angleY += velocityY * delta;
            velocityX *= Math.pow(0.92, delta);
            velocityY *= Math.pow(0.92, delta);
        }

        const directColor =
            motion.matches || document.documentElement.classList.contains('is-theme-transition');

        color = color.map((value, index) => {
            return directColor ? targetColor[index] : value + (targetColor[index] - value) * 0.12;
        });

        const ratio = canvas.width / 600;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, 600, 610);
        const shadow = context.createRadialGradient(300, 552, 0, 300, 552, 177);
        shadow.addColorStop(0, 'rgba(20,35,60,0.18)');
        shadow.addColorStop(1, 'rgba(20,35,60,0)');
        context.save();
        context.translate(0, 510);
        context.scale(1, 0.08);
        context.fillStyle = shadow;
        context.fillRect(100, 0, 400, 1100);
        context.restore();

        const cx = Math.cos(angleX);
        const sx = Math.sin(angleX);
        const cy = Math.cos(angleY);
        const sy = Math.sin(angleY);
        const transformed = faces.map((face) => {
            const points = face.vertices.map((vertex) => {
                return rotate(vertex.point, cx, sx, cy, sy);
            });

            return {
                points,
                normal: rotate(face.normal, cx, sx, cy, sy),
                z:
                    points.reduce((sum, p) => {
                        return sum + p[2];
                    }, 0) / 4,
            };
        });

        transformed.sort((a, b) => {
            return a.z - b.z;
        });

        transformed.forEach((face) => {
            const n = face.normal;
            const light = Math.max(0, n[0] * -0.35 + n[1] * -0.62 + n[2] * 0.7);
            const shine = Math.pow(Math.max(0, n[0] * -0.18 + n[1] * -0.5 + n[2] * 0.85), 28);
            const rgb = color.map((value, index) => {
                return Math.min(255, Math.round(value + light * [35, 62, 94][index] + shine * 100));
            });
            const fill = `rgb(${rgb.join(',')})`;
            context.beginPath();

            face.points.forEach((point, index) => {
                const p = project(point);

                if (index === 0) context.moveTo(...p);
                else context.lineTo(...p);
            });

            context.closePath();
            context.fillStyle = fill;
            context.strokeStyle = fill;
            context.lineWidth = 0.55;
            context.fill();
            context.stroke();
        });

        // 拖动信号每个绘制帧只发一次，小伙伴不依赖雕塑的内部速度变量。
        // 只在速度跨过阈值时更新共享状态，不让每帧绘制触发 React 更新。
        const speed = Math.hypot(velocityX, velocityY);

        if (speed > 0.12) {
            if (!highSpinSince) highSpinSince = time;

            if (time - highSpinSince > 300) useHomeInteraction.getState().setSpinning(true);
        } else if (speed < 0.03) {
            highSpinSince = 0;
            useHomeInteraction.getState().setSpinning(false);
        }

        const changing =
            Math.abs(velocityX) + Math.abs(velocityY) > 0.0002 ||
            color.some((value, index) => {
                return Math.abs(value - targetColor[index]) > 0.5;
            });

        if (visible && !document.hidden && !motion.matches && changing) {
            frameId = requestAnimationFrame(draw);
        }
    }

    function requestDraw() {
        if (context && visible && !frameId && !document.hidden) {
            frameId = requestAnimationFrame(draw);
        }
    }

    function resize() {
        rebuildGeometry();
        const size = wrap.getBoundingClientRect().width;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(size * scale);
        canvas.height = Math.round(((size * 610) / 600) * scale);
        requestDraw();
    }

    function beginDrag(event: PointerEvent) {
        if (event.button !== 0) return;

        dragging = true;
        velocityX = 0;
        velocityY = 0;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
    }

    function moveDrag(event: PointerEvent) {
        if (!dragging) return;

        velocityY = (event.clientX - lastX) * 0.009;
        velocityX = event.pointerType === 'touch' ? 0 : (event.clientY - lastY) * 0.009;
        angleY += velocityY;
        angleX += velocityX;
        lastX = event.clientX;
        lastY = event.clientY;
        requestDraw();
    }

    function endDrag() {
        dragging = false;
        requestDraw();
    }

    function reset() {
        angleX = 0.65;
        angleY = -0.45;
        velocityX = 0;
        velocityY = 0;
        requestDraw();
    }

    function keyboard(event: KeyboardEvent) {
        const offsets: Record<string, number[]> = {
            ArrowLeft: [0, -0.22],
            ArrowRight: [0, 0.22],
            ArrowUp: [-0.22, 0],
            ArrowDown: [0.22, 0],
        };

        if (event.key.toLowerCase() === 'r') {
            reset();

            return;
        }

        if (!offsets[event.key]) return;

        event.preventDefault();
        velocityX = 0;
        velocityY = 0;
        angleX += offsets[event.key][0];
        angleY += offsets[event.key][1];
        requestDraw();
    }

    function selectColor(name: SculptureAccent) {
        targetColor = [...palettes[name]];
        requestDraw();
    }

    const sizeObserver = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    sizeObserver?.observe(wrap);
    listen(window, 'resize', resize);

    function observeVisibility(entries: IntersectionObserverEntry[]) {
        visible = entries[0].isIntersecting;

        if (visible) requestDraw();
        else {
            cancelAnimationFrame(frameId);
            frameId = 0;

            // 雕塑离屏后不再继续发转动信号，小伙伴也应停止发晕。
            useHomeInteraction.getState().setSpinning(false);
        }
    }

    const visibilityObserver =
        'IntersectionObserver' in window ? new IntersectionObserver(observeVisibility) : null;

    visibilityObserver?.observe(canvas);

    function visibilityChanged() {
        if (document.hidden) {
            cancelAnimationFrame(frameId);
            frameId = 0;
        } else requestDraw();
    }

    listen(document, 'visibilitychange', visibilityChanged);
    listen(motion, 'change', requestDraw);
    resize();

    // 清理绘制和观察器，StrictMode 的第二次挂载不会叠加动画。
    function disposeSculpture() {
        visible = false;
        controller.abort();
        cancelAnimationFrame(frameId);
        sizeObserver?.disconnect();
        visibilityObserver?.disconnect();
        useHomeInteraction.getState().setSpinning(false);
    }

    // 控件和可见性由 React 负责，绘图模块只暴露操作入口。
    return {
        selectColor,
        beginDrag,
        moveDrag,
        endDrag,
        reset,
        keyboard,
        dispose: disposeSculpture,
    };
}
