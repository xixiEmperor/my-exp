import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { type UserInfo } from '@/types/user';

interface UserState {
    isLogin: boolean;
    userInfo?: UserInfo;

    setLogin: (value: boolean) => void;
    setUserInfo: (info: UserInfo) => void;
    logout: () => void;
}

export const useUserStore = create<UserState>()(
    devtools(
        immer((set) => ({
            isLogin: false,

            setLogin: (value) => {
                set((state) => {
                    state.isLogin = value;
                });
            },

            setUserInfo: (info) => {
                set((state) => {
                    state.userInfo = info;
                });
            },

            logout: () => {
                set((state) => {
                    state.isLogin = false;
                    state.userInfo = undefined;
                });
            },
        })),
    ),
);
