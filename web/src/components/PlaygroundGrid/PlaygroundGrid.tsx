import type { ReactNode } from 'react';
import EmptyState from '@/components/EmptyState/EmptyState';
import PlaygroundCard from '@/components/PlaygroundCard/PlaygroundCard';
import type { DemoResource } from '@/types/demos';
import styles from './PlaygroundGrid.module.scss';

interface PlaygroundGridProps {
    /** 是否正在请求场景列表 */
    loading: boolean;
    /** 请求错误提示信息 */
    errorMessage: string;
    /** 已发布场景总数量 */
    totalPublishedCount: number;
    /** 筛选后的已发布场景列表 */
    demos: readonly DemoResource[];
    /** 当前处于高亮定位状态的 demo ID */
    highlightedId: string | null;
    /** 点击某张卡片进入详情回调 */
    onSelectDemo: (demo: DemoResource) => void;
    /** 重置当前筛选条件回调 */
    onResetFilters: () => void;
    /** 请求失败时重新加载回调 */
    onRetry: () => void;
}

const skeletonIds: readonly string[] = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6'];

// 场景演练场卡片网格：统一承载加载骨架屏、错误恢复、空状态与卡片列表渲染。
export default function PlaygroundGrid({
    loading,
    errorMessage,
    totalPublishedCount,
    demos,
    highlightedId,
    onSelectDemo,
    onResetFilters,
    onRetry,
}: PlaygroundGridProps) {
    if (errorMessage) {
        return (
            <div className={styles.stateBox} role="status">
                <EmptyState
                    icon="alert"
                    title="场景列表加载遇到了问题"
                    description={<p>{errorMessage}</p>}
                    action={
                        <button type="button" className={styles.actionBtn} onClick={onRetry}>
                            重新加载
                        </button>
                    }
                />
            </div>
        );
    }

    if (loading && totalPublishedCount === 0) {
        const skeletonNodes: ReactNode[] = [];

        for (const id of skeletonIds) {
            skeletonNodes.push(
                <div key={id} className={styles.skeletonCard} aria-hidden="true">
                    <div className={styles.skeletonPreview} />
                    <div className={styles.skeletonBody}>
                        <span className={styles.skeletonTitle} />
                        <span className={styles.skeletonLine} />
                        <span className={styles.skeletonLineShort} />
                    </div>
                </div>,
            );
        }

        return (
            <div className={styles.grid} aria-busy="true" aria-label="正在加载演练场景">
                {skeletonNodes}
            </div>
        );
    }

    if (demos.length > 0) {
        const cardNodes: ReactNode[] = [];

        demos.forEach((demo, index) => {
            cardNodes.push(
                <PlaygroundCard
                    key={demo.id}
                    demo={demo}
                    index={index}
                    isHighlighted={highlightedId === demo.id}
                    onSelect={onSelectDemo}
                />,
            );
        });

        return <div className={styles.grid}>{cardNodes}</div>;
    }

    if (totalPublishedCount > 0) {
        return (
            <div className={styles.stateBox} role="status">
                <EmptyState
                    icon="search"
                    title="没有找到匹配的演练场景"
                    description={<p>可以尝试换一个搜索词，或者切回全部标签查看所有已发布场景。</p>}
                    action={
                        <button type="button" className={styles.actionBtn} onClick={onResetFilters}>
                            重置筛选条件
                        </button>
                    }
                />
            </div>
        );
    }

    return (
        <div className={styles.stateBox} role="status">
            <EmptyState
                icon="sparkles"
                title="新的演练场景正在准备中"
                description={
                    <p>当演练场景在后台完成构建并设为「已发布」状态后，会第一时间呈现在这里。</p>
                }
            />
        </div>
    );
}
