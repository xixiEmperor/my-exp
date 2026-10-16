import { Link } from 'react-router-dom';
import RailWidget from './RailWidget';
import SiteIcon from '../SiteIcon/SiteIcon';
import type { ReactNode } from 'react';
import type { NavigationItem } from '../../constants/navigation';
import type { RevealDelay } from './HomeSideRail';
import styles from './HomeSideRail.module.scss';

interface Props {
    items: readonly NavigationItem[];
    delay?: RevealDelay;
}

// 快捷跳转直接复用导航配置，新增分区时不用再改一份。
export default function QuickLinksWidget({ items, delay }: Props) {
    const linkNodes: ReactNode[] = [];

    items.forEach((item) => {
        linkNodes.push(
            <Link key={item.id} to={item.to}>
                <i></i>
                {item.label}
            </Link>,
        );
    });

    return (
        <RailWidget delay={delay}>
            <div className={styles['widget-title']}>
                <span>快速跳转</span>
                <SiteIcon name="arrow" />
            </div>
            <nav className={styles['quick-links']} aria-label="页面快捷跳转">
                {linkNodes}
            </nav>
        </RailWidget>
    );
}
