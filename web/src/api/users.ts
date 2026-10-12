import { request } from './request';

export const login = (code: string) => {
  return request({
    path: '/auth/verify',
    method: 'POST',
    body: {
      code,
    },
  });
};
