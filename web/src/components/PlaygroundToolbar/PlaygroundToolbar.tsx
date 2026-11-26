import type { ReactNode } from 'react';
import SiteIcon from '@/components/SiteIcon/SiteIcon';
import { ALL_PLAYGROUND_TAG } from '@/hooks/usePlaygroundDemos';
import styles from './PlaygroundToolbar.module.scss';

interface PlaygroundToolbarProps {
    /** 已发布场景总数 */
    totalCount: number;
    /** 去重后的可筛选标签列表 */
    tags: readonly string[];
    /** 当前激活的标签值 */
    activeTag: string;
    /** 当前搜索关键词 */
    keyword: string;
    /** 切换标签回调 */
    onSelectTag: (tag: string) => void;
    /** 修改搜索词回调 */
    onKeywordChange: (value: string) => void;
}

// 场景演练场检索工具栏：负责展示场景计数、关键词搜索框与标签筛选胶囊。
export default function PlaygroundToolbar({
    totalCount,
    tags,
    activeTag,
    keyword,
    onSelectTag,
    onKeywordChange,
}: PlaygroundToolbarProps) {
    const tagNodes: ReactNode[] = [];

    for (const tag of tags) {
        const isSelected = activeTag === tag;

        tagNodes.push(
            <button
                key={tag}
                type="button"
                aria-pressed={isSelected}
                className={`${styles.pill}${isSelected ? ` ${styles.isActive}` : ''}`}
                onClick={() => {
                    onSelectTag(isSelected ? ALL_PLAYGROUND_TAG : tag);
                }}
            >
                {tag}
            </button>,
        );
    }

    const isAllSelected = activeTag === ALL_PLAYGROUND_TAG;

    return (
        <header className={styles.toolbar}>
            <div className={styles.titleGroup}>
                <h2 id="playground-catalog-heading">已发布场景</h2>
                {totalCount > 0 ? <span className={styles.count}>共 {totalCount} 个</span> : null}
            </div>

            {totalCount > 0 ? (
                <div className={styles.controls}>
                    <div className={styles.searchBox}>
                        <span className={styles.searchIcon} aria-hidden="true">
                            <SiteIcon name="search" size={16} />
                        </span>
                        <input
                            type="search"
                            value={keyword}
                            placeholder="搜索场景名称、描述或标签…"
                            aria-label="搜索已发布场景"
                            onChange={(event) => {
                                onKeywordChange(event.target.value);
                            }}
                        />
                        {keyword ? (
                            <button
                                type="button"
                                className={styles.clearBtn}
                                aria-label="清空搜索关键词"
                                onClick={() => {
                                    onKeywordChange('');
                                }}
                            >
                                清空
                            </button>
                        ) : null}
                    </div>

                    {tags.length > 0 ? (
                        <div
                            className={styles.filterGroup}
                            role="group"
                            aria-label="按标签筛选场景"
                        >
                            <button
                                type="button"
                                aria-pressed={isAllSelected}
                                className={`${styles.pill}${isAllSelected ? ` ${styles.isActive}` : ''}`}
                                onClick={() => {
                                    onSelectTag(ALL_PLAYGROUND_TAG);
                                }}
                            >
                                全部
                            </button>
                            {tagNodes}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </header>
    );
}
