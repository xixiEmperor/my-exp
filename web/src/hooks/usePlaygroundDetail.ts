import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getDemoResourceByID, getDemoResources } from '@/api/demos';
import { useDemosStore } from '@/stores/demos';
import type { DemoResource } from '@/types/demos';
import { compareDemoVerison } from '@/utils/demos';

export type StudioLayoutMode = 'split' | 'source-only' | 'preview-only';

interface DetailLocationState {
    demo?: DemoResource;
}

export const DEFAULT_SPLIT_PERCENT = 56;
const MIN_SPLIT_PERCENT = 28;
const MAX_SPLIT_PERCENT = 72;

// 演练场详情页状态编排：负责按 id 与版本定位资源、发现同场景其他已发布版本，以及双栏收起和比例控制。
export function usePlaygroundDetail() {
    const { id = '' } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const requestedVerison = searchParams.get('verison')?.trim() ?? '';
    const navigate = useNavigate();
    const location = useLocation();
    const routeDemo = (location.state as DetailLocationState | null)?.demo;

    const storeResources = useDemosStore((state) => state.resources);
    const setResources = useDemosStore((state) => state.setResources);

    const cachedDemo = useMemo(() => {
        if (routeDemo && routeDemo.id === id && routeDemo.status === 'published') {
            return routeDemo;
        }

        const matched = storeResources.find((item) => item.id === id);

        if (matched && matched.status === 'published') {
            return matched;
        }

        return null;
    }, [id, routeDemo, storeResources]);

    const [activeDemo, setActiveDemo] = useState<DemoResource | null>(cachedDemo);
    const [loading, setLoading] = useState<boolean>(cachedDemo === null);
    const [notFound, setNotFound] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [reloadToken, setReloadToken] = useState<number>(0);

    // 外层双栏视图与分栏比例状态
    const [layoutMode, setLayoutMode] = useState<StudioLayoutMode>('split');
    const [splitPercent, setSplitPercent] = useState<number>(DEFAULT_SPLIT_PERCENT);
    const [theaterMode, setTheaterMode] = useState<boolean>(false);

    // 路由参数 id 变化时，若有列表态缓存则零闪烁切换，同时向后端校验资源最新可用性。
    useEffect(() => {
        if (!id) {
            setActiveDemo(null);
            setNotFound(true);
            setLoading(false);

            return;
        }

        const controller = new AbortController();

        if (cachedDemo) {
            setActiveDemo(cachedDemo);
            setNotFound(false);
            setErrorMessage('');
            setLoading(false);
        } else {
            setLoading(true);
            setNotFound(false);
            setErrorMessage('');
        }

        async function loadDetailAndSiblings(): Promise<void> {
            try {
                const detail = await getDemoResourceByID(id, controller.signal);

                if (controller.signal.aborted) {
                    return;
                }

                // 未发布草稿不在前台演练详情展示，按不可用资源处理。
                if (detail.status !== 'published') {
                    setActiveDemo(null);
                    setNotFound(true);
                    setLoading(false);

                    return;
                }

                // 若 URL 显式附带了另一个 verison 参数，尝试精确匹配同一 slug 下的指定版本。
                if (requestedVerison && requestedVerison !== detail.verison) {
                    try {
                        const matchedList = await getDemoResources(
                            { slug: detail.slug, verison: requestedVerison },
                            controller.signal,
                        );

                        const exact = Array.isArray(matchedList)
                            ? matchedList[0]
                            : (matchedList as unknown as DemoResource | undefined);

                        if (exact && exact.status === 'published' && exact.id !== detail.id) {
                            navigate(`/playground/${exact.id}`, {
                                replace: true,
                                state: { demo: exact },
                            });

                            return;
                        }
                    } catch {
                        // 指定 verison 未命中时保留当前 id 对应的确定版本，不静默跳转到未知记录。
                    }
                }

                setActiveDemo(detail);
                setNotFound(false);
                setErrorMessage('');
                setLoading(false);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                const msg = error instanceof Error ? error.message : '加载场景详情失败';
                const isDeletedOrMissing =
                    msg.includes('不存在') || msg.includes('404') || msg.includes('非法');

                if (isDeletedOrMissing) {
                    setActiveDemo(null);
                    setNotFound(true);
                } else if (!cachedDemo) {
                    setErrorMessage(msg);
                }

                setLoading(false);
            }

            // 后台静默补齐全部资源列表，供版本切换器展示同 slug 的历史与进阶版本。
            if (useDemosStore.getState().resources.length === 0) {
                try {
                    const allList = await getDemoResources(undefined, controller.signal);

                    if (!controller.signal.aborted) {
                        setResources(allList);
                    }
                } catch {
                    // 版本列表属于增强能力，拉取失败不阻断当前版本的源码与预览阅读。
                }
            }
        }

        void loadDetailAndSiblings();

        return () => {
            controller.abort();
        };
    }, [id, requestedVerison, reloadToken, cachedDemo, navigate, setResources]);

    // 同一场景（相同 slug）下所有已发布版本，按 x.x.x 三段数字从高到低排列。
    const siblingVersions = useMemo(() => {
        if (!activeDemo) {
            return [];
        }

        const matched = storeResources.filter(
            (item) => item.status === 'published' && item.slug === activeDemo.slug,
        );

        const hasCurrent = matched.some((item) => item.id === activeDemo.id);
        const merged = hasCurrent ? matched : [activeDemo, ...matched];

        return [...merged].sort((left, right) => compareDemoVerison(right.verison, left.verison));
    }, [activeDemo, storeResources]);

    const clampSplitPercent = useCallback((nextValue: number) => {
        const clamped = Math.max(MIN_SPLIT_PERCENT, Math.min(MAX_SPLIT_PERCENT, nextValue));
        setSplitPercent(Number(clamped.toFixed(2)));
    }, []);

    const resetSplitPercent = useCallback(() => {
        setSplitPercent(DEFAULT_SPLIT_PERCENT);
    }, []);

    const collapseSource = useCallback(() => {
        setLayoutMode('preview-only');
    }, []);

    const expandSource = useCallback(() => {
        setLayoutMode('split');
    }, []);

    const collapsePreview = useCallback(() => {
        setLayoutMode('source-only');
    }, []);

    const expandPreview = useCallback(() => {
        setLayoutMode('split');
    }, []);

    const selectVersion = useCallback(
        (target: DemoResource) => {
            if (activeDemo && target.id === activeDemo.id) {
                return;
            }

            navigate(`/playground/${target.id}?verison=${encodeURIComponent(target.verison)}`, {
                state: { demo: target },
            });
        },
        [activeDemo, navigate],
    );

    const retry = useCallback(() => {
        setReloadToken((value) => value + 1);
    }, []);

    return {
        demo: activeDemo,
        siblingVersions,
        loading,
        notFound,
        errorMessage,
        layoutMode,
        sourceCollapsed: layoutMode === 'preview-only',
        previewCollapsed: layoutMode === 'source-only',
        splitPercent,
        theaterMode,
        setLayoutMode,
        clampSplitPercent,
        resetSplitPercent,
        collapseSource,
        expandSource,
        collapsePreview,
        expandPreview,
        toggleTheaterMode: () => setTheaterMode((prev) => !prev),
        selectVersion,
        retry,
    };
}
