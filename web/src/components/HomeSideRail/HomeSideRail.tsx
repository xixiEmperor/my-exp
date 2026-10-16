import type { ReactNode } from 'react';
import styles from './HomeSideRail.module.scss';

export type RailSide = 'left' | 'right';

// 同一组卡片错开入场的档位，取值对应 motion.scss 里的 data-reveal-delay。
export type RevealDelay = 1 | 2 | 3;

interface Props {
    side: RailSide;
    ariaLabel: string;
    children: ReactNode;
}

// 侧栏只负责留白、标签和堆叠方式，具体小组件由调用方传入。
export default function HomeSideRail({ side, ariaLabel, children }: Props) {
    return (
        <aside className={[styles.rail, styles[side]].join(' ')} aria-label={ariaLabel}>
            <div className={styles.stack}>{children}</div>
        </aside>
    );
}
