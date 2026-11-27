import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { mainNavigation } from '../../constants/navigation';
import SiteMark from '../SiteMark/SiteMark';
import styles from './HomeHeader.module.scss';
import { useHomeInteraction } from '../../stores/homeInteraction';

interface Props {
    actions: ReactNode;
    activePath: string;
}

// 顶栏仍由应用壳层提供登录、主题和光标操作，这里只替换首页的排布。
export default function HomeHeader({ actions, activePath }: Props) {
    const dockRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const dock = dockRef.current;

        if (!dock) {
            return;
        }

        // 窄屏导航分成两行，挂件的起点需要跟随真实导航高度。
        const observer = new ResizeObserver(() => {
            useHomeInteraction.getState().setHeaderHeight(dock.getBoundingClientRect().height);
        });

        observer.observe(dock);

        return () => {
            observer.disconnect();
        };
    }, []);

    const isHome = activePath === '/';
    const isAdmin = activePath === '/admin' || activePath.startsWith('/admin/');
    const isPlayground = activePath === '/playground' || activePath.startsWith('/playground/');
    let active = isHome ? 'home' : 'knowledge';

    if (isAdmin) {
        active = 'admin';
    }

    if (isPlayground) {
        active = 'playground';
    }

    const brand = (
        <>
            {/* 各页面共用导航时，也共用本站的透明标识。 */}
            <SiteMark size={36} />
            <span>xixiEmperor的个人小站</span>
        </>
    );

    const navNodes: ReactNode[] = [];

    // 除首页锚点外，其余主导航项由统一配置数组驱动渲染。
    for (const item of mainNavigation) {
        if (item.id !== 'home') {
            const isItemActive = active === item.id;

            navNodes.push(
                <Link
                    key={item.id}
                    to={item.to}
                    className={isItemActive ? 'active' : ''}
                    aria-current={isItemActive ? 'page' : undefined}
                >
                    {item.label}
                </Link>,
            );
        }
    }

    return (
        <div ref={dockRef} className={`home-header-dock ${styles.dock}`}>
            <header className={`site-header shell home-header ${styles.inner}`}>
                {isHome ? (
                    <a href="#main" className="brand" aria-label="xixiEmperor的个人小站 首页">
                        {brand}
                    </a>
                ) : (
                    <Link to="/" className="brand" aria-label="xixiEmperor的个人小站 首页">
                        {brand}
                    </Link>
                )}
                <nav className="desktop-nav" aria-label="主导航">
                    {/* 侧栏组件把移动端展开按钮挂到这里，只有带侧栏的页面才渲染插槽。 */}
                    {!isHome && !isPlayground ? (
                        <span id="sidebar-toggle-slot" className={styles.sidebarToggleSlot} />
                    ) : null}
                    {isHome ? (
                        <a
                            href="#main"
                            className={active === 'home' ? 'active' : ''}
                            aria-current={active === 'home' ? 'page' : undefined}
                        >
                            首页
                        </a>
                    ) : (
                        <Link to="/">首页</Link>
                    )}
                    {navNodes}
                </nav>
                <div className="header-actions">{actions}</div>
            </header>
        </div>
    );
}
