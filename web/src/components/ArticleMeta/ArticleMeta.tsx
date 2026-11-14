import SiteIcon, { type IconName } from '../SiteIcon/SiteIcon';
import styles from './ArticleMeta.module.scss';

interface Props {
    /** 文章创建时间，接口返回的是 ISO 字符串，组件内部兼容 Date */
    createdAt: Date | string;
    /** 文章最后修改时间 */
    lastModifiedAt: Date | string;
    /** 文章浏览量 */
    views: number;
    // 正文底部可以补充排版类名，编辑页的窄侧栏继续使用默认样式。
    className?: string;
}

// 固定使用中文日期格式，避免不同浏览器拿到不同顺序的日期
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    // 创建和修改时间精确到秒，统一按 24 小时制展示。
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
});

const countFormatter = new Intl.NumberFormat('zh-CN');

/** 把接口时间统一转成可展示的日期，缺失或非法值返回占位符 */
function formatDate(value: Date | string | null | undefined): string {
    if (!value) {
        return '—';
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return dateFormatter.format(date);
}

// 文章详情页右侧的元信息，展示创建时间、最后修改时间和浏览量。
export default function ArticleMeta({ createdAt, lastModifiedAt, views, className }: Props) {
    // 结构相同的三行数据交给数组驱动，后续增加字段只需要补一条记录
    const items: Array<{ label: string; icon: IconName; value: string }> = [
        { label: '创建时间', icon: 'clock', value: formatDate(createdAt) },
        { label: '最后修改', icon: 'renameFile', value: formatDate(lastModifiedAt) },
        {
            label: '浏览量',
            icon: 'gauge',
            value: countFormatter.format(Number.isFinite(views) ? views : 0),
        },
    ];

    return (
        <section
            className={[styles.meta, className].filter(Boolean).join(' ')}
            aria-label="文章信息"
        >
            <p className={styles.title}>文章信息</p>
            <dl className={styles.list}>
                {items.map((item) => (
                    <div className={styles.item} key={item.label}>
                        <dt className={styles.label}>
                            <SiteIcon name={item.icon} size={13} />
                            <span>{item.label}</span>
                        </dt>
                        <dd className={styles.value}>{item.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
