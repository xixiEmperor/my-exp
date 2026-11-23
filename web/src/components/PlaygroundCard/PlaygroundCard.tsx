import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type PointerEvent,
    type ReactNode,
} from 'react';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { DemoResource } from '@/types/demos';
import styles from './PlaygroundCard.module.scss';

interface PlaygroundCardProps {
    /** 已发布的 demo 资源实体 */
    demo: DemoResource;
    /** 卡片索引，仅用于循环分配配色，不对外展示序号 */
    index: number;
    /** 是否处于随机抽卡或磁贴定位的高亮状态 */
    isHighlighted: boolean;
    /** 点击卡片进入场景详情的回调 */
    onSelect: (demo: DemoResource) => void;
}

const toneNames: readonly string[] = ['cobalt', 'emerald', 'amber', 'violet', 'lime'];

const codeLineWidths: readonly string[] = ['62%', '84%', '48%', '74%'];

// 从数据库的 file_paths 中自动提取最多 3 个核心源码文件名作为微缩工作台标签，无需为新 demo 手动维护配置。
function extractFeaturedFiles(filePaths: readonly string[]): string[] {
    const priorityPattern = /\.(tsx|ts|go|vue|jsx|js|scss|css|md)$/i;
    const lockOrConfigPattern = /(lock|tsconfig|eslint|prettier|gitignore)/i;
    const prioritized: string[] = [];
    const fallback: string[] = [];

    for (const fullPath of filePaths) {
        const segments = fullPath.split('/');
        const baseName = segments[segments.length - 1] ?? fullPath;

        if (baseName && !lockOrConfigPattern.test(baseName)) {
            if (priorityPattern.test(baseName) && !prioritized.includes(baseName)) {
                prioritized.push(baseName);
            } else if (!fallback.includes(baseName)) {
                fallback.push(baseName);
            }
        }
    }

    const combined = [...prioritized, ...fallback].slice(0, 3);

    if (combined.length === 0) {
        return ['App.tsx', 'README.md'];
    }

    return combined;
}

// 场景演练卡片：自动根据 demo 数据渲染微缩源码工作台头部、名称、描述与标签，不展示序号与版本号。
export default function PlaygroundCard({
    demo,
    index,
    isHighlighted,
    onSelect,
}: PlaygroundCardProps) {
    const isReducedMotion = useReducedMotion();
    const [cardStyle, setCardStyle] = useState<CSSProperties>({});
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

        const ratioX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const ratioY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        const rotateX = (0.5 - ratioY) * 5.5;
        const rotateY = (ratioX - 0.5) * 5.5;

        cancelAnimationFrame(frameRef.current);

        frameRef.current = requestAnimationFrame(() => {
            setCardStyle({
                '--card-rx': `${rotateX.toFixed(2)}deg`,
                '--card-ry': `${rotateY.toFixed(2)}deg`,
                '--card-spot-x': `${(ratioX * 100).toFixed(1)}%`,
                '--card-spot-y': `${(ratioY * 100).toFixed(1)}%`,
            } as CSSProperties);
        });
    }

    function handlePointerLeave() {
        cancelAnimationFrame(frameRef.current);
        setCardStyle({});
    }

    const featuredFiles = useMemo(() => {
        return extractFeaturedFiles(demo.file_paths ?? []);
    }, [demo.file_paths]);

    const fileTabNodes: ReactNode[] = [];

    featuredFiles.forEach((fileName, tabIndex) => {
        fileTabNodes.push(
            <span
                key={fileName}
                className={`${styles.fileTab}${tabIndex === 0 ? ` ${styles.isPrimaryTab}` : ''}`}
            >
                {fileName}
            </span>,
        );
    });

    const codeLineNodes: ReactNode[] = [];

    for (const width of codeLineWidths) {
        codeLineNodes.push(<span key={width} className={styles.codeLine} style={{ width }} />);
    }

    const tagNodes: ReactNode[] = [];

    if (demo.tags && demo.tags.length > 0) {
        for (const tag of demo.tags) {
            tagNodes.push(
                <span key={tag} className={styles.tag}>
                    {tag}
                </span>,
            );
        }
    }

    const tone = toneNames[index % toneNames.length];
    const descriptionText =
        demo.description?.trim() || '点击进入该场景，在线体验交互效果并拆解完整实现源码。';

    return (
        <article
            id={`demo-card-${demo.id}`}
            data-tone={tone}
            className={`${styles.card}${isHighlighted ? ` ${styles.isHighlighted}` : ''}`}
            style={cardStyle}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
        >
            {/* 顶部微缩工作台预览窗：自动从 demo.file_paths 提取真实核心文件名，零维护成本 */}
            <div className={styles.previewWindow} aria-hidden="true">
                <div className={styles.windowChrome}>
                    <div className={styles.windowDots}>
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className={styles.fileTabs}>{fileTabNodes}</div>
                </div>

                <div className={styles.windowSplit}>
                    <div className={styles.codePane}>{codeLineNodes}</div>
                    <div className={styles.livePane}>
                        <span className={styles.livePulse} />
                        <SiteIcon name="code" size={18} />
                    </div>
                </div>
            </div>

            {/* 对外展示的主体信息：名称、描述与标签 */}
            <div className={styles.body}>
                <h3 className={styles.title}>
                    <button
                        type="button"
                        className={styles.trigger}
                        onClick={() => {
                            onSelect(demo);
                        }}
                    >
                        {demo.name}
                    </button>
                </h3>

                <p className={styles.description}>{descriptionText}</p>

                {tagNodes.length > 0 ? <div className={styles.tags}>{tagNodes}</div> : null}
            </div>

            <footer className={styles.footer} aria-hidden="true">
                <span className={styles.actionText}>进入场景演练</span>
                <span className={styles.arrow}>
                    <SiteIcon name="arrow-up" size={16} />
                </span>
            </footer>
        </article>
    );
}
