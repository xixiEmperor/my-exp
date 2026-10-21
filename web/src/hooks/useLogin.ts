import { useCallback } from 'react';
import { userLogin, userLogout } from '@/api/users';
import { readCookie } from '@/utils/cookieActions';
import { useUserStore } from '@/stores/user';
import { type UserInfo } from '@/types/user';
import { useUIStore } from '@/stores/ui';
import { toast } from '@/utils/toast';
import { useRequest } from './useRequest';

// 登录态检查只在启动时跑一次，不依赖渲染期的任何值，
// 所以放在模块作用域里用 getState() 取操作入口，函数引用天然稳定
const checkLogin = async () => {
    // 方法引用稳定，直接解构，不参与订阅
    const { setUserInfo, setLogin } = useUserStore.getState();

    try {
        // 能读到 cookie 说明已登录，顺便把用户信息补进 store
        const userInfo = await readCookie<UserInfo>('userinfo');

        setUserInfo(userInfo);
        setLogin(true);
    } catch {
        // cookie 不存在属于正常情况，异常必须在这里兜住：
        // 否则会变成未处理的 promise 拒绝，未登录分支也走不到
        setLogin(false);
    }
};

export const useLogin = () => {
    // 方法引用稳定，直接从 getState 解构，不参与订阅
    const { setUserInfo, setLogin, logout: clearUserState } = useUserStore.getState();
    const { closeLogin } = useUIStore.getState();

    const loginService = useCallback(
        async (loginId: string, code: string) => {
            // 1. 调登录接口
            await userLogin(loginId, code);

            // 2. 将cookie中的状态提取出来，存到状态管理库中
            const userInfo = await readCookie<UserInfo>('userinfo');

            // 设置用户信息
            setUserInfo(userInfo);
            setLogin(true);

            // 关闭登录框
            closeLogin();
            toast.success('登录成功');
        },
        [closeLogin, setLogin, setUserInfo],
    );

    const logoutService = useCallback(async () => {
        // 1. 先清理状态管理库中的状态，接口失败也不影响前端退出
        clearUserState();

        // 2. 调用后端接口清理cookie
        await userLogout();
        toast.success('已退出登录');
    }, [clearUserState]);

    // 两个请求都交给 useRequest 管理，loading 和错误提示不用再手写
    const loginRequest = useRequest(loginService);
    const logoutRequest = useRequest(logoutService);
    const { run: runLogin } = loginRequest;
    const { run: runLogout } = logoutRequest;

    const login = useCallback(
        async (loginId: string, code: string) => {
            // 如果验证码非6位，不处理
            if (code?.length !== 6) {
                return;
            }

            await runLogin(loginId, code);
        },
        [runLogin],
    );

    const logout = useCallback(async () => {
        await runLogout();
    }, [runLogout]);

    return {
        login,
        checkLogin,
        logout,

        // 两个请求任意一个在跑，都可以视为登录相关操作进行中
        loading: loginRequest.loading || logoutRequest.loading,
    };
};
