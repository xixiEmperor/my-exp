import SiteIcon from '../SiteIcon/SiteIcon';
import type { ResolvedTheme } from '../../config/theme';
import styles from './ThemeToggle.module.scss';

interface Props {
    resolvedTheme: ResolvedTheme;
    onToggle: () => void;
}

// 只负责按钮结构和样式，主题状态与切换动作由 useTheme 提供。
export default function ThemeToggle({ resolvedTheme, onToggle }: Props) {
    const isDark = resolvedTheme === 'dark';
    const label = isDark ? '切换到浅色主题' : '切换到深色主题';

    return (
        <button
            className={styles.toggle}
            type="button"
            aria-label={label}
            aria-pressed={isDark}
            title={label}
            onClick={onToggle}
        >
            <SiteIcon name={isDark ? 'moon' : 'sun'} />
        </button>
    );
}
