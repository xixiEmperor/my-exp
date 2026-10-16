import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './SiteFooter.module.scss';

// 只负责页面结构与样式，交互通过参数交给 hooks。
export default function SiteFooter() {
    return (
        <footer className={styles['site-footer']}>
            <div className={styles['footer-inner']}>
                <div className={styles['footer-meta']}>
                    <a href="#main" className={styles['back-top']}>
                        回到顶部
                        <span data-icon="arrow-up">
                            <SiteIcon name="arrow-up" />
                        </span>
                    </a>
                    <span className={styles.copy}>© 2026 xixiEmperor</span>
                </div>
            </div>
        </footer>
    );
}
