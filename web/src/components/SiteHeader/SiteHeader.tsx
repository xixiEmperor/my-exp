import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import type { ReactNode } from 'react';
import type { ResolvedTheme } from '../../config/theme';
import { mainNavigation } from '../../constants/navigation';
import styles from './SiteHeader.module.scss';
import { useUserStore } from '@/stores/user';
import UserMenu from '../UserMenu/UserMenu';

interface Props {
    activePath: string;
    resolvedTheme: ResolvedTheme;
    onOpenLogin: () => void;
    onToggleTheme: () => void;
    onLogout: () => void;
}

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function SiteHeader({
    activePath,
    resolvedTheme,
    onOpenLogin,
    onToggleTheme,
    onLogout,
}: Props) {
    const isLogin = useUserStore((state) => state.isLogin)
    const userInfo = useUserStore((state) => state.userInfo)

    const mainLinks: ReactNode[] = [];

    // 当前路径只影响主导航状态，锚点入口保持普通链接语义。
    mainNavigation.forEach((item) => {
        const isActive = item.activePath === activePath;

        mainLinks.push(
            <Link
                key={item.id}
                to={item.to}
                className={isActive ? styles.active : ''}
                aria-current={isActive ? 'page' : undefined}
            >
                {item.label}
            </Link>,
        );
    });

    return (
        <header className={styles['site-header']}>
            <div className={styles['header-inner']}>
                <nav className={styles['site-nav']} aria-label="主导航">
                    {mainLinks}
                </nav>
                <div className={styles['home-header-actions']}>
                    <ThemeToggle resolvedTheme={resolvedTheme} onToggle={onToggleTheme} />
                    {isLogin ? <UserMenu userInfo={userInfo!} onLogout={onLogout} /> : 
                        <button
                            className={styles['header-login']}
                            data-open-login=""
                            onClick={onOpenLogin}
                        >
                            <span data-login-label="">登录</span>
                            <span data-icon="arrow">
                                <SiteIcon name="arrow" />
                            </span>
                        </button>
                    }
                </div>
            </div>
        </header>
    );
}
