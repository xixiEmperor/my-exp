import { request } from './request';

export const getFolderChildren = <T>(id: string) => {
    const path = `/folder/children?id=${id}`;

    return request<T>({
        path,
        method: 'GET',
    });
};
