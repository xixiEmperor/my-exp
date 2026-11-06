import { create } from 'zustand';

interface HomeInteractionState {
    weatherIndex: number;
    setWeatherIndex: (index: number) => void;
    headerHeight: number;
    setHeaderHeight: (height: number) => void;
    activeSection: string;
    reaction: { key: string; priority: number; sequence: number };
    spinning: boolean;
    announcement: string;
    lastAnnouncement: number;
    actions: Record<string, (() => void | Promise<void>) | undefined>;
    setActiveSection: (section: string) => void;
    react: (key: string, priority?: number) => void;
    setSpinning: (spinning: boolean) => void;
    announce: (message: string) => void;
    registerAction: (name: string, action: () => void | Promise<void>) => () => void;
}

// 跨组件只共享交互意图，命令面板不再查找按钮并模拟点击。
export const useHomeInteraction = create<HomeInteractionState>((set, get) => ({
    weatherIndex: -1,
    setWeatherIndex: (weatherIndex) => set({ weatherIndex }),
    headerHeight: 94,
    setHeaderHeight: (headerHeight) => set({ headerHeight }),
    activeSection: 'home',
    reaction: { key: 'main', priority: 0, sequence: 0 },
    spinning: false,
    announcement: '',
    lastAnnouncement: 0,
    actions: {},
    setActiveSection: (activeSection) => set({ activeSection }),
    react: (key, priority = 2) =>
        set((state) => ({ reaction: { key, priority, sequence: state.reaction.sequence + 1 } })),
    setSpinning: (spinning) => {
        if (get().spinning !== spinning) set({ spinning });
    },
    announce: (announcement) => {
        const now = Date.now();

        if (now - get().lastAnnouncement < 4000) return;

        set({ announcement, lastAnnouncement: now });
    },
    registerAction: (name, action) => {
        set((state) => ({ actions: { ...state.actions, [name]: action } }));

        return () => {
            if (get().actions[name] !== action) return;

            set((state) => ({ actions: { ...state.actions, [name]: undefined } }));
        };
    },
}));
