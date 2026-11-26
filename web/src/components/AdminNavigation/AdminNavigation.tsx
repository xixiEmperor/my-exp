import { NavLink, useLocation } from 'react-router-dom';
import styles from './AdminNavigation.module.scss';

// 后续新增管理模块时，只需在此处补充导航项。
const items = [
    { path: '/admin', title: '文章管理', description: '整理目录，编辑文章', symbol: '✎' },
    { path: '/admin/demos', title: 'demo 管理', description: '管理资源与版本', symbol: '◇' },
];

export default function AdminNavigation() {
    const { pathname } = useLocation();

    // 文章详情也属于文章管理，保持所属模块的选中状态。
    const isActive = (path: string) =>
        path === '/admin'
            ? pathname === path || pathname.startsWith('/admin/articles/')
            : pathname === path || pathname.startsWith(`${path}/`);

    return (
        <nav className={styles.navigation} aria-label="后台管理导航">
            <p className={styles.label}>管理后台</p>
            {items.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={`${styles.item} ${isActive(item.path) ? styles.active : ''}`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                >
                    <span className={styles.symbol} aria-hidden="true">
                        {item.symbol}
                    </span>
                    <span>
                        <strong>{item.title}</strong>
                        <small>{item.description}</small>
                    </span>
                </NavLink>
            ))}
        </nav>
    );
}
