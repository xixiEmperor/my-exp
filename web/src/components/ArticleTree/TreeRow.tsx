import type { ReactNode } from 'react';
import SiteIcon from '../SiteIcon/SiteIcon';
import styles from './ArticleTree.module.scss';

/** 每往下一层增加的缩进距离 */
const INDENT_STEP = 16;
/** 最左侧的基础留白 */
const INDENT_BASE = 8;

interface TreeRowProps {
    /** 节点所在层级，从 0 开始 */
    level: number;
    /** 点击这一行时触发 */
    onClick?: () => void;
    /** 是否显示展开箭头，文件传 false，此时用透明占位保持文字对齐 */
    hasArrow?: boolean;
    /** 箭头是否处于展开状态，只在 hasArrow 为 true 时有意义 */
    open?: boolean;
    /** 行内的文字内容 */
    children: ReactNode;
}

// 文件夹行和文件行共用的外壳，缩进计算和箭头占位只在这里维护一份
export default function TreeRow({
    level,
    onClick,
    hasArrow = false,
    open = false,
    children,
}: TreeRowProps) {
    return (
        <div
            className={styles['tree-row']}
            style={{ paddingLeft: level * INDENT_STEP + INDENT_BASE }}
            onClick={onClick}
        >
            <span
                className={`${styles['tree-arrow']} ${hasArrow ? '' : styles.placeholder} ${open ? styles.open : ''}`}
            >
                ▶
            </span>
            <div className={styles['tree-content']}>
                <SiteIcon name={hasArrow ? 'folder' : 'file'}></SiteIcon>
                <span className={styles['tree-label']}>{children}</span>
            </div>
        </div>
    );
}
