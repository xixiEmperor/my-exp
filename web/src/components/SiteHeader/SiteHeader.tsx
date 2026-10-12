import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import type { MouseEvent, ReactNode, RefObject } from 'react';
import { mainNavigation, sectionNavigation } from '../../constants/navigation';
import styles from './SiteHeader.module.scss';

interface Props {
  menuOpen: boolean;
  menuRef: RefObject<HTMLDetailsElement | null>;
  activePath: string;
  onToggleMenu: (event: MouseEvent<HTMLElement>) => void;
  onOpenLogin: () => void;
}

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function SiteHeader({
  menuOpen,
  menuRef,
  activePath,
  onToggleMenu,
  onOpenLogin,
}: Props) {
  const mainLinks: ReactNode[] = [];
  const sectionLinks: ReactNode[] = [];

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

  sectionNavigation.forEach((item) => {
    sectionLinks.push(
      <Link key={item.id} to={item.to}>
        {item.label}
      </Link>,
    );
  });

  return (
    <header className={styles['site-header']}>
      <div className={styles['header-inner']}>
        <Link to="/" className={styles.brand} aria-label="知页首页">
          <span className={styles['brand-icon']} data-icon="brand">
            <SiteIcon name="brand" />
          </span>
          <span>
            知页<span className={styles['brand-dot']}>.</span>
          </span>
        </Link>
        <nav className={styles['site-nav']} aria-label="主导航">
          {mainLinks}
        </nav>
        <div className={styles['home-header-actions']}>
          <details className={styles['home-menu']} open={menuOpen} ref={menuRef}>
            <summary aria-label="展开首页菜单" onClick={onToggleMenu}>
              <span data-icon="menu">
                <SiteIcon name="menu" />
              </span>
              <span>探索</span>
            </summary>
            <nav aria-label="首页分区">{sectionLinks}</nav>
          </details>
          <button className={styles['header-login']} data-open-login="" onClick={onOpenLogin}>
            <span data-login-label="">登录</span>
            <span data-icon="arrow">
              <SiteIcon name="arrow" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
