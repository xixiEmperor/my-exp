import { request } from './request';

export const userLogin = (loginId: string, code: string) => {
    return request({
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
    return request({
        path: '/auth/logout',
        method: 'POST',

        // 退出接口靠 Set-Cookie 清掉登录 Cookie，跨端口请求必须带上凭证。
        credentials: 'include',
    });
};
