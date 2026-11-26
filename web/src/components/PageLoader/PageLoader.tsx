import { Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import styles from './PageLoader.module.scss';
import { subscribePageTransition } from './pageTransition';

type LoaderPhase = 'hidden' | 'visible' | 'exiting';

interface PageLoaderProps {
    activePath: string;
    phase: Exclude<LoaderPhase, 'hidden'>;
}

interface PageSuspenseProps {
    activePath: string;
    children: ReactNode;
}

interface RouteScene {
    index: string;
    word: string;
    subtitle: string;
}

const EXIT_DURATION_MS = 380;

// 按目标路径匹配对应的出版物章节感文案，让切页加载与当前去向呼应。
function resolveRouteScene(activePath: string): RouteScene {
    if (activePath === '/') {
        return {
            index: '01',
            word: 'HOME',
            subtitle: '首页 · 正在铺展主舞台',
        };
    }

    if (activePath === '/knowledge' || activePath.startsWith('/knowledge/')) {
        return {
            index: '02',
            word: 'KNOWLEDGE',
            subtitle: '知识库 · 正在装订纸页',
        };
    }

    if (activePath === '/playground' || activePath.startsWith('/playground/')) {
        return {
            index: '03',
            word: 'PLAYGROUND',
            subtitle: '演练场 · 正在校准沙盒',
        };
    }

    if (activePath === '/admin' || activePath.startsWith('/admin/')) {
        return {
            index: '04',
            word: 'STUDIO',
            subtitle: '后台 · 正在装配工作台',
        };
    }

    if (activePath === '/prac' || activePath.startsWith('/prac/')) {
        return {
            index: '05',
            word: 'LAB',
            subtitle: '实验页 · 正在加载模块',
        };
    }

    return {
        index: '00',
        word: 'LOADING',
        subtitle: '正在切换页面视图',
    };
}

// 页面级 Suspense 过渡态：顶部细线扫描、3D 翻折纸页徽章与逐字遮罩排版，支持全屏淡入与淡出。
export default function PageLoader({ activePath, phase }: PageLoaderProps) {
    const scene = resolveRouteScene(activePath);
    const [progress, setProgress] = useState(12);
    const isExiting = phase === 'exiting';
    const displayProgress = isExiting ? 100 : progress;

    useEffect(() => {
        if (isExiting) {
            return;
        }

        const reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reducedMotion) {
            return;
        }

        let frameId = 0;
        const startTime = performance.now();

        // 使用指数逼近曲线平滑推进读数，在最低加载时长内完成主要攀升，真实 chunk 就绪前停在 98%。
        const tick = (now: number) => {
            const elapsed = now - startTime;
            const next = Math.min(98, Math.round(12 + 86 * (1 - Math.exp(-elapsed / 320))));

            setProgress(next);

            if (next < 98) {
                frameId = globalThis.requestAnimationFrame(tick);
            }
        };

        frameId = globalThis.requestAnimationFrame(tick);

        return () => {
            globalThis.cancelAnimationFrame(frameId);
        };
    }, [activePath, isExiting]);

    const chars = [...scene.word].map((char, position) => ({
        id: `${scene.word}-${position}-${char}`,
        char,
        position,
    }));

    return (
        <div
            className={`${styles.stage}${isExiting ? ` ${styles.stageExiting}` : ''}`}
            role="status"
            aria-live="polite"
            aria-busy={!isExiting}
            aria-label={isExiting ? '页面加载完成' : `${scene.subtitle}，页面加载中`}
        >
            <div className={styles.topTrack} aria-hidden="true">
                <div className={styles.topBar} />
            </div>

            <div className={styles.gridLines} aria-hidden="true">
                <span className={styles.gridColumn} />
                <span className={styles.gridColumn} />
                <span className={styles.gridColumn} />
                <span className={styles.gridColumn} />
            </div>

            <div className={styles.metaRow} aria-hidden="true">
                <span className={styles.metaCluster}>
                    <span className={styles.liveDot} />
                    <span>{isExiting ? 'READY' : 'LOADING CHUNK'}</span>
                </span>
            </div>

            <div className={styles.center}>
                <div className={styles.folio} aria-hidden="true">
                    <span className={styles.folioBaseLeft} />
                    <span className={styles.folioBaseRight} />
                    <span className={styles.folioLeaf} />
                    <span className={`${styles.folioLeaf} ${styles.folioLeafSecond}`} />
                    <span className={`${styles.folioLeaf} ${styles.folioLeafThird}`} />
                    <span className={styles.folioSpine} />
                </div>

                <div className={styles.titleBlock}>
                    <span className={styles.indexBadge} aria-hidden="true">
                        CHAPTER {scene.index}
                    </span>

                    <div className={styles.wordmark} aria-hidden="true">
                        {chars.map((item) => (
                            <span key={item.id} className={styles.charMask}>
                                <span
                                    className={styles.char}
                                    style={{ '--char-index': item.position } as CSSProperties}
                                >
                                    {item.char}
                                </span>
                            </span>
                        ))}
                    </div>

                    <p className={styles.subtitle}>{scene.subtitle}</p>
                </div>
            </div>

            <div className={styles.footerBar} aria-hidden="true">
                {/* <span className={styles.routePath}>ROUTE // {activePath || '/'}</span> */}

                <div className={styles.equalizer}>
                    <span className={styles.eqBar} />
                    <span className={styles.eqBar} />
                    <span className={styles.eqBar} />
                    <span className={styles.eqBar} />
                    <span className={styles.eqBar} />
                </div>

                <div className={styles.counterWrap}>
                    <span className={styles.counter}>
                        {String(displayProgress).padStart(2, '0')}
                        <span className={styles.counterUnit}>%</span>
                    </span>
                    <div className={styles.miniRail}>
                        <div
                            className={styles.miniFill}
                            style={{ transform: `scaleX(${displayProgress / 100})` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// 仅监听带固定延迟的路由过渡事件，让需要过渡的页面全屏淡入淡出，其余懒加载路由静默切换。
export function PageSuspense({ activePath, children }: PageSuspenseProps) {
    const [phase, setPhase] = useState<LoaderPhase>('hidden');
    const [loaderPath, setLoaderPath] = useState(activePath);
    const activePathRef = useRef(activePath);
    const exitTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

    useEffect(() => {
        activePathRef.current = activePath;
    }, [activePath]);

    useEffect(() => {
        const unsubscribe = subscribePageTransition((active) => {
            if (active) {
                if (exitTimerRef.current !== null) {
                    globalThis.clearTimeout(exitTimerRef.current);
                    exitTimerRef.current = null;
                }

                setLoaderPath(globalThis.location.pathname || activePathRef.current);
                setPhase('visible');

                return;
            }

            const reducedMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (reducedMotion) {
                setPhase('hidden');

                return;
            }

            setPhase('exiting');

            exitTimerRef.current = globalThis.setTimeout(() => {
                exitTimerRef.current = null;
                setPhase('hidden');
            }, EXIT_DURATION_MS);
        });

        return () => {
            unsubscribe();

            if (exitTimerRef.current !== null) {
                globalThis.clearTimeout(exitTimerRef.current);
                exitTimerRef.current = null;
            }
        };
    }, []);

    return (
        <>
            <Suspense fallback={null}>{children}</Suspense>
            {phase === 'hidden' ? null : <PageLoader activePath={loaderPath} phase={phase} />}
        </>
    );
}
