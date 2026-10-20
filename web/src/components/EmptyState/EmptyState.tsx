import type { ReactNode } from 'react';
import SiteIcon, { type IconName } from '../SiteIcon/SiteIcon';
import styles from './EmptyState.module.scss';

export interface EmptyStateProps {
    // 主标题，不传时给一句通用的占位文案
    title?: string;
    // 补充说明，可以是任意节点，调用方可以塞多段文字或链接
    description?: ReactNode;
    // 图标语义名，取值来自 SiteIcon 的注册表
    icon?: IconName;
    // 底部操作区，通常放按钮或链接；不传就不渲染这一块
    action?: ReactNode;
    // 紧凑模式，放在侧栏、卡片或列表内部时用，上下留白收紧
    compact?: boolean;
    // 允许外层微调尺寸，比如让它占满剩余高度
    className?: string;
}

// 通用空状态组件。列表为空、搜索无结果、面板没有内容时都复用它，
// 组件本身不关心业务，文案、图标和操作全部交给调用方决定。
export default function EmptyState({
    title = '这里还没有内容',
    description,
    icon = 'info',
    action,
    compact = false,
    className,
}: EmptyStateProps) {
    // 把可选类名拼在一起，紧凑模式和外层定制字段没传时就自动跳过
    const rootClassName = [styles.empty, compact && styles.compact, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={rootClassName}>
            {/* 图标外面的圆角底由样式控制，颜色跟随主题 */}
            <span className={styles.icon} data-icon>
                <SiteIcon name={icon} />
            </span>
            <p className={styles.title}>{title}</p>
            {description ? <div className={styles.description}>{description}</div> : null}
            {action ? <div className={styles.action}>{action}</div> : null}
        </div>
    );
}
