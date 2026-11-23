import type {
    CreateDemoResourceReq,
    DemoResource,
    GetDemoVariantsReq,
    GetDemoImplementationReq,
    GetDemoNamesResp,
    GetDemoResourcesReq,
    GetDemoVariantsResp,
    GetDemoVersionResp,
    GetDemoSourcePathsResp,
    UpdateDemoResourceReq,
} from '@/types/demos';
import { request } from './request';

// 查询 demos 表记录列表；未传筛选参数时返回全部记录。
export const getDemoResources = (params?: GetDemoResourcesReq, signal?: AbortSignal) => {
    return request<DemoResource[]>({
        path: '/demos/resources',
        params: params ? { ...params } : undefined,
        credentials: 'include',
        signal,
    });
};

// 根据资源主键 ID 查询单条 demo 记录。
export const getDemoResourceByID = (id: string, signal?: AbortSignal) => {
    return request<DemoResource>({
        path: `/demos/resources/${id}`,
        credentials: 'include',
        signal,
    });
};

// 上传 demo 静态产物与源码到 R2，并自动生成主键写入 demos 表。
export const createDemoResource = (body: CreateDemoResourceReq, signal?: AbortSignal) => {
    return request<DemoResource>({
        method: 'POST',
        path: '/demos/resources',
        body,
        credentials: 'include',
        signal,
    });
};

// 编辑 demo 展示信息（名称、说明、标签、状态）。
export const updateDemoResource = (
    id: string,
    body: UpdateDemoResourceReq,
    signal?: AbortSignal,
) => {
    return request<DemoResource>({
        method: 'PUT',
        path: `/demos/resources/${id}`,
        body,
        credentials: 'include',
        signal,
    });
};

// 删除指定 demo 记录并清理对应 R2 版本目录。
export const deleteDemoResource = (id: string, signal?: AbortSignal) => {
    return request<null>({
        method: 'DELETE',
        path: `/demos/resources/${id}`,
        credentials: 'include',
        signal,
    });
};

// 获取本地 demo 目录列表。
export const getDemoNames = (signal?: AbortSignal) => {
    return request<GetDemoNamesResp>({
        path: '/demos/names',
        credentials: 'include',
        signal,
    });
};

// 获取指定 demo 的实现目录。
export const getDemoVariants = (params: GetDemoVariantsReq, signal?: AbortSignal) => {
    return request<GetDemoVariantsResp>({
        path: '/demos/varys',
        params: { ...params },
        credentials: 'include',
        signal,
    });
};

// 读取指定实现的版本号。
export const getDemoVersion = (params: GetDemoImplementationReq, signal?: AbortSignal) => {
    return request<GetDemoVersionResp>({
        path: '/demos/version',
        params: { ...params },
        credentials: 'include',
        signal,
    });
};

// 读取相对于所选实现目录的源码路径。
export const getDemoSourcePaths = (params: GetDemoImplementationReq, signal?: AbortSignal) => {
    return request<GetDemoSourcePathsResp>({
        path: '/demos/source-paths',
        params: { ...params },
        credentials: 'include',
        signal,
    });
};
