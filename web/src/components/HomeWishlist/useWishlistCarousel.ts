import { useEffect, useRef, type KeyboardEvent, type TouchEvent } from 'react';
import { useStore } from 'zustand';
import { homeStore } from '../../stores/home';
import { wishItems } from '../../constants/home';
import { useHomeInteraction } from '../../stores/homeInteraction';

// 愿望切换共用一个入口，按钮、键盘和触摸手势保持一致。
export function useWishlistCarousel() {
    const index = useStore(homeStore, (state) => state.wishlistIndex);
    const touch = useRef<[number, number] | null>(null);

    useEffect(() => {
        useHomeInteraction
            .getState()
            .announce(`${index + 1} / ${wishItems.length}，${wishItems[index].title.join('')}`);
    }, [index]);

    // 延续原来的首页 store，切换路由后回来仍停在刚才读到的愿望。
    const move = (offset: number) => {
        const state = homeStore.getState();

        state.setWishlistIndex(
            (state.wishlistIndex + offset + wishItems.length) % wishItems.length,
        );
    };
    const previous = () => move(-1);
    const next = () => move(1);
    const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
    };
    const touchStart = (event: TouchEvent<HTMLDivElement>) => {
        touch.current = [event.changedTouches[0].clientX, event.changedTouches[0].clientY];
    };
    const touchEnd = (event: TouchEvent<HTMLDivElement>) => {
        if (!touch.current) return;

        const dx = event.changedTouches[0].clientX - touch.current[0];
        const dy = event.changedTouches[0].clientY - touch.current[1];
        touch.current = null;

        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) move(dx < 0 ? 1 : -1);
    };

    return { index, previous, next, keyboard, touchStart, touchEnd };
}
