/* eslint-disable no-useless-catch -- 按项目要求使用 try...catch，并将资源错误交给外层统一处理。 */
import { request } from './request';
import type { FolderResp, GetFolderChildrenResp, RenameFolderReq } from '@/types/folders';

export const getFolderChildren = async (id: string, signal?: AbortSignal) => {
    return await request<GetFolderChildrenResp>({
        path: '/folder/children',
        params: { id },
        credentials: 'include',
        signal,
    });
};

export const createFolder = async (parentId: string, signal?: AbortSignal) => {
    return await request<FolderResp>({
        method: 'POST',
        path: '/folder/create',
        body: { parent_id: parentId },
        credentials: 'include',
        signal,
    });
};

export const renameFolder = async (body: RenameFolderReq, signal?: AbortSignal) => {
    return await request<FolderResp>({
        method: 'POST',
        path: '/folder/rename',
        body,
        credentials: 'include',
        signal,
    });
};
