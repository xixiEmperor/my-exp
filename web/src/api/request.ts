import { ResponseCode } from '@/constants/request';
import { useUserStore } from '@/stores/user';

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

// 生产构建配置接口子域名，本地未配置时保留相对接口路径。
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export const request = async <T>(options: Options): Promise<T> => {
    // 旧请求的 401 不能清除请求发出后新建立的登录身份。
    const initialUserState = useUserStore.getState();

    // 查询参数统一在这里拼接，null 和 undefined 的字段直接跳过
    const search = new URLSearchParams();

    Object.entries(options.params ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            search.append(key, String(value));
        }
    });

    const query = search.toString();
    const isForm = options.body instanceof FormData;

    // 分别处理表单和 JSON，避免嵌套条件影响请求体判断。
    let body: BodyInit | undefined;

    if (isForm) {
        body = options.body as FormData;
    } else if (options.body) {
        body = JSON.stringify(options.body);
    }

    // 发起请求，有 JSON 请求体时才补上 Content-Type
    const r = await fetch(`${BASE_URL}${options.path}${query ? `?${query}` : ''}`, {
        method: options.method ?? 'GET',
        headers:
            options.body && !isForm
                ? { 'Content-Type': 'application/json', ...options.headers }
                : options.headers,
        body,
        credentials: options.credentials,
        signal: options.signal,
    });

    // 拿到响应体，网关返回非 JSON 内容时按空处理，统一走下面的错误分支
    const res: ResponseBody<T> | undefined = await r.json().catch(() => undefined);

    if (r.status === 401 && useUserStore.getState() === initialUserState) {
        // Cookie 过期或无效时立即清理页面身份及相关文章缓存。
        useUserStore.getState().logout();
    }

    // HTTP 异常或业务码异常，都把后端提示抛给上层
    if (!r.ok || !res || res.code !== ResponseCode.SUCCESS) {
        throw new Error(res?.msg || `请求失败（${r.status}）`);
    }

    // 成功时直接返回业务数据，调用方不用每次自己解一层 data
    return res.data as T;
};
