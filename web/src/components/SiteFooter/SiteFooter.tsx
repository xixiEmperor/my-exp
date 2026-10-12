import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './SiteFooter.module.scss';

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function SiteFooter() {
  return (
    <footer className={[styles['site-footer'], styles['home-container']].join(' ')}>
      <Link className={[styles.brand, styles['footer-brand']].join(' ')} to="/">
        <span className={styles['brand-icon']} data-icon="brand">
          <SiteIcon name="brand" />
        </span>
        <span>知页.</span>
      </Link>
      <span>一个人的记录 · 一直在生长</span>
      <a href="#main" className={styles['back-top']}>
        回到顶部
        <span data-icon="arrow-up">
          <SiteIcon name="arrow-up" />
        </span>
      </a>
      <span>© 2026 知页</span>
    </footer>
  );
}
