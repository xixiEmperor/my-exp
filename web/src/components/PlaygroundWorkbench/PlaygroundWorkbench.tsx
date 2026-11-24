import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import type { DemoResource } from '@/types/demos';
import { mountDemoWorkbench, type WorkbenchSnapshot } from './workbenchRuntime';
import styles from './PlaygroundWorkbench.module.scss';

interface PlaygroundWorkbenchProps {
    /** 当前激活版本的 demo 实体 */
    demo: DemoResource;
    /** 同场景下可供切换的已发布版本列表 */
    siblingVersions: readonly DemoResource[];
    /** 外层分栏是否已收起源码面板（收起时保留 DOM 与已打开标签） */
    collapsed: boolean;
    /** 外层布局尺寸指纹，变化时通知编辑器刷新尺寸 */
    layoutKey: string;
    /** 切换版本回调 */
    onSelectVersion: (target: DemoResource) => void;
    /** 收起左侧源码面板回调 */
    onCollapse: () => void;
}

const INITIAL_SNAPSHOT: WorkbenchSnapshot = {
    phase: 'booting',
    statusText: '正在初始化源码工作台…',
    activeFile: null,
    errorMessage: null,
};

// 演练场左侧只读源码工作台：极简头部承载返回、场景名、版本切换、目录开关与收起控制。
export default function PlaygroundWorkbench({
    demo,
    siblingVersions,
    collapsed,
    layoutKey,
    onSelectVersion,
    onCollapse,
}: PlaygroundWorkbenchProps) {
    const sidebarRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const versionMenuRef = useRef<HTMLDivElement>(null);

    const [retrySeed, setRetrySeed] = useState(0);
    const [explorerVisible, setExplorerVisible] = useState(true);
    const [versionMenuOpen, setVersionMenuOpen] = useState(false);
    const [snapshot, setSnapshot] = useState<WorkbenchSnapshot>(INITIAL_SNAPSHOT);

    // 绑定指定 demo 版本的只读文件系统与编辑器部件，仅在版本切换或手动重试时重建。
    useEffect(() => {
        const sidebarEl = sidebarRef.current;
        const editorEl = editorRef.current;

        if (!sidebarEl || !editorEl) {
            return;
        }

        setSnapshot(INITIAL_SNAPSHOT);

        return mountDemoWorkbench({
            demo,
            sidebarContainer: sidebarEl,
            editorContainer: editorEl,
            onSnapshot: setSnapshot,
        });
    }, [demo, retrySeed]);

    // 面板重新展开、侧栏目录显隐切换或分栏比例变化时，通知 Monaco 重新测量画布宽度。
    useEffect(() => {
        if (collapsed) {
            return;
        }

        const frameId = requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
        });

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, [collapsed, explorerVisible, layoutKey]);

    // 点击外部或按 Escape 时收起版本下拉浮层。
    useEffect(() => {
        if (!versionMenuOpen) {
            return;
        }

        function handleOutsidePointer(event: MouseEvent): void {
            const target = event.target as Node | null;

            if (versionMenuRef.current && target && !versionMenuRef.current.contains(target)) {
                setVersionMenuOpen(false);
            }
        }

        function handleEscapeKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setVersionMenuOpen(false);
            }
        }

        window.addEventListener('mousedown', handleOutsidePointer);
        window.addEventListener('keydown', handleEscapeKey);

        return () => {
            window.removeEventListener('mousedown', handleOutsidePointer);
            window.removeEventListener('keydown', handleEscapeKey);
        };
    }, [versionMenuOpen]);

    const versionOptionNodes: ReactNode[] = [];

    for (const item of siblingVersions) {
        const isSelected = item.id === demo.id;
        const itemImpl = item.implementation === 'default' ? '标准实现' : item.implementation;

        versionOptionNodes.push(
            <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`${styles.versionOption}${isSelected ? ` ${styles.isSelected}` : ''}`}
                onClick={() => {
                    setVersionMenuOpen(false);
                    onSelectVersion(item);
                }}
            >
                <span className={styles.versionOptionText}>
                    v{item.verison} · {itemImpl}
                </span>
                {isSelected ? <SiteIcon name="check" size={14} /> : null}
            </button>,
        );
    }

    return (
        <section
            className={styles.sourcePane}
            data-collapsed={collapsed ? 'true' : 'false'}
            aria-label="只读源码工作台"
            aria-hidden={collapsed}
        >
            {/* 左侧工作台极简头部：返回、标题、版本与面板操作 */}
            <header className={styles.paneHeader}>
                <div className={styles.headerLeft}>
                    <Link
                        to="/playground"
                        className={styles.backBtn}
                        title="返回场景演练场"
                        aria-label="返回场景演练场"
                    >
                        <SiteIcon name="arrow-left" size={15} />
                    </Link>

                    <h1 className={styles.demoTitle} title={demo.name}>
                        {demo.name}
                    </h1>

                    {siblingVersions.length > 1 ? (
                        <div ref={versionMenuRef} className={styles.versionWrap}>
                            <button
                                type="button"
                                className={styles.versionBtn}
                                aria-haspopup="listbox"
                                aria-expanded={versionMenuOpen}
                                onClick={() => {
                                    setVersionMenuOpen((open) => !open);
                                }}
                            >
                                <span>v{demo.verison}</span>
                                <SiteIcon
                                    name="down"
                                    size={12}
                                    className={versionMenuOpen ? styles.chevronOpen : undefined}
                                />
                            </button>

                            {versionMenuOpen ? (
                                <div
                                    className={styles.versionMenu}
                                    role="listbox"
                                    aria-label="切换版本"
                                >
                                    {versionOptionNodes}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <span className={styles.versionStatic}>v{demo.verison}</span>
                    )}
                </div>

                {snapshot.activeFile ? (
                    <div className={styles.activeFilePath} title={snapshot.activeFile}>
                        {snapshot.activeFile}
                    </div>
                ) : (
                    <div />
                )}

                <div className={styles.headerRight}>
                    <button
                        type="button"
                        className={`${styles.toolBtn}${explorerVisible ? ` ${styles.isActive}` : ''}`}
                        aria-pressed={explorerVisible}
                        title={explorerVisible ? '隐藏文件目录' : '显示文件目录'}
                        onClick={() => {
                            setExplorerVisible((prev) => !prev);
                        }}
                    >
                        <SiteIcon name="folder-tree" size={14} />
                        <span>目录</span>
                    </button>

                    <button
                        type="button"
                        className={styles.toolBtn}
                        onClick={onCollapse}
                        title="收起源码区"
                    >
                        <SiteIcon name="panel-left-close" size={14} />
                        <span>收起</span>
                    </button>
                </div>
            </header>

            {/* Monaco + VS Code 服务挂载画布：目录树与多标签编辑器均由工作台托管 */}
            <div className={`${styles.workbench} monaco-workbench`}>
                <div
                    ref={sidebarRef}
                    className={styles.sidebarPart}
                    data-hidden={explorerVisible ? 'false' : 'true'}
                />
                <div ref={editorRef} className={styles.editorPart} />

                {snapshot.phase === 'booting' ? (
                    <div className={styles.overlayVeil} role="status">
                        <span className={styles.spinner}>
                            <SiteIcon name="loading" size={18} />
                        </span>
                        <span>正在加载工作台…</span>
                    </div>
                ) : null}

                {snapshot.phase === 'error' ? (
                    <div className={styles.overlayVeil} role="alert">
                        <SiteIcon name="alert" size={20} className={styles.errorIcon} />
                        <span>{snapshot.errorMessage || '源码加载失败'}</span>
                        <button
                            type="button"
                            className={styles.retryBtn}
                            onClick={() => {
                                setRetrySeed((value) => value + 1);
                            }}
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
