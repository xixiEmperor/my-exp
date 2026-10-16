interface Options {
    // 请求的相对路径
    path: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
    headers?: Record<string, string>;
    body?: object;
    credentials?: 'include' | 'omit' | 'same-origin';
    signal?: AbortSignal;
}

interface ResponseBody {
    code: number;
    msg: string;
    data?: any;
}

const testBaseUrl = 'http://localhost:8080/api/v1';

export const request = async (options: Options) => {
    // 发起请求
    const r = await fetch(`${testBaseUrl}${options.path}`, {
        method: options.method ?? 'GET',
        headers: options.headers,
        body: JSON.stringify(options.body),
        credentials: options.credentials,
        signal: options.signal,
    });

    // 拿到响应体
    const res: ResponseBody = await r.json();

    // 如果状态码处于200-299，直接返回响应体
    if (r.ok) {
        return res;
    }

    // 否则做 http 异常状态码映射
    switch (r.status) {
        case 400:
            throw new Error('请求发生错误');
        case 401:
            throw new Error('缺少身份信息，请先登录');
        case 403:
            throw new Error('请求被拒绝');
        default:
    }
};
