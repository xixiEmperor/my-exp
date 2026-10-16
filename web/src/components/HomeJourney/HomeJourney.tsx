import { journeyItems } from '../../constants/home';
import type { ReactNode, RefObject } from 'react';
import styles from './HomeJourney.module.scss';

interface Props {
    timelineRef: RefObject<HTMLDivElement | null>;
    progressRef: RefObject<HTMLElement | null>;
}

// 纵向成长时间轴。滚动进度和进出场动画分别由 hooks 驱动，这里只负责结构。
export default function HomeJourney({ timelineRef, progressRef }: Props) {
    const itemNodes: ReactNode[] = [];

    journeyItems.forEach((item, index) => {
        const tagNodes: ReactNode[] = [];
        const position = String(index + 1).padStart(2, '0');

        itemNodes.push(
            <article
                key={item.id}
                className={[styles.item, item.isCurrent ? styles.current : ''].join(' ')}
                data-reveal=""
                data-reveal-direction={index % 2 === 0 ? 'left' : 'right'}
            >
                <div className={styles.card}>
                    <div className={styles.meta}>
                        <span>{item.year}</span>
                        <span>{item.stage}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.content}</p>
                    <div className={styles.tags}>{tagNodes}</div>
                </div>
                <span className={styles.node} aria-hidden="true">
                    {position}
                </span>
            </article>,
        );
    });

    return (
        <div className={styles.timeline} ref={timelineRef}>
            {/* 装饰线分两层：底层是整条轨道，上面一层由滚动进度驱动。 */}
            <div className={styles.spine} aria-hidden="true">
                <i ref={progressRef}></i>
            </div>
            <div className={styles.list}>{itemNodes}</div>
            <div className={styles.tail}>
                <span></span>未完待续。
            </div>
        </div>
    );
}
