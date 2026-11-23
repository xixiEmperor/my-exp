import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent,
    type ReactNode,
} from 'react';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import styles from './PlaygroundBanner.module.scss';

interface PlaygroundBannerProps {
    /** 当前是否存在可抽取的已发布场景 */
    hasDemos: boolean;
    /** 随机抽取一个场景并滚动定位 */
    onPickRandom: () => void;
}

const pillarItems: readonly string[] = ['在线交互预览', '真实源码对照', '独立场景拆解'];

// 场景演练场顶部导入横幅：居中式点阵光影舞台，不绑定具体 demo，专注传达实验场氛围与行动入口。
export default function PlaygroundBanner({ hasDemos, onPickRandom }: PlaygroundBannerProps) {
    const isReducedMotion = useReducedMotion();
    const [spotStyle, setSpotStyle] = useState<CSSProperties>({});
    const [activeTone, setActiveTone] = useState<number>(0);
    const frameRef = useRef(0);
    const boundsRef = useRef<DOMRect | null>(null);

    useEffect(() => {
        return () => {
            cancelAnimationFrame(frameRef.current);
        };
    }, []);

    function handlePointerEnter(event: PointerEvent<HTMLElement>) {
        boundsRef.current = event.currentTarget.getBoundingClientRect();
    }

    function handlePointerMove(event: PointerEvent<HTMLElement>) {
        const rect = boundsRef.current;

        if (isReducedMotion || event.pointerType !== 'mouse' || !rect) {
            return;
        }

        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        cancelAnimationFrame(frameRef.current);

        frameRef.current = requestAnimationFrame(() => {
            setSpotStyle({
                '--banner-x': `${x.toFixed(0)}px`,
                '--banner-y': `${y.toFixed(0)}px`,
            } as CSSProperties);
        });
    }

    const pillarNodes: ReactNode[] = [];

    pillarItems.forEach((label, index) => {
        pillarNodes.push(
            <button
                key={label}
                type="button"
                className={styles.pillarPill}
                onPointerEnter={() => {
                    setActiveTone(index);
                }}
                onClick={() => {
                    setActiveTone(index);
                }}
            >
                <span className={styles.capsuleDot} aria-hidden="true" />
                <span>{label}</span>
            </button>,
        );
    });

    return (
        <section
            className={styles.banner}
            data-tone={activeTone}
            style={spotStyle}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            aria-labelledby="playground-banner-title"
        >
            {/* 背景动态光斑与点阵层 */}
            <div className={styles.backdrop} aria-hidden="true">
                <span className={styles.orbPrimary} />
                <span className={styles.orbSecondary} />
                <span className={styles.gridOverlay} />
            </div>

            <div className={styles.content}>
                <h1 id="playground-banner-title" className={styles.title}>
                    在这里，代码不是静止的段落，
                    <br />
                    而是可以随时拆开试玩的<span>实验现场</span>
                </h1>

                <p className={styles.subtitle}>
                    挑选一个感兴趣的技术场景，直接在线体验真实运行效果，并随时对照阅读背后的完整源码实现。
                </p>

                {/* 演练场特性胶囊：悬停或点击切换横幅环境光色 */}
                <div className={styles.capsuleDeck} aria-label="演练场特点">
                    {pillarNodes}
                </div>

                <div className={styles.actions}>
                    <a href="#playground-catalog" className={styles.primaryBtn}>
                        <span>探索全部场景</span>
                        <SiteIcon name="down" size={16} />
                    </a>

                    {hasDemos ? (
                        <button
                            type="button"
                            className={styles.randomBtn}
                            onClick={() => {
                                setActiveTone((prev) => (prev + 1) % 3);
                                onPickRandom();
                            }}
                        >
                            <SiteIcon name="sparkles" size={16} />
                            <span>随机抽一个试试</span>
                        </button>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
