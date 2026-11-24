import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { type UserInfo } from '@/types/user';

interface UserState {
    isLogin: boolean;
    authReady: boolean;
    userInfo?: UserInfo;

    setLogin: (value: boolean) => void;
    setAuthReady: (value: boolean) => void;
    setUserInfo: (info: UserInfo) => void;
    logout: () => void;
}

export const useUserStore = create<UserState>()(
    devtools(
        immer((set) => ({
            isLogin: false,
            authReady: false,

            setLogin: (value) => {
                set((state) => {
                    state.isLogin = value;
                });
            },

            setAuthReady: (value) => {
                set((state) => {
                    state.authReady = value;
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
