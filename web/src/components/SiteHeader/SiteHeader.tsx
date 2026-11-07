import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import CursorToggle from '../CursorToggle/CursorToggle';
import type { ReactNode } from 'react';
import type { ResolvedTheme } from '../../config/theme';
import type { CursorPreference } from '../../config/cursor';
import { mainNavigation } from '../../constants/navigation';
import styles from './SiteHeader.module.scss';
import { useUserStore } from '@/stores/user';
import UserMenu from '../UserMenu/UserMenu';
import { useHomeMagnet } from '../HomeExperience/HomeMagnetic';
import HomeHeader from '../HomeExperience/HomeHeader';

interface Props {
    activePath: string;
    resolvedTheme: ResolvedTheme;
    cursor: CursorPreference;
    onOpenLogin: () => void;
    onToggleTheme: (origin?: { x: number; y: number }) => void;
    onToggleCursor: () => void;
    onLogout: () => void;
}

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function SiteHeader({
    activePath,
    resolvedTheme,
    cursor,
    onOpenLogin,
    onToggleTheme,
    onToggleCursor,
    onLogout,
}: Props) {
    const magnet = useHomeMagnet();
    const isLogin = useUserStore((state) => state.isLogin);
    const userInfo = useUserStore((state) => state.userInfo);

    const mainLinks: ReactNode[] = [];

    // 当前路径只影响主导航状态，锚点入口保持普通链接语义。
    mainNavigation.forEach((item) => {
        // 子路由也算在这个入口下，比如 /knowledge/:id 时知识库仍然保持高亮
        const isActive =
            item.activePath === activePath ||
            (item.activePath ? activePath.startsWith(`${item.activePath}/`) : false);

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

    // 首页的视觉壳层独立，登录和光标仍调用同一套真实操作。
    // 知识库复用首页导航，只有页面令牌不同，账号操作保持同一个入口。
    if (
        activePath === '/' ||
        activePath === '/knowledge' ||
        activePath.startsWith('/knowledge/') ||
        activePath === '/admin' ||
        activePath.startsWith('/admin/')
    ) {
        return (
            <HomeHeader
                activePath={activePath}
                actions={
                    <>
                        <button
                            {...magnet}
                            id="theme-toggle"
                            className="theme-button"
                            data-magnet
                            aria-label={
                                resolvedTheme === 'dark' ? '切换到浅色主题' : '切换到深色主题'
                            }
                            aria-pressed={resolvedTheme === 'dark'}
                            onClick={(event) => {
                                // 圆心由触发按钮提供，主题 hook 不查找页面元素。
                                const bounds = event.currentTarget.getBoundingClientRect();

                                onToggleTheme({
                                    x: bounds.left + bounds.width / 2,
                                    y: bounds.top + bounds.height / 2,
                                });
                            }}
                        >
                            <span aria-hidden="true">{resolvedTheme === 'dark' ? '☀' : '☾'}</span>
                        </button>
                        <CursorToggle cursor={cursor} onToggle={onToggleCursor} />
                        {isLogin ? (
                            <UserMenu userInfo={userInfo!} onLogout={onLogout} />
                        ) : (
                            <button className="home-login" onClick={onOpenLogin}>
                                登录
                            </button>
                        )}
                    </>
                }
            />
        );
    }

    return (
        <header className={styles['site-header']}>
            <div className={styles['header-inner']}>
                <nav className={styles['site-nav']} aria-label="主导航">
                    {mainLinks}
                </nav>
                <div className={styles['home-header-actions']}>
                    <CursorToggle cursor={cursor} onToggle={onToggleCursor} />
                    <ThemeToggle resolvedTheme={resolvedTheme} onToggle={onToggleTheme} />
                    {isLogin ? (
                        <UserMenu userInfo={userInfo!} onLogout={onLogout} />
                    ) : (
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
                    )}
                </div>
            </div>
        </header>
    );
}
