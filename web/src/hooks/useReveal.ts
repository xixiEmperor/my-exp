import { useEffect, type RefObject } from 'react';

// 进场比例门槛。进场要露出足够多，退场要滑出足够远，中间这段死区避免边界抖动。
const enterRatio = 0.12;

// 视口上下各留一条边带，元素滑进边带就算离场。
// 这条边带是退场动画能被看见的关键：不设它的话，观察器要等元素完全移出视口才判定离场，
// 那时元素已经不在画面里，退场动画等于白播。
const edgeBand = '8%';

// 首页区块的进出场动画。
// 观察器一直保留、不 unobserve，所以往回滚动时区块会重新播放进场。
// once 打开后退场关闭，适合很长的区块。
export function useReveal(
    rootRef: RefObject<HTMLElement | null>,
    reducedMotion: boolean,
    once = false,
) {
    useEffect(() => {
        const root = rootRef.current;

        if (!root) {
            return;
        }

        const elements = root.querySelectorAll<HTMLElement>('[data-reveal]');

        // 系统开启减少动效时不隐藏任何内容，也不播放退场。
        if (reducedMotion || !('IntersectionObserver' in window)) {
            delete document.documentElement.dataset.homeMotion;

            elements.forEach((element) => {
                element.dataset.visible = 'true';
            });

            return;
        }

        document.documentElement.dataset.homeMotion = 'true';

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const target = entry.target as HTMLElement;

                    if (!entry.isIntersecting) {
                        delete target.dataset.visible;

                        return;
                    }

                    // 比可视区还高的区块永远达不到进场比例，直接判定为可见。
                    const tallEnough = entry.boundingClientRect.height > window.innerHeight * 0.84;

                    if (entry.intersectionRatio >= enterRatio || tallEnough) {
                        target.dataset.visible = 'true';

                        if (once) {
                            observer.unobserve(target);
                        }
                    }
                });
            },
            { threshold: [0, enterRatio], rootMargin: `-${edgeBand} 0px -${edgeBand} 0px` },
        );

        elements.forEach((element) => {
            observer.observe(element);
        });

        return () => {
            observer.disconnect();
            delete document.documentElement.dataset.homeMotion;
        };
    }, [rootRef, reducedMotion, once]);
}
