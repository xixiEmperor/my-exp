import { useEffect, useState, type CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from './components/SiteHeader/SiteHeader';
import SiteFooter from './components/SiteFooter/SiteFooter';
import HomeFooter from './components/HomeExperience/HomeFooter';
import LoginPanel from './components/LoginPanel/LoginPanel';
import ConfirmDialog from './components/ConfirmDialog/ConfirmDialog';
import Toast from './components/Toast/Toast';
import { useSiteShell } from './hooks/useSiteShell';
import { useTheme } from './hooks/useTheme';
import { useCursor } from './hooks/useCursor';
import styles from './App.module.scss';
import homeStyles from './components/HomeExperience/HomeExperience.module.scss';
import { useLogin } from './hooks/useLogin';
import { useHomeInteraction } from './stores/homeInteraction';
import { useUIStore } from './stores/ui';

// 应用壳层组合公共组件，实际页面通过路由出口展示。
export default function App() {
    const shell = useSiteShell();
    const theme = useTheme();
    const cursor = useCursor();
    const headerHeight = useHomeInteraction((state) => state.headerHeight);
    const homeAccent = useUIStore((state) => state.homeAccent);
    const { login, checkLogin, logout } = useLogin();

    useEffect(() => {
        if (shell.activePath !== '/') return;

        return useHomeInteraction.getState().registerAction('theme', theme.toggleTheme);
    }, [shell.activePath, theme.toggleTheme]);

    // 退出登录先弹确认框，用户确认后才真正清理登录态。
    const [logoutOpen, setLogoutOpen] = useState(false);

    // 登录态检查属于副作用，只在启动时跑一次。
    // 写在渲染体里会每次渲染都发起一次检查并回写 store，形成渲染循环；
    // checkLogin 现在是模块作用域的稳定引用，放依赖数组里也不会重复执行。
    useEffect(() => {
        checkLogin();
    }, [checkLogin]);

    return (
        <div
            className={`${styles.app}${shell.activePath === '/' ? ` home-page ${homeStyles.homeRoot}` : ''}`}
            style={
                shell.activePath === '/'
                    ? ({ '--home-header-offset': `${headerHeight}px` } as CSSProperties)
                    : undefined
            }
            data-home-theme={shell.activePath === '/' ? theme.resolvedTheme : undefined}
            data-accent={shell.activePath === '/' ? homeAccent : undefined}
            data-home-root={shell.activePath === '/' ? '' : undefined}
        >
            {/* 公共壳层只组装导航、页面出口、页脚和登录遮罩。 */}
            <a className={styles.skipLink} href="#main">
                跳到主要内容
            </a>
            <SiteHeader
                activePath={shell.activePath}
                resolvedTheme={theme.resolvedTheme}
                cursor={cursor.cursor}
                onOpenLogin={shell.openLogin}
                onToggleTheme={theme.toggleTheme}
                onToggleCursor={cursor.toggleCursor}
                onLogout={() => setLogoutOpen(true)}
            />
            <Outlet />
            {shell.activePath === '/' ? <HomeFooter /> : <SiteFooter />}
            <LoginPanel dialogRef={shell.dialogRef} onClose={shell.closeLogin} onLogin={login} />
            {/* 退出确认挂在壳层，任何页面点退出登录都能弹出。 */}
            <ConfirmDialog
                open={logoutOpen}
                title="退出登录"
                description="退出后需要重新扫码验证，确定现在退出吗？"
                confirmText="退出登录"
                danger
                onConfirm={logout}
                onClose={() => setLogoutOpen(false)}
            />
            {/* 提示条挂在壳层最外层，任何页面和浮层里都能触发。 */}
            <Toast />
        </div>
    );
}
