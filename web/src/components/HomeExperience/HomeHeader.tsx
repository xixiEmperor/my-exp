import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

        if (!dock) return;

        // 窄屏导航分成两行，挂件的起点需要跟随真实导航高度。
        const observer = new ResizeObserver(() =>
            useHomeInteraction.getState().setHeaderHeight(dock.getBoundingClientRect().height),
        );

        observer.observe(dock);

        return () => observer.disconnect();
    }, []);

    const homeSection = useHomeInteraction((state) => state.activeSection);
    const isHome = activePath === '/';
    const isAdmin = activePath === '/admin' || activePath.startsWith('/admin/');
    let active = isHome ? homeSection : 'knowledge';

    if (isAdmin) active = 'admin';

    const brand = (
        <>
            <span className="brand-mark" aria-hidden="true">
                ✳
            </span>
            <span>xixiEmperor的个人小站</span>
        </>
    );

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
                    <Link
                        to="/knowledge"
                        className={active === 'knowledge' ? 'active' : ''}
                        aria-current={active === 'knowledge' ? 'page' : undefined}
                    >
                        知识库
                    </Link>
                </nav>
                <div className="header-actions">{actions}</div>
            </header>
        </div>
    );
}
