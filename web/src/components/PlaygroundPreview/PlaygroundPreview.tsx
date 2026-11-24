import { useEffect, useState } from 'react';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import type { DemoResource } from '@/types/demos';
import { getDemoPreviewUrl } from '@/utils/demos';
import styles from './PlaygroundPreview.module.scss';

interface PlaygroundPreviewProps {
    /** 当前激活版本的 demo 资源 */
    demo: DemoResource;
    /** 右侧预览面板是否处于收起态（收起时保留 iframe 运行时状态，不卸载） */
    collapsed: boolean;
    /** 是否处于宽幅视野 */
    theaterMode: boolean;
    /** 是否正在拖拽中间分割条（开启透明遮罩避免 iframe 吞掉指针事件） */
    isDraggingSplit: boolean;
    /** 切换宽幅视野回调 */
    onToggleTheater: () => void;
    /** 收起右侧预览面板回调 */
    onCollapse: () => void;
}

type PreviewStageStatus = 'loading' | 'ready' | 'error';

// 演练场右侧效果预览舞台：极简 48px 控制头 + 全幅沙箱 iframe 画布。
export default function PlaygroundPreview({
    demo,
    collapsed,
    theaterMode,
    isDraggingSplit,
    onToggleTheater,
    onCollapse,
}: PlaygroundPreviewProps) {
    const previewUrl = getDemoPreviewUrl(demo);
    const [reloadCount, setReloadCount] = useState(0);
    const [stageStatus, setStageStatus] = useState<PreviewStageStatus>('loading');

    // 切换版本或 demo 时同步重置加载状态，iframe 按新地址自动切换。
    useEffect(() => {
        setStageStatus('loading');
    }, [demo.id, demo.verison]);

    function handleReloadPreview(): void {
        setStageStatus('loading');
        setReloadCount((value) => value + 1);
    }

    return (
        <section
            className={styles.previewPane}
            data-collapsed={collapsed ? 'true' : 'false'}
            aria-label={`${demo.name} 效果预览`}
            aria-hidden={collapsed}
        >
            {/* 右侧预览极简控制头 */}
            <header className={styles.paneHeader}>
                <div className={styles.headerLeft}>
                    <span className={styles.statusDot} data-status={stageStatus} />
                    <span className={styles.headerTitle}>效果预览</span>
                </div>

                <div className={styles.headerRight}>
                    <button
                        type="button"
                        className={styles.toolBtn}
                        onClick={handleReloadPreview}
                        title="刷新预览"
                    >
                        <SiteIcon
                            name="refresh"
                            size={13}
                            className={stageStatus === 'loading' ? styles.spinning : undefined}
                        />
                        <span>刷新</span>
                    </button>

                    <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.toolBtn}
                        title="在新标签页打开"
                    >
                        <span>新窗口</span>
                        <SiteIcon name="arrow-up" size={13} />
                    </a>

                    <button
                        type="button"
                        className={`${styles.toolBtn}${theaterMode ? ` ${styles.isActive}` : ''}`}
                        aria-pressed={theaterMode}
                        onClick={onToggleTheater}
                        title={theaterMode ? '退出宽幅' : '宽幅视野'}
                    >
                        <SiteIcon name={theaterMode ? 'minimize' : 'maximize'} size={13} />
                    </button>

                    <button
                        type="button"
                        className={styles.toolBtn}
                        onClick={onCollapse}
                        title="收起预览区"
                    >
                        <SiteIcon name="panel-right-close" size={14} />
                        <span>收起</span>
                    </button>
                </div>
            </header>

            {/* 实时沙箱画布 */}
            <div className={styles.viewportWrap}>
                <iframe
                    key={`${demo.id}-${demo.verison}-${String(reloadCount)}`}
                    src={previewUrl}
                    title={`${demo.name} v${demo.verison} 效果预览`}
                    className={styles.iframe}
                    sandbox="allow-scripts allow-same-origin"
                    referrerPolicy="no-referrer"
                    onLoad={() => {
                        setStageStatus('ready');
                    }}
                    onError={() => {
                        setStageStatus('error');
                    }}
                />

                {/* 拖拽分割条时铺设透明捕获层，防止指针进入 iframe 后断流 */}
                {isDraggingSplit ? <div className={styles.dragShield} aria-hidden="true" /> : null}

                {stageStatus === 'loading' ? (
                    <div className={styles.stageOverlay} role="status">
                        <span className={styles.overlaySpinner}>
                            <SiteIcon name="loading" size={20} />
                        </span>
                        <span className={styles.overlayText}>正在加载预览…</span>
                    </div>
                ) : null}

                {stageStatus === 'error' ? (
                    <div className={styles.stageOverlay} role="status">
                        <SiteIcon name="alert" size={22} className={styles.errorIcon} />
                        <span className={styles.overlayText}>预览加载失败</span>
                        <button
                            type="button"
                            className={styles.overlayRetryBtn}
                            onClick={handleReloadPreview}
                        >
                            <SiteIcon name="refresh" size={13} />
                            <span>重试</span>
                        </button>
                    </div>
                ) : null}
            </div>
        </section>
    );
}
