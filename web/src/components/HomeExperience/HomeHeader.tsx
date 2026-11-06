import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useHomeInteraction } from '../../stores/homeInteraction';

interface Props {
    actions: ReactNode;
}

// 顶栏仍由应用壳层提供登录、主题和光标操作，这里只替换首页的排布。
export default function HomeHeader({ actions }: Props) {
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

    const active = useHomeInteraction((state) => state.activeSection);

    return (
        <div ref={dockRef} className="home-header-dock">
            <header className="site-header shell home-header">
                <a href="#main" className="brand" aria-label="xixiEmperor的个人小站 首页">
                    <span className="brand-mark" aria-hidden="true">
                        ✳
                    </span>
                    <span>xixiEmperor的个人小站</span>
                </a>
                <nav className="desktop-nav" aria-label="主导航">
                    <a
                        href="#main"
                        className={active === 'home' ? 'active' : ''}
                        aria-current={active === 'home' ? 'page' : undefined}
                    >
                        首页
                    </a>
                    <Link
                        to="/knowledge"
                        className={active === 'knowledge' ? 'active' : ''}
                        aria-current={active === 'knowledge' ? 'location' : undefined}
                    >
                        知识库
                    </Link>
                </nav>
                <div className="header-actions">{actions}</div>
            </header>
        </div>
    );
}
