import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDemos } from '@/hooks/useDemos';
import { useDemosStore } from '@/stores/demos';
import type { DemoResource } from '@/types/demos';

// 「全部」标签的哨兵值，不会与后台录入的真实标签冲突。
export const ALL_PLAYGROUND_TAG = '__all__';

// 卡片高亮持续时间，和卡片脉冲动画时长保持一致。
const HIGHLIGHT_DURATION = 2600;

// 场景演练场的业务编排：拉取列表、筛选已发布场景、检索与定位卡片。
// 页面只拿这里返回的状态与方法做装配，不再自己拼业务流程。
export function usePlaygroundDemos() {
    const resources = useDemosStore((state) => state.resources);
    const { resourcesRequest } = useDemos();
    const { loading, error, run: loadResources } = resourcesRequest;
    const [activeTag, setActiveTag] = useState<string>(ALL_PLAYGROUND_TAG);
    const [keyword, setKeyword] = useState('');
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const highlightTimerRef = useRef(0);

    useEffect(() => {
        void loadResources();
    }, [loadResources]);

    useEffect(() => {
        return () => {
            window.clearTimeout(highlightTimerRef.current);
        };
    }, []);

    // 前台只展示已发布的 demo，草稿只在后台可见。
    const publishedDemos = useMemo(() => {
        return resources.filter((item) => item.status === 'published');
    }, [resources]);

    // 标签来自已发布 demo 的去重结果，新增 demo 后筛选项自动出现。
    const tags = useMemo(() => {
        const tagSet = new Set<string>();

        for (const demo of publishedDemos) {
            for (const tag of demo.tags ?? []) {
                const trimmed = tag.trim();

                if (trimmed) {
                    tagSet.add(trimmed);
                }
            }
        }

        return Array.from(tagSet);
    }, [publishedDemos]);

    const filteredDemos = useMemo(() => {
        const normalized = keyword.trim().toLowerCase();

        return publishedDemos.filter((demo) => {
            const demoTags = demo.tags ?? [];

            if (activeTag !== ALL_PLAYGROUND_TAG && !demoTags.includes(activeTag)) {
                return false;
            }

            if (!normalized) {
                return true;
            }

            return (
                demo.name.toLowerCase().includes(normalized) ||
                (demo.description ?? '').toLowerCase().includes(normalized) ||
                demoTags.some((tag) => tag.toLowerCase().includes(normalized))
            );
        });
    }, [publishedDemos, activeTag, keyword]);

    const resetFilters = useCallback(() => {
        setActiveTag(ALL_PLAYGROUND_TAG);
        setKeyword('');
    }, []);

    // 定位到指定卡片：先清空筛选保证卡片一定在列表中，再等下一帧渲染完成后滚动。
    // 卡片 DOM 通过稳定的 id 查找，避免为每张卡片维护一份 ref 映射。
    const focusDemo = useCallback(
        (id: string) => {
            resetFilters();
            setHighlightedId(id);
            window.clearTimeout(highlightTimerRef.current);

            highlightTimerRef.current = window.setTimeout(() => {
                setHighlightedId(null);
            }, HIGHLIGHT_DURATION);

            requestAnimationFrame(() => {
                document
                    .getElementById(`demo-card-${id}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        },
        [resetFilters],
    );

    const pickRandomDemo = useCallback(() => {
        if (publishedDemos.length === 0) {
            return;
        }

        const picked = publishedDemos[Math.floor(Math.random() * publishedDemos.length)];

        focusDemo(picked.id);
    }, [publishedDemos, focusDemo]);

    const openDemo = useCallback((demo: DemoResource) => {
        // TODO: 进入场景详情页，携带 demo.id、demo.slug、demo.verison 加载源码工作台与效果预览。
        void demo;
    }, []);

    const retry = useCallback(() => {
        void loadResources();
    }, [loadResources]);

    return {
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
    };
}
