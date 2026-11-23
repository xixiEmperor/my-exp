import SiteIcon, { type IconName } from '../SiteIcon/SiteIcon';
import { formatDate } from '@/utils/date';
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
    // 后台传入状态，前台不展示此项。
    status?: 'published' | 'draft';
}

const countFormatter = new Intl.NumberFormat('zh-CN');

// 文章详情页右侧的元信息，展示创建时间、最后修改时间和浏览量。
export default function ArticleMeta({
    createdAt,
    lastModifiedAt,
    views,
    className,
    status,
}: Props) {
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

    // 使用原始时间判断正文是否已经保存到数据库。
    if (status) {
        const createdTime = new Date(createdAt).getTime();
        const modifiedTime = new Date(lastModifiedAt).getTime();

        // 未保存的文章优先显示未发布，其余按接口状态展示。
        let stateLabel = status === 'published' ? '正文' : '草稿';

        if (Number.isFinite(createdTime) && createdTime === modifiedTime) {
            stateLabel = '未发布';
        }

        items.unshift({
            label: '文章状态',
            icon: 'renameFile',
            value: stateLabel,
        });
    }

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
