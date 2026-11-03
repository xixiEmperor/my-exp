import { request } from './request';
import type {
    Article,
    GetArticleDetailResp,
    GetArticlesByFolderIDResp,
    UpdateArticleReq,
} from '@/types/articles';

/** 获取文章详情 */
export const getArticleDetail = (id: string, signal?: AbortSignal) => {
    return request<GetArticleDetailResp>({
        path: '/articles/content',
        params: { id },
        credentials: 'include',
        signal,
    });
};

/** 文章列表与子文件夹列表独立查询 */
export const getArticlesByFolderID = async (folderId: string, signal?: AbortSignal) => {
    return await request<GetArticlesByFolderIDResp>({
        path: '/articles/list',
        params: { folder_id: folderId },
        credentials: 'include',
        signal,
    });
};

/** 新建文章 */
export const createArticle = async (folderId: string, signal?: AbortSignal) => {
    return await request<Article>({
        method: 'POST',
        path: '/articles/create',
        body: { folder_id: folderId },
        credentials: 'include',
        signal,
    });
};

/** 修改文章内容 */
export const updateArticle = async (body: UpdateArticleReq, signal?: AbortSignal) => {
    return await request<Article>({
        method: 'POST',
        path: '/articles/update',
        body,
        credentials: 'include',
        signal,
    });
};
