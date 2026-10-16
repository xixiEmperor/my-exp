import RailWidget from './RailWidget';
import SiteIcon from '../SiteIcon/SiteIcon';
import { useLocalTime } from '../../hooks/useLocalTime';
import type { RevealDelay } from './HomeSideRail';
import styles from './HomeSideRail.module.scss';

interface Props {
    delay?: RevealDelay;
}

// 本地时间卡片。时间读取和定时器都交给 useLocalTime。
export default function LocalTimeWidget({ delay }: Props) {
    const { time, date, zone } = useLocalTime();

    return (
        <RailWidget delay={delay}>
            <div className={styles['widget-title']}>
                <span>当地时间</span>
                <SiteIcon name="clock" />
            </div>
            <div className={styles['clock-time']}>{time}</div>
            <div className={styles['clock-date']}>{date}</div>
            <span className={styles['clock-zone']}>{zone}</span>
        </RailWidget>
    );
}
