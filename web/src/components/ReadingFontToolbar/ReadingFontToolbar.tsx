import styles from './ReadingFontToolbar.module.scss';

// 阅读页和工具栏共用默认值，避免恢复默认时与初始字号不一致。
export const DEFAULT_READING_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 22;

interface Props {
    fontSize: number;
    onFontSizeChange: (size: number) => void;
}

// 工具栏负责字号操作，阅读页负责把字号应用到文章。
export default function ReadingFontToolbar({ fontSize, onFontSizeChange }: Props) {
    return (
        <section className={styles.toolbar} aria-label="阅读字号设置">
            <div className={styles.heading}>
                <span>字体大小</span>
                <button
                    type="button"
                    className={styles.reset}
                    onClick={() => onFontSizeChange(DEFAULT_READING_FONT_SIZE)}
                    disabled={fontSize === DEFAULT_READING_FONT_SIZE}
                >
                    默认
                </button>
            </div>
            {/* 到达上下限时禁用按钮，数值变化会向辅助阅读工具播报。 */}
            <div className={styles.controls}>
                <button
                    type="button"
                    aria-label="缩小字体"
                    onClick={() => onFontSizeChange(Math.max(MIN_FONT_SIZE, fontSize - 1))}
                    disabled={fontSize <= MIN_FONT_SIZE}
                >
                    A−
                </button>
                <output aria-live="polite" aria-label="当前阅读字号">
                    {fontSize} px
                </output>
                <button
                    type="button"
                    aria-label="放大字体"
                    onClick={() => onFontSizeChange(Math.min(MAX_FONT_SIZE, fontSize + 1))}
                    disabled={fontSize >= MAX_FONT_SIZE}
                >
                    A+
                </button>
            </div>
        </section>
    );
}
