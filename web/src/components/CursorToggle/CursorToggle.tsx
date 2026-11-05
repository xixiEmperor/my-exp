import SiteIcon from '../SiteIcon/SiteIcon';
import type { CursorPreference } from '../../config/cursor';
import styles from './CursorToggle.module.scss';

interface Props {
    cursor: CursorPreference;
    onToggle: () => void;
}

// 只负责按钮结构和样式，光标状态与切换动作由 useCursor 提供。
export default function CursorToggle({ cursor, onToggle }: Props) {
    const isNew = cursor === 'new';
    const label = isNew ? '切换到 classic 光标' : '切换到 new 光标';

    return (
        <button
            className={styles.toggle}
            type="button"
            aria-label={label}
            aria-pressed={isNew}
            title={label}
            onClick={onToggle}
        >
            <SiteIcon name="cursor" />
        </button>
    );
}
