import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { DemoResource } from '@/types/demos';

interface DemosStoreState {
    /** 当前查询到的 demo 列表 */
    resources: DemoResource[];

    setResources: (resources: DemoResource[]) => void;
    appendResource: (resource: DemoResource) => void;
    updateResource: (resource: DemoResource) => void;
    removeResource: (id: string) => void;
    reset: () => void;
}

export const useDemosStore = create<DemosStoreState>()(
    devtools(
        immer((set) => ({
            resources: [],

            setResources: (resources) => {
                set((state) => {
                    state.resources = resources;
                });
            },

            appendResource: (resource) => {
                set((state) => {
                    const exists = state.resources.some((item) => item.id === resource.id);

                    if (!exists) {
                        state.resources.unshift(resource);
                    }
                });
            },

            updateResource: (resource) => {
                set((state) => {
                    const index = state.resources.findIndex((item) => item.id === resource.id);

                    if (index !== -1) {
                        state.resources[index] = resource;
                    }
                });
            },

            removeResource: (id) => {
                set((state) => {
                    state.resources = state.resources.filter((item) => item.id !== id);
                });
            },

            reset: () => {
                set((state) => {
                    state.resources = [];
                });
            },
        })),
        { name: 'demos-store' },
    ),
);
