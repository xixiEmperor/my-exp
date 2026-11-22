import type {
    DemoResource,
    GetDemoVariantsReq,
    GetDemoImplementationReq,
    GetDemoNamesResp,
    GetDemoVariantsResp,
    GetDemoVersionResp,
    GetDemoSourcePathsResp,
} from '@/types/demos';
import { request } from './request';

// 列表接口尚未实现，接入时替换此函数，不能把本地目录当作入库记录。
export function getDemoResources(): Promise<DemoResource[]> {
    return Promise.reject(new Error('资源列表接口尚未接入，暂时无法读取已入库的 demo。'));
}

// 每个接口独立封装，直接转发 request 返回的 Promise。
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
