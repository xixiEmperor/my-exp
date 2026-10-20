import type { ReactNode } from 'react';
import styles from './Sidebar.module.scss';

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
    // 允许调用方追加类名，没传时保持默认布局
    const layoutClassName = [styles.layout, className].filter(Boolean).join(' ');

    return (
        <div className={layoutClassName}>
            <aside className={styles.sidebar}>
                {/* 上半部分：留给导航区，没传内容时不会占位 */}
                {top ? <div className={styles.top}>{top}</div> : null}
                {/* 下半部分：占满剩余高度，内容超出时只在这一块滚动 */}
                {bottom ? <div className={styles.bottom}>{bottom}</div> : null}
            </aside>
            {/* 右侧主内容区，切换路由时只替换 Outlet 里渲染的内容 */}
            <main id="main" className={styles.content}>
                {children}
            </main>
        </div>
    );
}
