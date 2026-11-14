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

/** 删除文件夹，后端会级联删除其中的全部子文件夹和文章 */
export const deleteFolder = async (id: string, signal?: AbortSignal) => {
    return await request<null>({
        method: 'DELETE',
        path: `/folder/${id}`,
        credentials: 'include',
        signal,
    });
};
