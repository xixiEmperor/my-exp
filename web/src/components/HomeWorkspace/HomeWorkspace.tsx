import type { ReactNode } from 'react';
import styles from './HomeWorkspace.module.scss';

interface Props {
    leftRail: ReactNode;
    rightRail: ReactNode;
    children: ReactNode;
}

// 三栏工作台。宽屏时两侧留白放小组件，窄屏按主内容、左栏、右栏依次堆叠。
export default function HomeWorkspace({ leftRail, rightRail, children }: Props) {
    return (
        <div className={styles.shell}>
            {leftRail}
            <div className={styles.center}>{children}</div>
            {rightRail}
        </div>
    );
}
