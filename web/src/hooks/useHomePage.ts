import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import { useStore } from 'zustand';
import { contactEmail, projectPhases, wishItems } from '../constants/home';
import { collapsedProject, homeStore } from '../stores/home';
import { useClipboard } from './useClipboard';
import { useReducedMotion } from './useReducedMotion';
import { useReveal } from './useReveal';

// 首页业务入口：组件只接收状态、引用和操作，不直接操作 store。
export function useHomePage() {
    const rootRef = useRef<HTMLElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const activeProject = useStore(homeStore, (state) => state.activeProject);
    const wishlistIndex = useStore(homeStore, (state) => state.wishlistIndex);
    const reducedMotion = useReducedMotion();
    const { copied: emailCopied, copy } = useClipboard();
    useReveal(rootRef, reducedMotion);

    const selectProject = useCallback((index: number) => {
        homeStore.getState().setActiveProject(index);
    }, []);

    // 再次点击同一张卡片就收起，和设计稿的开关手感保持一致。
    const toggleProject = useCallback((index: number) => {
        const current = homeStore.getState().activeProject;

        homeStore.getState().setActiveProject(current === index ? collapsedProject : index);
    }, []);

    // 鼠标划过只是视觉展开，由样式负责，不写进状态，避免和点击固定互相打架。
    const handleProjectKey = useCallback(
        (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
            const count = projectPhases.length;
            const nextIndex = {
                ArrowRight: (index + 1) % count,
                ArrowLeft: (index - 1 + count) % count,
                Home: 0,
                End: count - 1,
            }[event.key];

            if (nextIndex === undefined) {
                return;
            }

            event.preventDefault();
            selectProject(nextIndex);

            // 键盘切换同时移动焦点，横向轨道会自动把选中的卡片滚进视野。
            const next = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(
                `[data-step="${nextIndex}"]`,
            );

            next?.focus({ preventScroll: true });

            next?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        },
        [selectProject],
    );

    // 自己画前后的箭头，所以要把 Swiper 实例留一份用来触发翻页。
    const swiperRef = useRef<SwiperInstance | null>(null);

    const syncSlide = useCallback((swiper: SwiperInstance) => {
        swiperRef.current = swiper;

        // 只同步用于文字提示的索引，手势与循环仍由 Swiper 自己处理。
        homeStore.getState().setWishlistIndex(swiper.realIndex);
    }, []);

    const goPrevWish = useCallback(() => {
        swiperRef.current?.slidePrev();
    }, []);

    const goNextWish = useCallback(() => {
        swiperRef.current?.slideNext();
    }, []);

    const copyEmail = useCallback(() => {
        copy(contactEmail);
    }, [copy]);

    useEffect(() => {
        const timeline = timelineRef.current;
        const progress = progressRef.current;

        if (!timeline || !progress) {
            return;
        }

        let frame = 0;

        // 与时间轴装饰线的上下留白一致，进度按实际可见线段计算。
        const topInset = 15;
        const bottomInset = 23;

        // 滚动进度只影响一条装饰线，使用引用更新 transform，避免整页重渲染。
        const update = () => {
            frame = 0;
            const rect = timeline.getBoundingClientRect();
            const value = Math.max(
                0,
                Math.min(
                    1,
                    (window.innerHeight * 0.72 - rect.top - topInset) /
                        Math.max(1, rect.height - topInset - bottomInset),
                ),
            );

            progress.style.transform = `scaleY(${value})`;
        };

        // 同一帧内的滚动和尺寸变化只测量一次布局，卸载时取消未执行的更新。
        const scheduleUpdate = () => {
            if (frame !== 0) {
                return;
            }

            frame = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);

        const resizeObserver =
            typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);

        resizeObserver?.observe(timeline);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            resizeObserver?.disconnect();
        };
    }, []);

    return {
        rootRef,
        timelineRef,
        progressRef,
        trackRef,
        activeProject,
        selectProject,
        toggleProject,
        handleProjectKey,
        wishlistIndex,
        wishlistCaption: wishItems[wishlistIndex].title.join(''),
        syncSlide,
        goPrevWish,
        goNextWish,
        reducedMotion,
        contactEmail,
        emailCopied,
        copyEmail,
    };
}
