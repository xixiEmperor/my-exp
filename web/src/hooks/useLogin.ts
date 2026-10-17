import { userLogin, userLogout } from '@/api/users';
import { readCookie } from '@/utils/cookieActions';
import { useUserStore } from '@/stores/user';
import { handleError } from '@/utils/errorHandler';
import { type UserInfo } from '@/types/user';
import { useUIStore } from '@/stores/ui';
import { toast } from '@/utils/toast';

// 登录态检查只在启动时跑一次，不依赖渲染期的任何值，
// 所以放在模块作用域里用 getState() 取操作入口，函数引用天然稳定
const checkLogin = async () => {
    try {
        // 能读到 cookie 说明已登录，顺便把用户信息补进 store
        const userInfo = await readCookie<UserInfo>('userinfo');

        useUserStore.getState().setUserInfo(userInfo);
        useUserStore.getState().setLogin(true);
    } catch {
        // cookie 不存在属于正常情况，异常必须在这里兜住：
        // 否则会变成未处理的 promise 拒绝，未登录分支也走不到
        useUserStore.getState().setLogin(false);
    }
};

export const useLogin = () => {
    const login = async (loginId: string, code: string) => {
        try {
            // 如果验证码非6位，不处理
            if (code?.length !== 6) return;

            // 1. 调登录接口
            await userLogin(loginId!, code);

            // 2. 将cookie中的状态提取出来，存到状态管理库中
            const userInfo = await readCookie<UserInfo>('userinfo');

            // 设置用户信息
            useUserStore.getState().setUserInfo(userInfo);
            useUserStore.getState().setLogin(true);

            // 关闭登录框
            useUIStore.getState().closeLogin();
            toast.success('登录成功');
        } catch (error) {
            handleError(error);
        }
    };

    const logout = async () => {
        // 1. 先清理状态管理库中的状态
        useUserStore.getState().logout();

        // 2. 调用后端接口清理cookie
        try {
            await userLogout();
            toast.success('已退出登录');
        } catch (error) {
            // 接口失败时本地状态已经清掉了，提示用户刷新后可能仍在登录态
            handleError(error);
        }
    };

    return {
        login,
        checkLogin,
        logout,
    };
};
