import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import { useStore } from 'zustand';
import { carouselItems, projectPhases } from '../constants/home';
import { homeStore } from '../stores/home';
import { useReducedMotion } from './useReducedMotion';

// 首页业务入口：组件只接收状态、引用和操作，不直接操作 store。
export function useHomePage() {
  const rootRef = useRef<HTMLElement>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef<HTMLElement>(null);

  const activeProject = useStore(homeStore, (state) => state.activeProject);

  const carouselIndex = useStore(homeStore, (state) => state.carouselIndex);

  const reducedMotion = useReducedMotion();

  const selectProject = useCallback((index: number) => {
    homeStore.getState().setActiveProject(index);
  }, []);

  const hoverProject = useCallback(
    (event: PointerEvent<HTMLButtonElement>, index: number) => {
      if (event.pointerType === 'mouse') {
        selectProject(index);
      }
    },
    [selectProject],
  );

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
      // 键盘切换同时移动焦点，手机端横向时间轴也能滚到选中节点。
      const next = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-phase="${nextIndex}"]`);
      next?.focus({ preventScroll: true });
      next?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'instant',
      });
    },
    [selectProject],
  );

  const syncSlide = useCallback((swiper: SwiperInstance) => {
    // 只同步用于文字提示的索引，导航与手势仍由 Swiper 自己处理。
    homeStore.getState().setCarouselIndex(swiper.realIndex);
  }, []);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const elements = root.querySelectorAll<HTMLElement>('[data-reveal]');

    if (reducedMotion || !('IntersectionObserver' in window)) {
      delete root.dataset.motion;

      elements.forEach((element) => {
        element.dataset.visible = 'true';
      });

      return;
    }

    root.dataset.motion = 'true';
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = 'true';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -28px 0px' },
    );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      delete root.dataset.motion;
    };
  }, [reducedMotion]);

  useEffect(() => {
    const timeline = timelineRef.current;
    const progress = progressRef.current;

    if (!timeline || !progress) {
      return;
    }

    let frame = 0;
    // 与时间轴装饰线的顶部和底部留白一致，进度按实际可见线段计算。
    const topInset = 29;
    const bottomInset = 47;

    // 滚动进度只影响一条装饰线，使用引用更新 transform，避免整页重渲染。
    const update = () => {
      frame = 0;
      const rect = timeline.getBoundingClientRect();
      const value = Math.max(
        0,
        Math.min(
          1,
          (window.innerHeight * 0.72 - rect.top - topInset) / Math.max(1, rect.height - topInset - bottomInset),
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
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate);
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
    activeProject,
    project: projectPhases[activeProject],
    selectProject,
    hoverProject,
    handleProjectKey,
    carouselIndex,
    carouselDescription: carouselItems[carouselIndex].description,
    syncSlide,
    reducedMotion,
  };
}
