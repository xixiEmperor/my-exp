import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent,
    type ReactNode,
} from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import styles from './PlaygroundStage.module.scss';

type StageModeId = 'viewport' | 'stream' | 'pulse';

interface StageMode {
    id: StageModeId;
    title: string;
    caption: string;
}

interface StageRow {
    id: string;
    width: string;
    subWidth: string;
}

interface StreamLane {
    id: string;
    delay: number;
    tone: 'primary' | 'second' | 'third';
}

interface PulseNode {
    id: string;
    x: number;
    y: number;
    delay: string;
}

const stageModes: readonly StageMode[] = [
    { id: 'viewport', title: '虚拟视口', caption: '上下移动鼠标，只有视口里的几行在真正渲染' },
    { id: 'stream', title: '分片传输', caption: '文件切成小块多路并行，最后在终点拼回完整' },
    { id: 'pulse', title: '实时推送', caption: '中心节点一次广播，所有连接几乎同时收到' },
];

const stageRows: readonly StageRow[] = [
    { id: 'row-1', width: '74%', subWidth: '38%' },
    { id: 'row-2', width: '58%', subWidth: '46%' },
    { id: 'row-3', width: '86%', subWidth: '52%' },
    { id: 'row-4', width: '66%', subWidth: '42%' },
    { id: 'row-5', width: '80%', subWidth: '34%' },
    { id: 'row-6', width: '62%', subWidth: '48%' },
];

const streamLanes: readonly StreamLane[] = [
    { id: 'lane-1', delay: 0, tone: 'primary' },
    { id: 'lane-2', delay: 0.45, tone: 'second' },
    { id: 'lane-3', delay: 0.9, tone: 'third' },
];

const pulseNodes: readonly PulseNode[] = [
    { id: 'node-1', x: 22, y: 26, delay: '0s' },
    { id: 'node-2', x: 78, y: 24, delay: '0.4s' },
    { id: 'node-3', x: 18, y: 74, delay: '0.8s' },
    { id: 'node-4', x: 80, y: 72, delay: '1.2s' },
    { id: 'node-5', x: 50, y: 14, delay: '0.6s' },
];

// 视口一次覆盖的行数，和样式里视口框的高度一一对应。
const VISIBLE_ROWS = 3;
// 单行高度加行间距，视口框按这个步长移动。
const ROW_STEP = 44;
// 自动轮播间隔，悬停时暂停，方便用户自己操作。
const AUTO_PLAY_INTERVAL = 4800;

// 可交互的机制演示台：三种常见场景的抽象动画，指针悬停时倾斜并暂停轮播。
export default function PlaygroundStage() {
    const isReducedMotion = useReducedMotion();
    const [activeMode, setActiveMode] = useState<StageModeId>('viewport');
    const [isHovering, setIsHovering] = useState(false);
    // 指针在舞台内的纵向比例（0 ~ 1），驱动视口框跟随移动。
    const [pointerRatioY, setPointerRatioY] = useState(0.35);
    const [tiltStyle, setTiltStyle] = useState<CSSProperties>({});
    const frameRef = useRef(0);
    const boundsRef = useRef<DOMRect | null>(null);

    useEffect(() => {
        return () => {
            cancelAnimationFrame(frameRef.current);
        };
    }, []);

    useEffect(() => {
        if (isHovering || isReducedMotion) {
            return;
        }

        const timer = window.setInterval(() => {
            setActiveMode((current) => {
                const currentIndex = stageModes.findIndex((item) => item.id === current);

                return stageModes[(currentIndex + 1) % stageModes.length].id;
            });
        }, AUTO_PLAY_INTERVAL);

        return () => {
            window.clearInterval(timer);
        };
    }, [isHovering, isReducedMotion]);

    function handlePointerEnter(event: PointerEvent<HTMLDivElement>) {
        boundsRef.current = event.currentTarget.getBoundingClientRect();
        setIsHovering(true);
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        const rect = boundsRef.current;

        if (isReducedMotion || event.pointerType !== 'mouse' || !rect) {
            return;
        }

        const ratioX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const ratioY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

        // 同一帧内只提交最后一次位置，避免高频指针事件触发多次渲染。
        cancelAnimationFrame(frameRef.current);

        frameRef.current = requestAnimationFrame(() => {
            setPointerRatioY(ratioY);

            setTiltStyle({
                '--stage-rx': `${((0.5 - ratioY) * 7).toFixed(2)}deg`,
                '--stage-ry': `${((ratioX - 0.5) * 7).toFixed(2)}deg`,
                '--stage-spot-x': `${(ratioX * 100).toFixed(1)}%`,
                '--stage-spot-y': `${(ratioY * 100).toFixed(1)}%`,
            } as CSSProperties);
        });
    }

    function handlePointerLeave() {
        cancelAnimationFrame(frameRef.current);
        setIsHovering(false);
        setPointerRatioY(0.35);
        setTiltStyle({});
    }

    const activeStartRow = Math.round(pointerRatioY * (stageRows.length - VISIBLE_ROWS));
    const currentMode = stageModes.find((item) => item.id === activeMode) ?? stageModes[0];

    const rowNodes: ReactNode[] = [];

    stageRows.forEach((row, index) => {
        const isActive = index >= activeStartRow && index < activeStartRow + VISIBLE_ROWS;

        rowNodes.push(
            <div key={row.id} className={`${styles.row}${isActive ? ` ${styles.isActive}` : ''}`}>
                <span className={styles.rowDot} />
                <div className={styles.rowBars}>
                    <span className={styles.rowPrimary} style={{ width: row.width }} />
                    <span className={styles.rowSecondary} style={{ width: row.subWidth }} />
                </div>
            </div>,
        );
    });

    const laneNodes: ReactNode[] = [];

    for (const lane of streamLanes) {
        laneNodes.push(
            <div key={lane.id} className={styles.lane} data-tone={lane.tone}>
                <span className={styles.packet} style={{ animationDelay: `${lane.delay}s` }} />
                <span
                    className={styles.packet}
                    style={{ animationDelay: `${lane.delay + 1.1}s` }}
                />
            </div>,
        );
    }

    const pulseLines: ReactNode[] = [];
    const pulseSatellites: ReactNode[] = [];

    for (const node of pulseNodes) {
        pulseLines.push(
            <line
                key={node.id}
                x1="50%"
                y1="50%"
                x2={`${node.x}%`}
                y2={`${node.y}%`}
                className={styles.pulseLine}
            />,
        );

        pulseSatellites.push(
            <span
                key={node.id}
                className={styles.satellite}
                style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: node.delay }}
            />,
        );
    }

    const tabNodes: ReactNode[] = [];

    for (const mode of stageModes) {
        const isSelected = mode.id === activeMode;

        tabNodes.push(
            <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`${styles.tab}${isSelected ? ` ${styles.isSelected}` : ''}`}
                onClick={() => {
                    setActiveMode(mode.id);
                }}
            >
                {mode.title}
            </button>,
        );
    }

    return (
        <div
            className={styles.stage}
            style={tiltStyle}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        >
            <div className={styles.card}>
                <div className={styles.canvas} aria-hidden="true">
                    {activeMode === 'viewport' ? (
                        <div className={styles.viewport}>
                            <div
                                className={styles.viewportFrame}
                                style={{ transform: `translateY(${activeStartRow * ROW_STEP}px)` }}
                            />
                            <div className={styles.rows}>{rowNodes}</div>
                        </div>
                    ) : null}

                    {activeMode === 'stream' ? (
                        <div className={styles.stream}>
                            <span className={styles.source} />
                            <div className={styles.lanes}>{laneNodes}</div>
                            <svg viewBox="0 0 80 80" className={styles.target}>
                                <circle cx="40" cy="40" r="30" className={styles.ringTrack} />
                                <circle cx="40" cy="40" r="30" className={styles.ringProgress} />
                            </svg>
                        </div>
                    ) : null}

                    {activeMode === 'pulse' ? (
                        <div className={styles.pulse}>
                            <svg className={styles.pulseLines} viewBox="0 0 300 200">
                                {pulseLines}
                            </svg>
                            <span className={styles.hub}>
                                <i />
                                <i />
                            </span>
                            {pulseSatellites}
                        </div>
                    ) : null}
                </div>

                <p className={styles.caption} aria-live="polite">
                    {currentMode.caption}
                </p>

                <div className={styles.tabs} role="tablist" aria-label="切换演示场景">
                    {tabNodes}
                </div>
            </div>
        </div>
    );
}
