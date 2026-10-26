import { request } from './request';
import type {
    Article,
    FolderNode,
    GetArticleDetailResp,
    GetFolderChildrenResp,
    NodeType,
} from '@/types/articles';

export const getFolderChildren = (id: string, signal?: AbortSignal) => {
    // 查询参数交给请求层统一拼接，这里只关心业务字段
    return request<GetFolderChildrenResp>({
        path: '/folder/children',
        params: { id },
        // 目录也走登录态，管理员和游客看到的节点可能不一样
        credentials: 'include',
        signal,
    });
};

export const getArticleDetail = (id: string, signal?: AbortSignal) => {
    return request<GetArticleDetailResp>({
        path: '/articles/content',
        params: { id },
        // 后端按登录态返回不同字段，不带 Cookie 只能拿到游客预览，正文会缺失
        credentials: 'include',
        signal,
    });
};

export const createArticleOrFolder = (id: string, type: NodeType, signal?: AbortSignal) => {
    return request<Article | FolderNode>({
        method: 'POST',
        path: '/articles/create',
        body: {
            folder_id: id,
            type,
        },
        // 后端按登录态返回不同字段，不带 Cookie 只能拿到游客预览，正文会缺失
        credentials: 'include',
        signal,
    });
};
