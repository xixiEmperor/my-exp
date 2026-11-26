import {
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { Link } from 'react-router-dom';
import PlaygroundPreview from '@/components/PlaygroundPreview/PlaygroundPreview';
import PlaygroundWorkbench from '@/components/PlaygroundWorkbench/PlaygroundWorkbench';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import { usePlaygroundDetail } from '@/hooks/usePlaygroundDetail';
import styles from './PlaygroundDetailView.module.scss';

// 场景演练详情页：去除多余顶部横幅，聚焦左右双栏源码工作台与实时预览的沉浸式对照体验。
export default function PlaygroundDetailView() {
    const {
        demo,
        siblingVersions,
        loading,
        notFound,
        errorMessage,
        layoutMode,
        sourceCollapsed,
        previewCollapsed,
        splitPercent,
        theaterMode,
        clampSplitPercent,
        resetSplitPercent,
        collapseSource,
        expandSource,
        collapsePreview,
        expandPreview,
        toggleTheaterMode,
        selectVersion,
        retry,
    } = usePlaygroundDetail();

    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    const stageRef = useRef<HTMLDivElement>(null);

    // 指针拖拽中间分栏手柄，按舞台实时像素宽度换算百分比。
    function handleDividerPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
        if (event.button !== 0 || !stageRef.current) {
            return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDraggingSplit(true);

        function handlePointerMove(moveEvent: globalThis.PointerEvent): void {
            const stageEl = stageRef.current;

            if (!stageEl) {
                return;
            }

            const rect = stageEl.getBoundingClientRect();

            if (rect.width <= 0) {
                return;
            }

            const ratio = ((moveEvent.clientX - rect.left) / rect.width) * 100;
            clampSplitPercent(ratio);
        }

        function handlePointerFinish(): void {
            setIsDraggingSplit(false);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerFinish);
            window.removeEventListener('pointercancel', handlePointerFinish);
        }

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerFinish);
        window.addEventListener('pointercancel', handlePointerFinish);
    }

    function handleDividerKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            clampSplitPercent(splitPercent - 3);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            clampSplitPercent(splitPercent + 3);
        } else if (event.key === 'Home') {
            event.preventDefault();
            resetSplitPercent();
        }
    }

    // 1. 初次直达详情且无缓存时的加载态
    if (loading && !demo) {
        return (
            <main id="main" className={styles.page}>
                <section className={styles.stateStage} role="status" aria-live="polite">
                    <span className={styles.stateSpinner}>
                        <SiteIcon name="loading" size={24} />
                    </span>
                    <h1 className={styles.stateTitle}>正在加载场景…</h1>
                </section>
            </main>
        );
    }

    // 2. 访问已删除或未发布版本时明确提示，不静默跳转到其他版本
    if (notFound || (!demo && !errorMessage)) {
        return (
            <main id="main" className={styles.page}>
                <section className={styles.stateStage}>
                    <h1 className={styles.stateTitle}>该场景版本不存在或已下架</h1>
                    <p className={styles.stateDesc}>请返回场景演练场重新选择其他可用场景。</p>
                    <Link to="/playground" className={styles.primaryAction}>
                        <SiteIcon name="arrow-left" size={15} />
                        <span>返回场景演练场</span>
                    </Link>
                </section>
            </main>
        );
    }

    // 3. 网络异常且无缓存时的重试界面
    if (!demo) {
        return (
            <main id="main" className={styles.page}>
                <section className={styles.stateStage} role="alert">
                    <SiteIcon name="alert" size={26} className={styles.stateDangerIcon} />
                    <h1 className={styles.stateTitle}>无法加载当前场景</h1>
                    <p className={styles.stateDesc}>{errorMessage}</p>
                    <div className={styles.stateActions}>
                        <button type="button" className={styles.primaryAction} onClick={retry}>
                            <SiteIcon name="refresh" size={15} />
                            <span>重试</span>
                        </button>
                        <Link to="/playground" className={styles.secondaryAction}>
                            <span>返回演练场</span>
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    const stageStyle = {
        '--split-left': `${String(splitPercent)}%`,
        '--split-right': `${String(Number((100 - splitPercent).toFixed(2)))}%`,
    } as CSSProperties;

    const layoutKey = `${layoutMode}-${String(splitPercent)}-${String(theaterMode)}`;

    return (
        <main id="main" className={`${styles.page}${theaterMode ? ` ${styles.isTheater}` : ''}`}>
            {/* 一体化双栏工作台：左右均支持独立收起并保留各自内部运行状态 */}
            <div
                ref={stageRef}
                className={styles.studioStage}
                data-mode={layoutMode}
                data-dragging={isDraggingSplit ? 'true' : 'false'}
                style={stageStyle}
            >
                {sourceCollapsed ? (
                    <button
                        type="button"
                        className={`${styles.collapsedRail} ${styles.railLeft}`}
                        onClick={expandSource}
                        aria-label="展开源码"
                        title="展开源码"
                    >
                        <SiteIcon name="panel-left-open" size={16} />
                        <span className={styles.railLabel}>源码</span>
                    </button>
                ) : null}

                <PlaygroundWorkbench
                    demo={demo}
                    siblingVersions={siblingVersions}
                    collapsed={sourceCollapsed}
                    layoutKey={layoutKey}
                    onSelectVersion={selectVersion}
                    onCollapse={collapseSource}
                />

                {layoutMode === 'split' ? (
                    <div
                        role="separator"
                        tabIndex={0}
                        aria-orientation="vertical"
                        aria-label="拖拽调整源码区与预览区宽度比例，双击复位"
                        aria-valuemin={28}
                        aria-valuemax={72}
                        aria-valuenow={Math.round(splitPercent)}
                        className={styles.splitHandle}
                        onPointerDown={handleDividerPointerDown}
                        onDoubleClick={resetSplitPercent}
                        onKeyDown={handleDividerKeyDown}
                    />
                ) : null}

                <PlaygroundPreview
                    demo={demo}
                    collapsed={previewCollapsed}
                    theaterMode={theaterMode}
                    isDraggingSplit={isDraggingSplit}
                    onToggleTheater={toggleTheaterMode}
                    onCollapse={collapsePreview}
                />

                {previewCollapsed ? (
                    <button
                        type="button"
                        className={`${styles.collapsedRail} ${styles.railRight}`}
                        onClick={expandPreview}
                        aria-label="展开预览"
                        title="展开预览"
                    >
                        <SiteIcon name="panel-right-open" size={16} />
                        <span className={styles.railLabel}>预览</span>
                    </button>
                ) : null}
            </div>
        </main>
    );
}
