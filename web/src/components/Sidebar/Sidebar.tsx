import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './Sidebar.module.scss';

// 和布局样式共用 900px 断点，旋转屏幕时也能及时切回桌面侧栏。
const mobileQuery = '(max-width: 900px)';

function subscribeToViewport(onChange: () => void) {
    const media = window.matchMedia(mobileQuery);
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
}

export interface SidebarProps {
    /** 上半部分内容，通常放导航菜单；不传时这一块完全不渲染 */
    top?: ReactNode;
    /** 下半部分内容，通常放目录、树形列表这类可以独立滚动的区域 */
    bottom?: ReactNode;
    /** 右侧主内容区，一般直接放路由出口 */
    children: ReactNode;
    /** 外层补充类名，方便调用方微调宽度或间距 */
    className?: string;
}

// 通用左右两栏布局。左侧固定宽度并吸顶，上下两段各管各的：
// 上半部分由内容撑开，下半部分吃掉剩余高度并独立滚动，右侧是页面主体。
export default function Sidebar({ top, bottom, children, className }: SidebarProps) {
    const location = useLocation();
    const dialogId = useId();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const [toggleSlot, setToggleSlot] = useState<HTMLElement | null>(null);
    const [openedLocationKey, setOpenedLocationKey] = useState<string | null>(null);
    const isMobile = useSyncExternalStore(
        subscribeToViewport,
        () => window.matchMedia(mobileQuery).matches,
        () => false,
    );

    // 开关绑定当前路由，选中文章或前进后退后抽屉自动收起。
    const isOpen = isMobile && openedLocationKey === location.key;

    // 按钮由 Sidebar 提供，导航只预留位置，没有侧栏的页面不会出现空按钮。
    useEffect(() => {
        setToggleSlot(document.getElementById('sidebar-toggle-slot'));
    }, []);

    useEffect(() => {
        // 切到桌面时清掉开关，避免 dialog 卸载后再次回到手机仍然自动展开。
        if (!isMobile) {
            setOpenedLocationKey(null);

            return;
        }

        const dialog = dialogRef.current;

        if (!isOpen || !dialog) return;

        // 原生模态窗口负责限制背景交互和键盘焦点，关闭后焦点回到展开按钮。
        dialog.showModal();
        closeRef.current?.focus();

        // 锁住页面根节点，避免和目录内确认框各自修改 body 时互相覆盖。
        const previousRootOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';

        return () => {
            dialog.close();
            document.documentElement.style.overflow = previousRootOverflow;
        };
    }, [isOpen, isMobile]);

    // 允许调用方追加类名，没传时保持默认布局
    const layoutClassName = [styles.layout, className].filter(Boolean).join(' ');

    // 桌面和抽屉复用同一份内容，避免同时挂载两棵目录树和重复请求。
    const sidebarContent = (
        <aside className={styles.sidebar}>
            {/* 上半部分：留给导航区，没传内容时不会占位 */}
            {top ? <div className={styles.top}>{top}</div> : null}
            {/* 下半部分：占满剩余高度，内容超出时只在这一块滚动 */}
            {bottom ? <div className={styles.bottom}>{bottom}</div> : null}
        </aside>
    );

    return (
        <div className={layoutClassName}>
            {isMobile ? (
                <dialog
                    ref={dialogRef}
                    id={dialogId}
                    className={styles.drawer}
                    aria-label="侧边目录"
                    onClose={(event) => {
                        // 目录中的确认框单独管理关闭，不能连带关闭外层抽屉。
                        if (event.target === event.currentTarget) {
                            setOpenedLocationKey(null);
                        }
                    }}
                    onCancel={(event) => {
                        if (event.target !== event.currentTarget) return;

                        // Esc 和关闭按钮走同一套状态更新，保持按钮展开状态准确。
                        event.preventDefault();
                        setOpenedLocationKey(null);
                    }}
                    onClick={(event) => {
                        // 原生遮罩的点击目标也是 dialog，只在点击落到抽屉外时关闭。
                        if (event.target !== event.currentTarget) return;

                        const bounds = event.currentTarget.getBoundingClientRect();

                        if (
                            event.clientX < bounds.left ||
                            event.clientX > bounds.right ||
                            event.clientY < bounds.top ||
                            event.clientY > bounds.bottom
                        ) {
                            setOpenedLocationKey(null);
                        }
                    }}
                >
                    <div className={styles.drawerHeader}>
                        <span>目录</span>
                        <button
                            ref={closeRef}
                            type="button"
                            className={styles.closeButton}
                            aria-label="关闭侧边目录"
                            onClick={() => setOpenedLocationKey(null)}
                        >
                            <SiteIcon name="close" />
                        </button>
                    </div>
                    {sidebarContent}
                </dialog>
            ) : (
                sidebarContent
            )}
            {/* 展开入口放在导航第二行左侧，正文保留完整的可用宽度。 */}
            {isMobile && toggleSlot
                ? createPortal(
                      <button
                          type="button"
                          className={styles.toggleButton}
                          aria-label="展开侧边目录"
                          aria-haspopup="dialog"
                          aria-expanded={isOpen}
                          aria-controls={dialogId}
                          onClick={() => setOpenedLocationKey(location.key)}
                      >
                          <SiteIcon name="menu" />
                      </button>,
                      toggleSlot,
                  )
                : null}
            {/* 右侧主内容区，切换路由时只替换 Outlet 里渲染的内容 */}
            <main id="main" className={styles.content}>
                {children}
            </main>
        </div>
    );
}
