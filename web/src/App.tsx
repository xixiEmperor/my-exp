import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from './components/SiteHeader/SiteHeader';
import SiteFooter from './components/SiteFooter/SiteFooter';
import LoginPanel from './components/LoginPanel/LoginPanel';
import Toast from './components/Toast/Toast';
import { useSiteShell } from './hooks/useSiteShell';
import { useTheme } from './hooks/useTheme';
import styles from './App.module.scss';
import { useLogin } from './hooks/useLogin';

// 应用壳层组合公共组件，实际页面通过路由出口展示。
export default function App() {
    const shell = useSiteShell();
    const theme = useTheme();
    const { login, checkLogin, logout } = useLogin()

    // 登录态检查属于副作用，只在启动时跑一次。
    // 写在渲染体里会每次渲染都发起一次检查并回写 store，形成渲染循环；
    // checkLogin 现在是模块作用域的稳定引用，放依赖数组里也不会重复执行。
    useEffect(() => {
        checkLogin()
    }, [checkLogin])

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
                onLogout={logout}
            />
            <Outlet />
            <SiteFooter />
            <LoginPanel dialogRef={shell.dialogRef} onClose={shell.closeLogin} onLogin={login}/>
            {/* 提示条挂在壳层最外层，任何页面和浮层里都能触发。 */}
            <Toast />
        </div>
    );
}
