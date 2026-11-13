import styles from './Loading.module.scss';

interface Props {
    /** 提示文字，不传时用通用文案 */
    label?: string;

    /** 外层样式，用来控制最小高度、留白等布局 */
    className?: string;
}

// 通用加载态。只负责展示转圈和一句提示，什么时候显示、什么时候隐藏由调用方决定。
export default function Loading({ label = '加载中…', className }: Props) {
    return (
        <div
            className={className ? `${styles.loading} ${className}` : styles.loading}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.label}>{label}</p>
        </div>
    );
}
