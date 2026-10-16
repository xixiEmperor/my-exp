import { Outlet } from 'react-router-dom';
import SiteHeader from './components/SiteHeader/SiteHeader';
import SiteFooter from './components/SiteFooter/SiteFooter';
import LoginPanel from './components/LoginPanel/LoginPanel';
import { useSiteShell } from './hooks/useSiteShell';
import { useTheme } from './hooks/useTheme';
import styles from './App.module.scss';

// 应用壳层组合公共组件，实际页面通过路由出口展示。
export default function App() {
    const shell = useSiteShell();
    const theme = useTheme();

    return (
        <div className={styles.app}>
            {/* 公共壳层只组装导航、页面出口、页脚和登录遮罩。 */}
            <a className={styles.skipLink} href="#main">
                跳到主要内容
            </a>
            <SiteHeader
                activePath={shell.activePath}
                resolvedTheme={theme.resolvedTheme}
                onOpenLogin={shell.openLogin}
                onToggleTheme={theme.toggleTheme}
            />
            <Outlet />
            <SiteFooter />
            <LoginPanel dialogRef={shell.dialogRef} onClose={shell.closeLogin} />
        </div>
    );
}
