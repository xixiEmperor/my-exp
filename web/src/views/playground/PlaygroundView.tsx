import PlaygroundBanner from '@/components/PlaygroundBanner/PlaygroundBanner';
import PlaygroundGrid from '@/components/PlaygroundGrid/PlaygroundGrid';
import PlaygroundToolbar from '@/components/PlaygroundToolbar/PlaygroundToolbar';
import { usePlaygroundDemos } from '@/hooks/usePlaygroundDemos';
import styles from './PlaygroundView.module.scss';

// 场景演练场视图：仅承担页面级数据 Hook 接入与组件装配职责。
export default function PlaygroundView() {
    const {
        loading,
        error,
        publishedDemos,
        filteredDemos,
        tags,
        activeTag,
        keyword,
        highlightedId,
        setActiveTag,
        setKeyword,
        resetFilters,
        pickRandomDemo,
        openDemo,
        retry,
    } = usePlaygroundDemos();

    const errorMessage = error instanceof Error ? error.message : '';

    return (
        <main id="main" className={styles.page}>
            <PlaygroundBanner hasDemos={publishedDemos.length > 0} onPickRandom={pickRandomDemo} />

            <section
                id="playground-catalog"
                className={styles.catalog}
                aria-labelledby="playground-catalog-heading"
            >
                <PlaygroundToolbar
                    totalCount={publishedDemos.length}
                    tags={tags}
                    activeTag={activeTag}
                    keyword={keyword}
                    onSelectTag={setActiveTag}
                    onKeywordChange={setKeyword}
                />

                <PlaygroundGrid
                    loading={loading}
                    errorMessage={errorMessage}
                    totalPublishedCount={publishedDemos.length}
                    demos={filteredDemos}
                    highlightedId={highlightedId}
                    onSelectDemo={openDemo}
                    onResetFilters={resetFilters}
                    onRetry={retry}
                />
            </section>
        </main>
    );
}
