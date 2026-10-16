import type { ReactNode } from 'react';
import type { RevealDelay } from './HomeSideRail';
import styles from './HomeSideRail.module.scss';

interface Props {
    delay?: RevealDelay;
    children: ReactNode;
}

// 侧栏小组件的统一外壳。
// 进出场动画挂在外层包裹元素上，卡片自己的悬停过渡就不会被全局动画样式覆盖。
export default function RailWidget({ delay, children }: Props) {
    return (
        <div className={styles.slot} data-reveal="" data-reveal-delay={delay}>
            <section className={styles.widget}>{children}</section>
        </div>
    );
}
