import { ResponseCode } from '@/constants/request';

interface Options {
    // 请求的相对路径
    path: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
    // 查询参数，交给这里统一拼接到路径后面
    params?: Record<string, string | number | boolean | null | undefined>;
    headers?: Record<string, string>;
    body?: object;
    credentials?: 'include' | 'omit' | 'same-origin';
    signal?: AbortSignal;
}

interface ResponseBody<T> {
    code: number;
    msg: string;
    data?: T;
}

const testBaseUrl = 'http://localhost:8080/api/v1';

export const request = async <T>(options: Options): Promise<T> => {
    // 查询参数统一在这里拼接，null 和 undefined 的字段直接跳过
    const search = new URLSearchParams();

    Object.entries(options.params ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            search.append(key, String(value));
        }
    });

    const query = search.toString();

    // 发起请求，有 JSON 请求体时才补上 Content-Type
    const r = await fetch(`${testBaseUrl}${options.path}${query ? `?${query}` : ''}`, {
        method: options.method ?? 'GET',
        headers: options.body
            ? { 'Content-Type': 'application/json', ...options.headers }
            : options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        credentials: options.credentials,
        signal: options.signal,
    });

    // 拿到响应体，网关返回非 JSON 内容时按空处理，统一走下面的错误分支
    const res: ResponseBody<T> | undefined = await r.json().catch(() => undefined);

    // HTTP 异常或业务码异常，都把后端提示抛给上层
    if (!r.ok || !res || res.code !== ResponseCode.SUCCESS) {
        throw new Error(res?.msg || `请求失败（${r.status}）`);
    }

    // 成功时直接返回业务数据，调用方不用每次自己解一层 data
    return res.data as T;
};
