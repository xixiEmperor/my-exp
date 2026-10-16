import { Link } from 'react-router-dom';
import SiteIcon from '../SiteIcon/SiteIcon';
import type { ReactNode } from 'react';
import type { HeroContent } from '../../types/home';
import styles from './HomeHero.module.scss';

interface Props {
    content: HeroContent;
}

// 深色横幅。首页内的锚点用普通链接，站内页面用路由链接。
export default function HomeHero({ content }: Props) {
    const actionNodes: ReactNode[] = [];
    const tagNodes: ReactNode[] = [];

    [content.primaryAction, content.secondaryAction].forEach((action, index) => {
        const isAnchor = action.href.startsWith('#');
        const className = [styles.button, index === 0 ? styles.main : styles.ghost].join(' ');
        const label = (
            <>
                {action.label}
                <SiteIcon name={isAnchor ? 'down' : 'arrow-up'} />
            </>
        );

        actionNodes.push(
            isAnchor ? (
                <a key={action.href} className={className} href={action.href}>
                    {label}
                </a>
            ) : (
                <Link key={action.href} className={className} to={action.href}>
                    {label}
                </Link>
            ),
        );
    });

    return (
        <section className={styles.banner} id="home" aria-labelledby="hero-title">
            <div className={styles.copy}>
                <h1 className={styles.title} id="hero-title">
                    {content.title.lead}
                    <br />
                    <span className={styles.highlight}>{content.title.highlight}</span>{' '}
                    {content.title.tail}
                </h1>
                <p className={styles.intro}>{content.intro}</p>
                <div className={styles.actions}>{actionNodes}</div>
                <div className={styles.tags}>{tagNodes}</div>
            </div>
            {/* 右侧是纯装饰图形，不传达信息，整块对辅助技术隐藏。 */}
            <div className={styles.art} aria-hidden="true">
                <div className={styles.orbit}></div>
                <div className={[styles.orbit, styles['orbit-b']].join(' ')}></div>
                <div className={styles.glyph}>
                    <svg viewBox="0 0 80 80">
                        <path d="m27 24-15 16 15 16M53 24l15 16-15 16M46 15 34 65"></path>
                        <circle cx="40" cy="40" r="34" strokeDasharray="2 7"></circle>
                    </svg>
                </div>
                <span className={[styles['art-label'], styles.one].join(' ')}>curiosity.exe</span>
                <span className={[styles['art-label'], styles.two].join(' ')}>
                    build · learn · repeat
                </span>
            </div>
        </section>
    );
}
