import { request } from './request';
import type { GetFolderChildrenResp } from '@/types/articles';

export const getFolderChildren = (id: string, signal?: AbortSignal) => {
    // 查询参数交给请求层统一拼接，这里只关心业务字段
    return request<GetFolderChildrenResp>({
        path: '/folder/children',
        method: 'GET',
        params: { id },
        signal,
    });
};
