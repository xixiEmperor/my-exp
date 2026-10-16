import { request } from './request';

export const login = (loginId: string, code: string) => {
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
