/* eslint-disable no-useless-catch -- 按项目要求使用 try...catch，并将资源错误交给外层统一处理。 */
import { request } from './request';
import type { Article, GetArticleDetailResp, GetArticlesByFolderIDResp } from '@/types/articles';

export const getArticleDetail = (id: string, signal?: AbortSignal) => {
    return request<GetArticleDetailResp>({
        path: '/articles/content',
        params: { id },
        credentials: 'include',
        signal,
    });
};

// 文章列表与子文件夹列表独立查询。
export const getArticlesByFolderID = async (folderId: string, signal?: AbortSignal) => {
    return await request<GetArticlesByFolderIDResp>({
        path: '/articles/list',
        params: { folder_id: folderId },
        credentials: 'include',
        signal,
    });
};

export const createArticle = async (folderId: string, signal?: AbortSignal) => {
    return await request<Article>({
        method: 'POST',
        path: '/articles/create',
        body: { folder_id: folderId },
        credentials: 'include',
        signal,
    });
};
