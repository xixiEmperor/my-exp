import SiteIcon from '../SiteIcon/SiteIcon';
import { projectPhases } from '../../constants/home';
import { describeEdges, useScrollEdges } from '../../hooks/useScrollEdges';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import styles from './HomeProjects.module.scss';

interface Props {
    activeStep: number;
    trackRef: RefObject<HTMLDivElement | null>;
    onToggle: (index: number) => void;
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
}

// 横向项目时间轴。轨道用 flex 加横向滚动，卡片按百分比定宽定高。
export default function HomeProjects({ activeStep, trackRef, onToggle, onKeyDown }: Props) {
    const edges = useScrollEdges(trackRef);
    const cardNodes: ReactNode[] = [];

    projectPhases.forEach((item, index) => {
        const tagNodes: ReactNode[] = [];
        const isExpanded = activeStep === index;

        cardNodes.push(
            <button
                key={item.id}
                className={[styles.card, isExpanded ? styles.expanded : ''].join(' ')}
                type="button"
                data-step={index}
                aria-expanded={isExpanded}
                onClick={() => onToggle(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
            >
                <span className={styles.dot}></span>
                <span className={styles.step}>{item.step}</span>
                <span className={styles.status}>{item.status}</span>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.summary}>{item.summary}</span>
                {/* 收起时高度为零，鼠标划过、键盘聚焦或点击固定后展开。 */}
                <span className={styles.more}>
                    <span className={styles.detail}>{item.detail}</span>
                    <span className={styles.tags}>{tagNodes}</span>
                </span>
            </button>,
        );
    });

    return (
        <div className={styles.shell} data-edge={describeEdges(edges)}>
            <div
                className={styles.track}
                ref={trackRef}
                role="region"
                aria-label="项目开发历程时间轴"
                tabIndex={0}
            >
                {cardNodes}
            </div>
            <p className={styles.hint}>
                <SiteIcon name="info" />
                卡片可以点击固定展开，再次点击收起；横向可以拖动或滚动浏览。
            </p>
        </div>
    );
}
