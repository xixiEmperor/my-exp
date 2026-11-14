import { request } from './request';
import type { UserInfo } from '@/types/user';

export const userLogin = (loginId: string, code: string) => {
    // 登录资料直接从响应读取，身份 Cookie 由接口子域名保存。
    return request<UserInfo>({
        path: '/auth/verify',
        method: 'POST',
        body: {
            loginId,
            code,
        },
        credentials: 'include',
    });
};

export const userLogout = () => {
    return request<void>({
        path: '/auth/logout',
        method: 'POST',

        // 退出接口靠 Set-Cookie 清掉登录 Cookie，跨端口请求必须带上凭证。
        credentials: 'include',
    });
};

// 刷新页面后通过服务端验证 Cookie 并恢复真实用户资料。
export const getCurrentUser = () => {
    return request<UserInfo>({ path: '/auth/me', credentials: 'include' });
};
